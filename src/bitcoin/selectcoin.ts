import { Inscription, UTXO } from "./types";
import { MinSats, DummyUTXOValue } from "./constants";
import SDKError, { ERROR_CODE } from "../constants/error";
import {
    estimateTxFee,
    estimateNumInOutputs,
    estimateNumInOutputsForBuyInscription
} from "./utils";
import {
    Psbt,
} from "bitcoinjs-lib";

/**
* selectUTXOs selects the most reasonable UTXOs to create the transaction. 
* if sending inscription, the first selected UTXO is always the UTXO contain inscription.
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the sender
* @param sendInscriptionID id of inscription to send
* @param sendAmount satoshi amount need to send 
* @param feeRatePerByte fee rate per byte (in satoshi)
* @param isUseInscriptionPayFee flag defines using inscription coin to pay fee 
* @returns the list of selected UTXOs
* @returns the actual flag using inscription coin to pay fee
* @returns the value of inscription outputs, and the change amount (if any)
* @returns the network fee
*/
const selectUTXOs = (
    utxos: UTXO[],
    inscriptions: { [key: string]: Inscription[] },
    sendInscriptionID: string,
    sendAmount: number,
    feeRatePerByte: number,
    isUseInscriptionPayFee: boolean,
): { selectedUTXOs: UTXO[], isUseInscriptionPayFee: boolean, valueOutInscription: number, changeAmount: number, fee: number } => {
    const resultUTXOs: UTXO[] = [];
    let normalUTXOs: UTXO[] = [];
    let inscriptionUTXO: any = null;
    let inscriptionInfo: any = null;
    let valueOutInscription = 0;
    let changeAmount = 0;
    let maxAmountInsTransfer = 0;

    // convert feeRate to interger
    feeRatePerByte = Math.round(feeRatePerByte);

    // estimate fee
    const { numIns, numOuts } = estimateNumInOutputs(sendInscriptionID, sendAmount, isUseInscriptionPayFee);
    const estFee: number = estimateTxFee(numIns, numOuts, feeRatePerByte);

    // when BTC amount need to send is greater than 0, 
    // we should use normal BTC to pay fee
    if (isUseInscriptionPayFee && sendAmount > 0) {
        isUseInscriptionPayFee = false;
    }

    // filter normal UTXO and inscription UTXO to send
    utxos.forEach(utxo => {
        // txIDKey = tx_hash:tx_output_n
        let txIDKey = utxo.tx_hash.concat(":");
        txIDKey = txIDKey.concat(utxo.tx_output_n.toString());

        // try to get inscriptionInfos
        const inscriptionInfos = inscriptions[txIDKey];

        if (inscriptionInfos === undefined || inscriptionInfos === null || inscriptionInfos.length == 0) {
            // normal UTXO
            normalUTXOs.push(utxo);
        } else {
            // inscription UTXO
            if (sendInscriptionID !== "") {
                const inscription = inscriptionInfos.find(ins => ins.id === sendInscriptionID);
                if (inscription !== undefined) {
                    // don't support send tx with outcoin that includes more than one inscription
                    if (inscriptionInfos.length > 1) {
                        throw new SDKError(ERROR_CODE.NOT_SUPPORT_SEND);
                    }
                    inscriptionUTXO = utxo;
                    inscriptionInfo = inscription;
                    maxAmountInsTransfer = (inscriptionUTXO.value - inscriptionInfo.offset - 1) - MinSats;
                    console.log("maxAmountInsTransfer: ", maxAmountInsTransfer);
                }
            }
        }
    });

    if (sendInscriptionID !== "") {
        if (inscriptionUTXO === null || inscriptionInfo == null) {
            throw new SDKError(ERROR_CODE.NOT_FOUND_INSCRIPTION);
        }
        // if value is not enough to pay fee, MUST use normal UTXOs to pay fee
        if (isUseInscriptionPayFee && maxAmountInsTransfer < estFee) {
            isUseInscriptionPayFee = false;
        }

        // push inscription UTXO to create tx
        resultUTXOs.push(inscriptionUTXO);
    }

    // select normal UTXOs
    let totalSendAmount = sendAmount;
    if (!isUseInscriptionPayFee) {
        totalSendAmount += estFee;
    }

    let totalInputAmount = 0;
    if (totalSendAmount > 0) {
        if (normalUTXOs.length === 0) {
            throw new SDKError(ERROR_CODE.NOT_ENOUGH_BTC_TO_SEND);
        }

        normalUTXOs = normalUTXOs.sort(
            (a: UTXO, b: UTXO): number => {
                if (a.value > b.value) {
                    return -1;
                }
                if (a.value < b.value) {
                    return 1;
                }
                return 0;
            }
        );

        if (normalUTXOs[normalUTXOs.length - 1].value >= totalSendAmount) {
            // select the smallest utxo
            resultUTXOs.push(normalUTXOs[normalUTXOs.length - 1]);
            totalInputAmount = normalUTXOs[normalUTXOs.length - 1].value;
        } else if (normalUTXOs[0].value < totalSendAmount) {
            // select multiple UTXOs
            for (let i = 0; i < normalUTXOs.length; i++) {
                const utxo = normalUTXOs[i];
                resultUTXOs.push(utxo);
                totalInputAmount += utxo.value;
                if (totalInputAmount >= totalSendAmount) {
                    break;
                }
            }
            if (totalInputAmount < totalSendAmount) {
                throw new SDKError(ERROR_CODE.NOT_ENOUGH_BTC_TO_SEND);
            }
        } else {
            // select the nearest UTXO
            let selectedUTXO = normalUTXOs[0];
            for (let i = 1; i < normalUTXOs.length; i++) {
                if (normalUTXOs[i].value < totalSendAmount) {
                    resultUTXOs.push(selectedUTXO);
                    totalInputAmount = selectedUTXO.value;
                    break;
                }

                selectedUTXO = normalUTXOs[i];
            }
        }
    }

    // re-estimate fee with exact number of inputs and outputs
    const { numOuts: reNumOuts } = estimateNumInOutputs(sendInscriptionID, sendAmount, isUseInscriptionPayFee);
    let feeRes: number = estimateTxFee(resultUTXOs.length, reNumOuts, feeRatePerByte);

    // calculate output amount
    if (isUseInscriptionPayFee) {
        if (maxAmountInsTransfer < feeRes) {
            feeRes = maxAmountInsTransfer;
        }
        valueOutInscription = inscriptionUTXO.value - feeRes;
        changeAmount = totalInputAmount - sendAmount;
    } else {
        if (totalInputAmount < sendAmount + feeRes) {
            feeRes = totalInputAmount - sendAmount;
        }
        valueOutInscription = inscriptionUTXO?.value || 0;
        changeAmount = totalInputAmount - sendAmount - feeRes;
    }

    return { selectedUTXOs: resultUTXOs, isUseInscriptionPayFee: isUseInscriptionPayFee, valueOutInscription: valueOutInscription, changeAmount: changeAmount, fee: feeRes };
};

