import { Inscription, UTXO } from "./types";
import { MinSats, BNZero } from "./constants";
import SDKError, { ERROR_CODE } from "../constants/error";
import BigNumber from "bignumber.js";
import {
    estimateTxFee,
    estimateNumInOutputs
} from "./utils";

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
    sendAmount: BigNumber,
    feeRatePerByte: number,
    isUseInscriptionPayFee: boolean,
): { selectedUTXOs: UTXO[], isUseInscriptionPayFee: boolean, valueOutInscription: BigNumber, changeAmount: BigNumber, fee: BigNumber } => {
    const resultUTXOs: UTXO[] = [];
    let normalUTXOs: UTXO[] = [];
    let inscriptionUTXO: any = null;
    let inscriptionInfo: any = null;
    let valueOutInscription = BNZero;
    let changeAmount = BNZero;
    let maxAmountInsTransfer = BNZero;

    // convert feeRate to interger
    feeRatePerByte = Math.round(feeRatePerByte);

    // estimate fee
    const { numIns, numOuts } = estimateNumInOutputs(sendInscriptionID, sendAmount, isUseInscriptionPayFee);
    const estFee = new BigNumber(estimateTxFee(numIns, numOuts, feeRatePerByte));

    // when BTC amount need to send is greater than 0, 
    // we should use normal BTC to pay fee
    if (isUseInscriptionPayFee && sendAmount.gt(BNZero)) {
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
                    // maxAmountInsTransfer = (inscriptionUTXO.value - inscriptionInfo.offset - 1) - MinSats;
                    maxAmountInsTransfer = maxAmountInsTransfer.
                        plus(inscriptionUTXO.value).
                        minus(inscriptionInfo.offset).
                        minus(1).minus(MinSats);

                    console.log("maxAmountInsTransfer: ", maxAmountInsTransfer.toNumber());
                }
            }
        }
    });

    if (sendInscriptionID !== "") {
        if (inscriptionUTXO === null || inscriptionInfo == null) {
            throw new SDKError(ERROR_CODE.NOT_FOUND_INSCRIPTION);
        }
        // if value is not enough to pay fee, MUST use normal UTXOs to pay fee
        if (isUseInscriptionPayFee && maxAmountInsTransfer.lt(estFee)) {
            isUseInscriptionPayFee = false;
        }

        // push inscription UTXO to create tx
        resultUTXOs.push(inscriptionUTXO);
    }

    // select normal UTXOs
    let totalSendAmount = sendAmount;
    if (!isUseInscriptionPayFee) {
        totalSendAmount = totalSendAmount.plus(estFee);
    }

    let totalInputAmount = BNZero;
    if (totalSendAmount.gt(BNZero)) {
        if (normalUTXOs.length === 0) {
            throw new SDKError(ERROR_CODE.NOT_ENOUGH_BTC_TO_SEND);
        }

        normalUTXOs = normalUTXOs.sort(
            (a: UTXO, b: UTXO): number => {
                if (a.value.gt(b.value)) {
                    return -1;
                }
                if (a.value.lt(b.value)) {
                    return 1;
                }
                return 0;
            }
        );

        if (normalUTXOs[normalUTXOs.length - 1].value.gte(totalSendAmount)) {
            // select the smallest utxo
            resultUTXOs.push(normalUTXOs[normalUTXOs.length - 1]);
            totalInputAmount = normalUTXOs[normalUTXOs.length - 1].value;
        } else if (normalUTXOs[0].value.lt(totalSendAmount)) {
            // select multiple UTXOs
            for (let i = 0; i < normalUTXOs.length; i++) {
                const utxo = normalUTXOs[i];
                resultUTXOs.push(utxo);
                totalInputAmount = totalInputAmount.plus(utxo.value);
                if (totalInputAmount.gte(totalSendAmount)) {
                    break;
                }
            }
            if (totalInputAmount.lt(totalSendAmount)) {
                throw new SDKError(ERROR_CODE.NOT_ENOUGH_BTC_TO_SEND);
            }
        } else {
            // select the nearest UTXO
            let selectedUTXO = normalUTXOs[0];
            for (let i = 1; i < normalUTXOs.length; i++) {
                if (normalUTXOs[i].value.lt(totalSendAmount)) {
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
    let feeRes = new BigNumber(estimateTxFee(resultUTXOs.length, reNumOuts, feeRatePerByte));

    // calculate output amount
    if (isUseInscriptionPayFee) {
        if (maxAmountInsTransfer.lt(feeRes)) {
            feeRes = maxAmountInsTransfer;
        }
        valueOutInscription = inscriptionUTXO.value.minus(feeRes);
        changeAmount = totalInputAmount.minus(sendAmount);
    } else {
        if (totalInputAmount.lt(sendAmount.plus(feeRes))) {
            feeRes = totalInputAmount.minus(sendAmount);
        }
        valueOutInscription = inscriptionUTXO?.value || BNZero;
        changeAmount = totalInputAmount.minus(sendAmount).minus(feeRes);
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
    sendAmount: BigNumber,
): { selectedUTXOs: UTXO[] } => {
    const resultUTXOs: UTXO[] = [];
    let normalUTXOs: UTXO[] = [];

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
            if (a.value.gt(b.value)) {
                return -1;
            }
            if (a.value.lt(b.value)) {
                return 1;
            }
            return 0;
        }
    );

    let totalInputAmount = BNZero;
    const totalSendAmount = sendAmount;
    if (totalSendAmount.gt(BNZero)) {
        if (normalUTXOs.length === 0) {
            throw new SDKError(ERROR_CODE.NOT_ENOUGH_BTC_TO_SEND);
        }
        if (normalUTXOs[normalUTXOs.length - 1].value.gte(totalSendAmount)) {
            // select the smallest utxo
            resultUTXOs.push(normalUTXOs[normalUTXOs.length - 1]);
            totalInputAmount = normalUTXOs[normalUTXOs.length - 1].value;
        } else if (normalUTXOs[0].value.lt(totalSendAmount)) {
            // select multiple UTXOs
            for (let i = 0; i < normalUTXOs.length; i++) {
                const utxo = normalUTXOs[i];
                resultUTXOs.push(utxo);
                totalInputAmount = totalInputAmount.plus(utxo.value);
                if (totalInputAmount.gte(totalSendAmount)) {
                    break;
                }
            }
            if (totalInputAmount.lt(totalSendAmount)) {
                throw new SDKError(ERROR_CODE.NOT_ENOUGH_BTC_TO_SEND);
            }
        } else {
            // select the nearest UTXO
            let selectedUTXO = normalUTXOs[0];
            for (let i = 1; i < normalUTXOs.length; i++) {
                if (normalUTXOs[i].value.lt(totalSendAmount)) {
                    resultUTXOs.push(selectedUTXO);
                    totalInputAmount = selectedUTXO.value;
                    break;
                }

                selectedUTXO = normalUTXOs[i];
            }
        }
    }

    return { selectedUTXOs: resultUTXOs };
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
            if (a.value.gt(b.value)) {
                return -1;
            }
            if (a.value.lt(b.value)) {
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
};