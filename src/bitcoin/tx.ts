import {
    networks,
    payments,
    Psbt
} from "bitcoinjs-lib";
import axios, { AxiosResponse } from "axios";
import { ICreateTxResp, Inscription, UTXO, ICreateTxSplitInscriptionResp } from "./types";
import { BlockStreamURL, DummyUTXOValue, MinSats, network } from "./constants";
import {
    toXOnly,
    tweakSigner,
    ECPair,
    estimateTxFee,
    estimateNumInOutputs,
    generateTaprootKeyPair,
    fromSat
} from "./utils";
import { selectTheSmallestUTXO, selectUTXOs } from "./selectcoin";

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
    sendAmount: number,
    feeRatePerByte: number,
    isUseInscriptionPayFeeParam = true, // default is true
): ICreateTxResp => {
    // validation
    if (sendAmount > 0 && sendAmount < MinSats) {
        throw new Error("sendAmount must not be less than " + fromSat(MinSats) + " BTC.");
    }
    // select UTXOs
    const { selectedUTXOs, valueOutInscription, changeAmount, fee } = selectUTXOs(utxos, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);
    let feeRes = fee;
    console.log("selectedUTXOs: ", selectedUTXOs);


    // init key pair and tweakedSigner from senderPrivateKey
    const { keyPair, senderAddress, tweakedSigner, p2pktr } = generateTaprootKeyPair(senderPrivateKey);

    const psbt = new Psbt({ network });
    // add inputs
    selectedUTXOs.forEach((input) => {
        psbt.addInput({
            hash: input.tx_hash,
            index: input.tx_output_n,
            witnessUtxo: { value: input.value, script: p2pktr.output as Buffer },
            tapInternalKey: toXOnly(keyPair.publicKey)
        });
    });

    // add outputs
    if (sendInscriptionID !== "") {
        // add output inscription
        psbt.addOutput({
            address: receiverInsAddress,
            value: valueOutInscription,
        });
    }
    // add output send BTC
    if (sendAmount > 0) {
        psbt.addOutput({
            address: receiverInsAddress,
            value: sendAmount,
        });
    }

    // add change output
    if (changeAmount > 0) {
        if (changeAmount >= MinSats) {
            psbt.addOutput({
                address: senderAddress,
                value: changeAmount,
            });
        } else {
            feeRes += changeAmount;
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
    sendAmount: number,
    valueOutInscription: number,
    changeAmount: number,
    fee: number,
): { txID: string, txHex: string, fee: number } => {
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
        throw new Error("Can not get sender address from private key");
    }

    const psbt = new Psbt({ network });
    // add inputs
    selectedUTXOs.forEach((input) => {
        psbt.addInput({
            hash: input.tx_hash,
            index: input.tx_output_n,
            witnessUtxo: { value: input.value, script: p2pktr.output as Buffer },
            tapInternalKey: toXOnly(keypair.publicKey)
        });
    });

    // add outputs
    if (sendInscriptionID !== "") {
        // add output inscription
        psbt.addOutput({
            address: receiverInsAddress,
            value: valueOutInscription,
        });
    }
    // add output send BTC
    if (sendAmount > 0) {
        psbt.addOutput({
            address: receiverInsAddress,
            value: sendAmount,
        });
    }

    // add change output
    if (changeAmount > 0) {
        psbt.addOutput({
            address: senderAddress,
            value: changeAmount,
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
    sendAmount: number,
    feeRatePerByte: number,
): ICreateTxSplitInscriptionResp => {
    // validation
    if (sendAmount > 0 && sendAmount < MinSats) {
        throw new Error("sendAmount must not be less than " + fromSat(MinSats) + " BTC.");
    }

    const { keyPair, senderAddress, tweakedSigner, p2pktr } = generateTaprootKeyPair(senderPrivateKey);

    const maxAmountInsSpend = (inscriptionUTXO.value - inscriptionInfo.offset - 1) - MinSats;

    const fee = estimateTxFee(1, 2, feeRatePerByte);

    const totalAmountSpend = sendAmount + fee;
    if (totalAmountSpend > maxAmountInsSpend) {
        throw new Error("Your balance is insufficient. Please top up BTC to your wallet to pay network fee.");
    }

    const newValueInscription = inscriptionUTXO.value - totalAmountSpend;

    const psbt = new Psbt({ network });
    // add inputs
    psbt.addInput({
        hash: inscriptionUTXO.tx_hash,
        index: inscriptionUTXO.tx_output_n,
        witnessUtxo: { value: inscriptionUTXO.value, script: p2pktr.output as Buffer },
        tapInternalKey: toXOnly(keyPair.publicKey)
    });

    // add outputs
    // add output inscription: must be at index 0
    psbt.addOutput({
        address: senderAddress,
        value: newValueInscription,
    });

    // add output send BTC
    psbt.addOutput({
        address: senderAddress,
        value: sendAmount,
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
): Promise<{ dummyUTXO: UTXO, splitTxID: string, selectedUTXOs: UTXO[], newUTXO: any, fee: number }> => {

    // create dummy UTXO from cardinal UTXOs
    let dummyUTXO;
    let newUTXO = null;
    const smallestUTXO = selectTheSmallestUTXO(utxos, inscriptions);
    if (smallestUTXO.value <= DummyUTXOValue) {
        dummyUTXO = smallestUTXO;
        return { dummyUTXO: dummyUTXO, splitTxID: "", selectedUTXOs: [], newUTXO: newUTXO, fee: 0 };
    } else {
        const { keyPair, senderAddress, tweakedSigner, p2pktr } = generateTaprootKeyPair(senderPrivateKey);

        const { txID, txHex, fee, selectedUTXOs, changeAmount } = createTx(senderPrivateKey, utxos, inscriptions, "", senderAddress, DummyUTXOValue, feeRatePerByte, false);

        // TODO: uncomment here
        // try {
        //     await broadcastTx(txHex);
        // } catch (e) {
        //     throw new Error("Broadcast the split tx error " + e?.toString());
        // }

        // init dummy UTXO rely on the result of the split tx
        dummyUTXO = {
            tx_hash: txID,
            tx_output_n: 0,
            value: DummyUTXOValue,
        };

        if (changeAmount > 0) {
            newUTXO = {
                tx_hash: txID,
                tx_output_n: 1,
                value: changeAmount,
            };
        }

        return { dummyUTXO: dummyUTXO, splitTxID: txID, selectedUTXOs, newUTXO: newUTXO, fee };
    }
};


const broadcastTx = async (txHex: string): Promise<string> => {
    const blockstream = new axios.Axios({
        baseURL: BlockStreamURL
    });
    const response: AxiosResponse = await blockstream.post("/tx", txHex);
    const { status, data } = response;
    if (status !== 200) {
        throw Error("Broadcast tx error " + data);
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