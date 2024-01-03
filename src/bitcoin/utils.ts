import { BNZero } from "./constants";
import BigNumber from "bignumber.js";
import { Psbt } from "bitcoinjs-lib";

/**
* estimateTxFee estimates the transaction fee
* @param numIns number of inputs in the transaction
* @param numOuts number of outputs in the transaction
* @param feeRatePerByte fee rate per byte (in satoshi)
* @returns returns the estimated transaction fee in satoshi
*/
const estimateTxFee = (numIns: number, numOuts: number, feeRatePerByte: number): number => {
    const fee = (68 * numIns + 43 * numOuts) * feeRatePerByte;
    return fee;
};

/**
* estimateNumInOutputs estimates number of inputs and outputs by parameters: 
* @param inscriptionID id of inscription to send (if any)
* @param sendAmount satoshi amount need to send 
* @param isUseInscriptionPayFee use inscription output coin to pay fee or not
* @returns returns the estimated number of inputs and outputs in the transaction
*/
const estimateNumInOutputs = (inscriptionID: string, sendAmount: BigNumber, isUseInscriptionPayFee: boolean): { numIns: number, numOuts: number } => {
    let numOuts = 0;
    let numIns = 0;
    if (inscriptionID !== "") {
        numOuts++;
        numIns++;
    }
    if (sendAmount.gt(BNZero)) {
        numOuts++;
    }

    if (sendAmount.gt(BNZero) || !isUseInscriptionPayFee) {
        numIns++;
        numOuts++; // for change BTC output
    }
    return { numIns, numOuts };
};

/**
* estimateNumInOutputs estimates number of inputs and outputs by parameters: 
* @param inscriptionID id of inscription to send (if any)
* @param sendAmount satoshi amount need to send 
* @param isUseInscriptionPayFee use inscription output coin to pay fee or not
* @returns returns the estimated number of inputs and outputs in the transaction
*/
const estimateNumInOutputsForBuyInscription = (
    estNumInputsFromBuyer: number,
    estNumOutputsFromBuyer: number,
    sellerSignedPsbt: Psbt,
): { numIns: number, numOuts: number } => {
    const numIns = sellerSignedPsbt.txInputs.length + estNumInputsFromBuyer;
    const numOuts = sellerSignedPsbt.txOutputs.length + estNumOutputsFromBuyer;
    return { numIns, numOuts };
};

const fromSat = (sat: number): number => {
    return sat / 1e8;
};

const base64ToHex = (base64: string) =>{
    const raw = atob(base64);
    let result = "";
    for (let i = 0; i < raw.length; i++) {
        const hex = raw.charCodeAt(i).toString(16);
        result += (hex.length === 2 ? hex : "0" + hex);
    }
    return result.toUpperCase();
};

const hexToBase64 = (hexString: string) =>{
// Convert hexadecimal string to bytes
    const bytes = [];
    for (let i = 0; i < hexString.length; i += 2) {
        bytes.push(parseInt(hexString.substr(i, 2), 16));
    }

    // Convert bytes to Base64
    const byteArray = new Uint8Array(bytes);
    const base64Result = btoa(String.fromCharCode.apply(null, byteArray as any));
    return base64Result;
};

export {
    estimateTxFee,
    estimateNumInOutputs,
    estimateNumInOutputsForBuyInscription,
    fromSat,
    base64ToHex,
    hexToBase64
};