/**
* selectUTXOs selects the most reasonable UTXOs to create the transaction. 
* if sending inscription, the first selected UTXO is always the UTXO contain inscription.
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the sender
* @param sendInscriptionID id of inscription to send
* @returns the ordinal UTXO
* @returns the actual flag using inscription coin to pay fee
* @returns the value of inscription outputs, and the change amount (if any)
* @returns the network fee
*/
const selectInscriptionUTXO = (
    utxos: UTXO[],
    inscriptions: { [key: string]: Inscription[] },
    inscriptionID: string,
): { inscriptionUTXO: UTXO, inscriptionInfo: Inscription } => {
    if (inscriptionID === "") {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "InscriptionID must not be an empty string");
    }

    // filter normal UTXO and inscription UTXO to send
    for (const utxo of utxos) {
        // txIDKey = tx_hash:tx_output_n
        let txIDKey = utxo.tx_hash.concat(":");
        txIDKey = txIDKey.concat(utxo.tx_output_n.toString());

        // try to get inscriptionInfos
        const inscriptionInfos = inscriptions[txIDKey];
        if (inscriptionInfos !== undefined && inscriptionInfos !== null && inscriptionInfos.length > 0) {
            const inscription = inscriptionInfos.find(ins => ins.id === inscriptionID);
            if (inscription !== undefined) {
                // don't support send tx with outcoin that includes more than one inscription
                if (inscriptionInfos.length > 1) {
                    throw new SDKError(ERROR_CODE.NOT_SUPPORT_SEND);
                }
                return { inscriptionUTXO: utxo, inscriptionInfo: inscription };
            }
        }
    }
    throw new SDKError(ERROR_CODE.NOT_FOUND_INSCRIPTION);
};

