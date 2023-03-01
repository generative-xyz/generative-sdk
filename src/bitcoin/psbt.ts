import {
    Psbt,
    Transaction
} from "bitcoinjs-lib";

import { ICreateTxResp, Inscription, UTXO } from "./types";
import { network, DummyUTXOValue } from "./constants";
import {
    toXOnly,
    estimateTxFee,
    generateTaprootKeyPair,
} from "./utils";
import { verifySchnorr } from "@bitcoinerlab/secp256k1";
import { selectCardinalUTXOs, selectOrdinalUTXO } from "./selectcoin";

/**
* createPSBTForSale creates the partially signed bitcoin transaction to sale the inscription. 
* NOTE: Currently, the function only supports sending from Taproot address. 
* @param sellerPrivateKey buffer private key of the seller
* @param sellerAddress payment address of the seller to recieve BTC from buyer
* @param ordinalInput ordinal input coin to sell
* @param price price of the inscription that the seller wants to sell (in satoshi)
* @returns the encoded base64 partially signed transaction
*/

const createPSBTToSale = (
    params: {
        ordinalInput: UTXO,
        price: number,
        sellerAddress: string,
        sellerPrivateKey: Buffer,
        dummyUTXO: UTXO,
        creatorAddress: string,
        feeForCreator: number,
    },
): string => {
    const psbt = new Psbt({ network });
    const { ordinalInput, price, sellerAddress, sellerPrivateKey, dummyUTXO, creatorAddress, feeForCreator } = params;

    const { keyPair, tweakedSigner, p2pktr } = generateTaprootKeyPair(sellerPrivateKey);

    // add ordinal input into the first input coins with 
    // sighashType: Transaction.SIGHASH_SINGLE | Transaction.SIGHASH_ANYONECANPAY

    psbt.addInput({
        hash: ordinalInput.tx_hash,
        index: ordinalInput.tx_output_n,
        witnessUtxo: { value: ordinalInput.value, script: p2pktr.output as Buffer },
        tapInternalKey: toXOnly(keyPair.publicKey),
        sighashType: Transaction.SIGHASH_SINGLE | Transaction.SIGHASH_ANYONECANPAY,
    });

    psbt.addOutput({
        address: sellerAddress,
        value: price,
    });


    // the second input and output
    // add dummy UTXO and output for paying to creator

    if (feeForCreator > 0 && creatorAddress !== "") {
        psbt.addInput({
            hash: dummyUTXO.tx_hash,
            index: dummyUTXO.tx_output_n,
            witnessUtxo: { value: dummyUTXO.value, script: p2pktr.output as Buffer },
            tapInternalKey: toXOnly(keyPair.publicKey),
            sighashType: Transaction.SIGHASH_SINGLE | Transaction.SIGHASH_ANYONECANPAY,
        });

        // TODO: thinking
        // + dummyUTXO.value,

        psbt.addOutput({
            address: creatorAddress,
            value: feeForCreator
        });
    }

    // sign tx
    psbt.txInputs.forEach((utxo, index) => {
        psbt.signInput(index, tweakedSigner, [Transaction.SIGHASH_SINGLE | Transaction.SIGHASH_ANYONECANPAY]);
        const isValid = psbt.validateSignaturesOfInput(index, verifySchnorr, tweakedSigner.publicKey);
        if (!isValid) {
            throw new Error("Tx signature is invalid");
        }
    });

    return psbt.toBase64();
};

