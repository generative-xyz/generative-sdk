import {
    networks,
    payments,
    Psbt
} from "bitcoinjs-lib";
import axios, { AxiosResponse } from "axios";
import { ICreateTxResp, Inscription, UTXO, ICreateTxSplitInscriptionResp } from "./types";
import { BlockStreamURL, BNZero, DummyUTXOValue, MinSats, network } from "./constants";
import {
    toXOnly,
    tweakSigner,
    ECPair,
    estimateTxFee,
    generateTaprootKeyPair,
    fromSat
} from "./utils";
import { selectTheSmallestUTXO, selectUTXOs } from "./selectcoin";
import SDKError, { ERROR_CODE } from "../constants/error";
import BigNumber from "bignumber.js";

/**
* createTx creates the Bitcoin transaction (including sending inscriptions). 
* NOTE: Currently, the function only supports sending from Taproot address. 
* @param senderPrivateKey buffer private key of the sender
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the sender
* @param sendInscriptionID id of inscription to send
* @param receiverInsAddress the address of the inscription receiver
* @param sendAmount satoshi amount need to send 
* @param feeRatePerByte fee rate per byte (in satoshi)
* @param isUseInscriptionPayFee flag defines using inscription coin to pay fee 
* @returns the transaction id
* @returns the hex signed transaction
* @returns the network fee
*/
const createTx = (
    senderPrivateKey: Buffer,
    utxos: UTXO[],
    inscriptions: { [key: string]: Inscription[] },
    sendInscriptionID = "",
    receiverInsAddress: string,
    sendAmount: BigNumber,
    feeRatePerByte: number,
    isUseInscriptionPayFeeParam = true, // default is true
): ICreateTxResp => {
    // validation
    if (sendAmount.gt(BNZero) && sendAmount.lt(MinSats)) {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "sendAmount must not be less than " + fromSat(MinSats) + " BTC.");
    }
    // select UTXOs
    const { selectedUTXOs, valueOutInscription, changeAmount, fee } = selectUTXOs(utxos, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);
    let feeRes = fee;

    // init key pair and tweakedSigner from senderPrivateKey
    const { keyPair, senderAddress, tweakedSigner, p2pktr } = generateTaprootKeyPair(senderPrivateKey);

    const psbt = new Psbt({ network });
    // add inputs
    selectedUTXOs.forEach((input) => {
        psbt.addInput({
            hash: input.tx_hash,
            index: input.tx_output_n,
            witnessUtxo: { value: input.value.toNumber(), script: p2pktr.output as Buffer },
            tapInternalKey: toXOnly(keyPair.publicKey)
        });
    });

    // add outputs
    if (sendInscriptionID !== "") {
        // add output inscription
        psbt.addOutput({
            address: receiverInsAddress,
            value: valueOutInscription.toNumber(),
        });
    }
    // add output send BTC
    if (sendAmount.gt(BNZero)) {
        psbt.addOutput({
            address: receiverInsAddress,
            value: sendAmount.toNumber(),
        });
    }

    // add change output
    if (changeAmount.gt(BNZero)) {
        if (changeAmount.gte(MinSats)) {
            psbt.addOutput({
                address: senderAddress,
                value: changeAmount.toNumber(),
            });
        } else {
            feeRes = feeRes.plus(changeAmount);
        }
    }

    // sign tx
    selectedUTXOs.forEach((utxo, index) => {
        psbt.signInput(index, tweakedSigner);
    });
    psbt.finalizeAllInputs();

    // get tx hex
    const tx = psbt.extractTransaction();
    console.log("Transaction : ", tx);
    const txHex = tx.toHex();
    return { txID: tx.getId(), txHex, fee: feeRes, selectedUTXOs, changeAmount, tx };
};