/**
* selectCardinalUTXOs selects the most reasonable UTXOs to create the transaction. 
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the sender
* @param sendAmount satoshi amount need to send 
* @returns the list of selected UTXOs
* @returns the actual flag using inscription coin to pay fee
* @returns the value of inscription outputs, and the change amount (if any)
* @returns the network fee
*/
const selectCardinalUTXOs = (
    utxos: UTXO[],
    inscriptions: { [key: string]: Inscription[] },
    sendAmount: number,
): { selectedUTXOs: UTXO[], remainUTXOs: UTXO[], totalInputAmount: number } => {
    const resultUTXOs: UTXO[] = [];
    let normalUTXOs: UTXO[] = [];
    let remainUTXOs: UTXO[] = [];


    // filter normal UTXO and inscription UTXO to send
    utxos.forEach(utxo => {
        // txIDKey = tx_hash:tx_output_n
        let txIDKey = utxo.tx_hash.concat(":");
        txIDKey = txIDKey.concat(utxo.tx_output_n.toString());

        // try to get inscriptionInfos
        const inscriptionInfos = inscriptions[txIDKey];

        if (inscriptionInfos === undefined || inscriptionInfos === null || inscriptionInfos.length == 0) {
            // normal UTXO
            normalUTXOs.push(utxo);
        }
    });

    normalUTXOs = normalUTXOs.sort(
        (a: UTXO, b: UTXO): number => {
            if (a.value > b.value) {
                return -1;
            }
            if (a.value < b.value) {
                return 1;
            }
            return 0;
        }
    );

    const cloneUTXOs = [...normalUTXOs];

    let totalInputAmount = 0;
    const totalSendAmount = sendAmount;
    if (totalSendAmount > 0) {
        if (normalUTXOs.length === 0) {
            throw new SDKError(ERROR_CODE.NOT_ENOUGH_BTC_TO_SEND);
        }
        if (normalUTXOs[normalUTXOs.length - 1].value >= totalSendAmount) {
            // select the smallest utxo
            resultUTXOs.push(normalUTXOs[normalUTXOs.length - 1]);
            totalInputAmount = normalUTXOs[normalUTXOs.length - 1].value;

            remainUTXOs = cloneUTXOs.splice(0, normalUTXOs.length - 1);
        } else if (normalUTXOs[0].value < totalSendAmount) {
            // select multiple UTXOs
            for (let i = 0; i < normalUTXOs.length; i++) {
                const utxo = normalUTXOs[i];
                resultUTXOs.push(utxo);
                totalInputAmount += utxo.value;
                if (totalInputAmount >= totalSendAmount) {
                    remainUTXOs = cloneUTXOs.splice(i + 1, normalUTXOs.length - i - 1);
                    break;
                }
            }
            if (totalInputAmount < totalSendAmount) {
                throw new SDKError(ERROR_CODE.NOT_ENOUGH_BTC_TO_SEND);
            }
        } else {
            // select the nearest UTXO
            let selectedUTXO = normalUTXOs[0];
            let selectedIndex = 0;
            for (let i = 1; i < normalUTXOs.length; i++) {
                if (normalUTXOs[i].value < totalSendAmount) {
                    resultUTXOs.push(selectedUTXO);
                    totalInputAmount = selectedUTXO.value;
                    remainUTXOs = [...cloneUTXOs];
                    remainUTXOs.splice(selectedIndex, 1);
                    break;
                }

                selectedUTXO = normalUTXOs[i];
                selectedIndex = i;
            }
        }
    }

    return { selectedUTXOs: resultUTXOs, remainUTXOs, totalInputAmount };
};