/**
* createPSBTToBuy creates the partially signed bitcoin transaction to buy the inscription. 
* NOTE: Currently, the function only supports sending from Taproot address. 
* @param sellerSignedPsbt PSBT from seller
* @param buyerPrivateKey buffer private key of the buyer
* @param buyerAddress payment address of the buy to receive inscription
* @param valueInscription value in inscription
* @param price price of the inscription that the seller wants to sell (in satoshi)
* @param paymentUtxos cardinal input coins to payment
* @param dummyUtxo cardinal dummy input coin
* @returns the encoded base64 partially signed transaction
*/
// TODO: add fee for creator
const createPSBTToBuy = (
    params: {
        sellerSignedPsbt: Psbt,
        buyerPrivateKey: Buffer,
        buyerAddress: string,
        valueInscription: number,
        price: number,
        paymentUtxos: UTXO[],
        dummyUtxo: UTXO,
        feeRate: number,
    }
): ICreateTxResp => {
    const psbt = new Psbt({ network });
    const {
        sellerSignedPsbt,
        buyerPrivateKey,
        buyerAddress,
        valueInscription,
        price,
        paymentUtxos,
        dummyUtxo,
        feeRate
    } = params;
    let totalValue = 0;
    let totalPaymentValue = 0;

    const { keyPair, tweakedSigner, p2pktr } = generateTaprootKeyPair(buyerPrivateKey);

    // Add dummy utxo to the first input coin
    psbt.addInput({
        hash: dummyUtxo.tx_hash,
        index: dummyUtxo.tx_output_n,
        witnessUtxo: { value: dummyUtxo.value, script: p2pktr.output as Buffer },
        tapInternalKey: toXOnly(keyPair.publicKey),
    });

    // Add inscription output
    // the frist output coin has value equal to the sum of dummy value and value inscription
    // this makes sure the first output coin is inscription outcoin 
    psbt.addOutput({
        address: buyerAddress,
        value: dummyUtxo.value + valueInscription,
    });

    if (sellerSignedPsbt.txInputs.length !== sellerSignedPsbt.txOutputs.length) {
        throw new Error("Length of inputs and output in seller signed psbt must not be different.");
    }

    for (let i = 0; i < sellerSignedPsbt.txInputs.length; i++) {
        // Add seller signed input
        psbt.addInput({
            ...sellerSignedPsbt.txInputs[i],
            ...sellerSignedPsbt.data.inputs[i]
        });
        // Add seller output
        psbt.addOutput({
            ...sellerSignedPsbt.txOutputs[i],
        });
    }

    // Add payment utxo inputs
    for (const utxo of paymentUtxos) {
        psbt.addInput({
            hash: utxo.tx_hash,
            index: utxo.tx_output_n,
            witnessUtxo: { value: utxo.value, script: p2pktr.output as Buffer },
            tapInternalKey: toXOnly(keyPair.publicKey),
        });

        totalValue += utxo.value;
        totalPaymentValue += utxo.value;
    }

    // Create a new dummy utxo output for the next purchase
    psbt.addOutput({
        address: buyerAddress,
        value: DummyUTXOValue,
    });

    const fee = estimateTxFee(psbt.txInputs.length, psbt.txOutputs.length, feeRate);

    const changeValue = totalValue - dummyUtxo.value - price - fee;
    if (changeValue < 0) {
        throw Error("Your balance is insufficient.");
    }

    // Change utxo
    if (changeValue > 0) {
        psbt.addOutput({
            address: buyerAddress,
            value: changeValue,
        });
    }

    // sign tx
    psbt.txInputs.forEach((utxo, index) => {
        if (index === 0 || index > sellerSignedPsbt.txInputs.length) {
            psbt.signInput(index, tweakedSigner);
        }
    });


    // finalize input coins
    // psbt.txInputs.forEach((utxo, index) => {
    //     try {
    //         psbt.finalizeInput(index);
    //     } catch (e) {
    //         console.log("Finalize input index - err ", index, e);
    //     }
    //     // }
    // });
    psbt.finalizeAllInputs();

    // get tx hex
    const tx = psbt.extractTransaction();
    console.log("Transaction : ", tx);
    const txHex = tx.toHex();
    return { txID: tx.getId(), txHex, fee, selectedUTXOs: [...paymentUtxos, dummyUtxo] };
};

/**
* reqListForSaleInscription creates the PSBT of the seller to list for sale inscription. 
* NOTE: Currently, the function only supports sending from Taproot address. 
* @param sellerPrivateKey buffer private key of the seller
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the seller
* @param sellInscriptionID id of inscription to sell
* @param receiverBTCAddress the seller's address to receive BTC
* @returns the base64 encode Psbt
*/
const reqListForSaleInscription = (
    sellerPrivateKey: Buffer,
    utxos: UTXO[],
    inscriptions: { [key: string]: Inscription[] },
    sellInscriptionID = "",
    receiverBTCAddress: string,
    price: number,
    creatorAddress = "",
    feeForCreator = 0,
): string => {

    const ordinalInput = selectOrdinalUTXO(utxos, inscriptions, sellInscriptionID);

    // select cardinal dummy UTXO
    let dummyUTXO: any;
    if (feeForCreator > 0) {
        const res = selectCardinalUTXOs(utxos, inscriptions, 0, true);
        dummyUTXO = res.dummyUTXO;
    }

    const base64Psbt = createPSBTToSale({
        ordinalInput: ordinalInput,
        price: price,
        sellerAddress: receiverBTCAddress,
        sellerPrivateKey: sellerPrivateKey,
        dummyUTXO: dummyUTXO,
        creatorAddress: creatorAddress,
        feeForCreator: feeForCreator,
    });

    return base64Psbt;
};

/**
* reqBuyInscription creates the PSBT of the seller to list for sale inscription. 
* NOTE: Currently, the function only supports sending from Taproot address. 
* @param sellerSignedPsbtB64 buffer private key of the buyer
* @param buyerPrivateKey buffer private key of the buyer
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the seller
* @param sellInscriptionID id of inscription to sell
* @param receiverBTCAddress the seller's address to receive BTC
* @returns the base64 encode Psbt
*/
const reqBuyInscription = (
    sellerSignedPsbtB64: string,
    buyerPrivateKey: Buffer,
    buyerAddress: string,
    valueInscription: number,
    price: number,
    utxos: UTXO[],
    inscriptions: { [key: string]: Inscription[] },
    feeRatePerByte: number,
): ICreateTxResp => {
    // decode seller's signed PSBT
    const sellerSignedPsbt = Psbt.fromBase64(sellerSignedPsbtB64, { network });

    // select cardinal UTXOs to payment
    const { selectedUTXOs, dummyUTXO } = selectCardinalUTXOs(utxos, inscriptions, price, true);

    // create PBTS from the seller's one
    const res = createPSBTToBuy({
        sellerSignedPsbt: sellerSignedPsbt,
        buyerPrivateKey: buyerPrivateKey,
        buyerAddress: buyerAddress,
        valueInscription: valueInscription,
        price: price,
        paymentUtxos: selectedUTXOs,
        dummyUtxo: dummyUTXO,
        feeRate: feeRatePerByte,
    });

    return {
        txID: res?.txID,
        txHex: res?.txHex,
        fee: res?.fee,
        selectedUTXOs: [...selectedUTXOs, dummyUTXO]
    };
};

export {
    createPSBTToSale,
    createPSBTToBuy,
    reqListForSaleInscription,
    reqBuyInscription,
};