/**
* createTxWithSpecificUTXOs creates the Bitcoin transaction with specific UTXOs (including sending inscriptions). 
* NOTE: Currently, the function only supports sending from Taproot address. 
* This function is used for testing.
* @param senderPrivateKey buffer private key of the sender
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param sendInscriptionID id of inscription to send
* @param receiverInsAddress the address of the inscription receiver
* @param sendAmount amount need to send (in sat)
* @param valueOutInscription inscription output's value (in sat)
* @param changeAmount cardinal change amount (in sat)
* @param fee transaction fee (in sat) 
* @returns the transaction id
* @returns the hex signed transaction
* @returns the network fee
*/
const createTxWithSpecificUTXOs = (
    senderPrivateKey: Buffer,
    utxos: UTXO[],
    sendInscriptionID = "",
    receiverInsAddress: string,
    sendAmount: BigNumber,
    valueOutInscription: BigNumber,
    changeAmount: BigNumber,
    fee: BigNumber,
): { txID: string, txHex: string, fee: BigNumber } => {
    const network = networks.bitcoin;  // mainnet

    const selectedUTXOs = utxos;

    // init key pair from senderPrivateKey
    const keypair = ECPair.fromPrivateKey(senderPrivateKey);
    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network });

    // Generate an address from the tweaked public key
    const p2pktr = payments.p2tr({
        pubkey: toXOnly(tweakedSigner.publicKey),
        network
    });
    const senderAddress = p2pktr.address ? p2pktr.address : "";
    if (senderAddress === "") {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "Can not get the sender address from the private key");
    }

    const psbt = new Psbt({ network });
    // add inputs
    selectedUTXOs.forEach((input) => {
        psbt.addInput({
            hash: input.tx_hash,
            index: input.tx_output_n,
            witnessUtxo: { value: input.value.toNumber(), script: p2pktr.output as Buffer },
            tapInternalKey: toXOnly(keypair.publicKey)
        });
    });

    // add outputs
    if (sendInscriptionID !== "") {
        // add output inscription
        psbt.addOutput({
            address: receiverInsAddress,
            value: valueOutInscription.toNumber(),
        });
    }
    // add output send BTC
    if (sendAmount.gt(BNZero)) {
        psbt.addOutput({
            address: receiverInsAddress,
            value: sendAmount.toNumber(),
        });
    }

    // add change output
    if (changeAmount.gt(BNZero)) {
        psbt.addOutput({
            address: senderAddress,
            value: changeAmount.toNumber(),
        });
    }

    // sign tx
    selectedUTXOs.forEach((utxo, index) => {
        psbt.signInput(index, tweakedSigner);
    });
    psbt.finalizeAllInputs();

    // get tx hex
    const tx = psbt.extractTransaction();
    console.log("Transaction : ", tx);
    const txHex = tx.toHex();
    return { txID: tx.getId(), txHex, fee };
};


/**
* createTx creates the Bitcoin transaction (including sending inscriptions). 
* NOTE: Currently, the function only supports sending from Taproot address. 
* @param senderPrivateKey buffer private key of the sender
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the sender
* @param sendInscriptionID id of inscription to send
* @param receiverInsAddress the address of the inscription receiver
* @param sendAmount satoshi amount need to send 
* @param feeRatePerByte fee rate per byte (in satoshi)
* @param isUseInscriptionPayFee flag defines using inscription coin to pay fee 
* @returns the transaction id
* @returns the hex signed transaction
* @returns the network fee
*/