const selectUTXOsToCreateBuyTx = (
    params: {
        sellerSignedPsbt: Psbt,
        price: number,
        utxos: UTXO[],
        inscriptions: { [key: string]: Inscription[] },
        feeRate: number,
    }
): { selectedUTXOs: UTXO[] } => {

    const {
        sellerSignedPsbt,
        price,
        utxos,
        inscriptions,
        feeRate
    } = params;

    // estimate network fee
    const { numIns, numOuts } = estimateNumInOutputsForBuyInscription(3, 3, sellerSignedPsbt);
    const estTotalPaymentAmount = price + estimateTxFee(numIns, numOuts, feeRate);

    const { selectedUTXOs, remainUTXOs, totalInputAmount } = selectCardinalUTXOs(utxos, inscriptions, estTotalPaymentAmount);
    let paymentUTXOs = selectedUTXOs;

    // re-estimate network fee
    const { numIns: finalNumIns, numOuts: finalNumOuts } = estimateNumInOutputsForBuyInscription(paymentUTXOs.length, 3, sellerSignedPsbt);
    const finalTotalPaymentAmount = price + estimateTxFee(finalNumIns, finalNumOuts, feeRate);

    if (finalTotalPaymentAmount > totalInputAmount) {
        // need to select extra UTXOs
        const { selectedUTXOs: extraUTXOs } = selectCardinalUTXOs(remainUTXOs, {}, finalTotalPaymentAmount - totalInputAmount);
        paymentUTXOs = paymentUTXOs.concat(extraUTXOs);
    }

    return { selectedUTXOs: paymentUTXOs };
};


/**
* selectTheSmallestUTXO selects the most reasonable UTXOs to create the transaction. 
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the sender
* @param sendAmount satoshi amount need to send 
* @param isSelectDummyUTXO need to select dummy UTXO or not
* @returns the list of selected UTXOs
* @returns the actual flag using inscription coin to pay fee
* @returns the value of inscription outputs, and the change amount (if any)
* @returns the network fee
*/
const selectTheSmallestUTXO = (
    utxos: UTXO[],
    inscriptions: { [key: string]: Inscription[] },
): UTXO => {
    let normalUTXOs: UTXO[] = [];

    // filter normal UTXO and inscription UTXO 
    utxos.forEach(utxo => {
        // txIDKey = tx_hash:tx_output_n
        let txIDKey = utxo.tx_hash.concat(":");
        txIDKey = txIDKey.concat(utxo.tx_output_n.toString());

        // try to get inscriptionInfos
        const inscriptionInfos = inscriptions[txIDKey];

        if (inscriptionInfos === undefined || inscriptionInfos === null || inscriptionInfos.length == 0) {
            // normal UTXO
            normalUTXOs.push(utxo);
        }
    });

    if (normalUTXOs.length === 0) {
        throw new SDKError(ERROR_CODE.NOT_ENOUGH_BTC_TO_SEND);
    }

    normalUTXOs = normalUTXOs.sort(
        (a: UTXO, b: UTXO): number => {
            if (a.value > b.value) {
                return -1;
            }
            if (a.value < b.value) {
                return 1;
            }
            return 0;
        }
    );

    return normalUTXOs[normalUTXOs.length - 1];
};

export {
    selectUTXOs,
    selectInscriptionUTXO,
    selectCardinalUTXOs,
    selectTheSmallestUTXO,
    selectUTXOsToCreateBuyTx,
};