const createTxSplitFundFromOrdinalUTXO = (
    senderPrivateKey: Buffer,
    inscriptionUTXO: UTXO,
    inscriptionInfo: Inscription,
    sendAmount: BigNumber,
    feeRatePerByte: number,
): ICreateTxSplitInscriptionResp => {
    // validation
    if (sendAmount.gt(BNZero) && sendAmount.lt(MinSats)) {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "sendAmount must not be less than " + fromSat(MinSats) + " BTC.");
    }

    const { keyPair, senderAddress, tweakedSigner, p2pktr } = generateTaprootKeyPair(senderPrivateKey);

    const maxAmountInsSpend = inscriptionUTXO.value.minus(inscriptionInfo.offset).minus(1).minus(MinSats);

    const fee = new BigNumber(estimateTxFee(1, 2, feeRatePerByte));

    const totalAmountSpend = sendAmount.plus(fee);
    if (totalAmountSpend.gt(maxAmountInsSpend)) {
        throw new SDKError(ERROR_CODE.NOT_ENOUGH_BTC_TO_PAY_FEE);
    }

    const newValueInscription = inscriptionUTXO.value.minus(totalAmountSpend);

    const psbt = new Psbt({ network });
    // add inputs
    psbt.addInput({
        hash: inscriptionUTXO.tx_hash,
        index: inscriptionUTXO.tx_output_n,
        witnessUtxo: { value: inscriptionUTXO.value.toNumber(), script: p2pktr.output as Buffer },
        tapInternalKey: toXOnly(keyPair.publicKey)
    });

    // add outputs
    // add output inscription: must be at index 0
    psbt.addOutput({
        address: senderAddress,
        value: newValueInscription.toNumber(),
    });

    // add output send BTC
    psbt.addOutput({
        address: senderAddress,
        value: sendAmount.toNumber(),
    });

    // sign tx
    psbt.txInputs.forEach((utxo, index) => {
        psbt.signInput(index, tweakedSigner);
    });
    psbt.finalizeAllInputs();

    // get tx hex
    const tx = psbt.extractTransaction();
    console.log("Transaction : ", tx);
    const txHex = tx.toHex();
    return { txID: tx.getId(), txHex, fee, selectedUTXOs: [inscriptionUTXO], newValueInscription: newValueInscription };
};

const createDummyUTXOFromCardinal = async (
    senderPrivateKey: Buffer,
    utxos: UTXO[],
    inscriptions: { [key: string]: Inscription[] },
    feeRatePerByte: number,
): Promise<{ dummyUTXO: UTXO, splitTxID: string, selectedUTXOs: UTXO[], newUTXO: any, fee: BigNumber, txHex: string }> => {

    // create dummy UTXO from cardinal UTXOs
    let dummyUTXO;
    let newUTXO = null;
    const smallestUTXO = selectTheSmallestUTXO(utxos, inscriptions);
    if (smallestUTXO.value.lte(DummyUTXOValue)) {
        dummyUTXO = smallestUTXO;
        return { dummyUTXO: dummyUTXO, splitTxID: "", selectedUTXOs: [], newUTXO: newUTXO, fee: BNZero, txHex: "" };
    } else {
        const { senderAddress } = generateTaprootKeyPair(senderPrivateKey);

        const { txID, txHex, fee, selectedUTXOs, changeAmount } = createTx(senderPrivateKey, utxos, inscriptions, "", senderAddress, new BigNumber(DummyUTXOValue), feeRatePerByte, false);

        // init dummy UTXO rely on the result of the split tx
        dummyUTXO = {
            tx_hash: txID,
            tx_output_n: 0,
            value: new BigNumber(DummyUTXOValue),
        };

        if (changeAmount.gt(BNZero)) {
            newUTXO = {
                tx_hash: txID,
                tx_output_n: 1,
                value: changeAmount,
            };
        }

        return { dummyUTXO: dummyUTXO, splitTxID: txID, selectedUTXOs, newUTXO: newUTXO, fee, txHex };
    }
};


const broadcastTx = async (txHex: string): Promise<string> => {
    const blockstream = new axios.Axios({
        baseURL: BlockStreamURL
    });
    const response: AxiosResponse = await blockstream.post("/tx", txHex);
    const { status, data } = response;
    if (status !== 200) {
        throw new SDKError(ERROR_CODE.ERR_BROADCAST_TX, data);
    }
    return response.data;
};

export {
    selectUTXOs,
    createTx,
    broadcastTx,
    createTxWithSpecificUTXOs,
    createTxSplitFundFromOrdinalUTXO,
    createDummyUTXOFromCardinal,
};