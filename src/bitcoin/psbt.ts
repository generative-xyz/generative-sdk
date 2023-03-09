import {
    Psbt,
    Transaction
} from "bitcoinjs-lib";
import { ICreateTxBuyResp, ICreateTxResp, ICreateTxSellResp, Inscription, UTXO } from "./types";
import { network, DummyUTXOValue, MinSats, OutputSize, BNZero } from "./constants";
import {
    toXOnly,
    estimateTxFee,
    generateTaprootKeyPair,
    estimateNumInOutputsForBuyInscription,
    fromSat,
} from "./utils";
import { verifySchnorr } from "@bitcoinerlab/secp256k1";
import { selectCardinalUTXOs, selectInscriptionUTXO } from "./selectcoin";
import { createDummyUTXOFromCardinal, createTxSplitFundFromOrdinalUTXO } from "./tx";
import SDKError, { ERROR_CODE } from "../constants/error";
import BigNumber from "bignumber.js";

/**
* createPSBTToSell creates the partially signed bitcoin transaction to sale the inscription. 
* NOTE: Currently, the function only supports sending from Taproot address. 
* @param sellerPrivateKey buffer private key of the seller
* @param sellerAddress payment address of the seller to recieve BTC from buyer
* @param ordinalInput ordinal input coin to sell
* @param price price of the inscription that the seller wants to sell (in satoshi)
* @returns the encoded base64 partially signed transaction
*/
const createPSBTToSell = (
    params: {
        sellerPrivateKey: Buffer,
        receiverBTCAddress: string,  // default is seller address
        inscriptionUTXO: UTXO,
        amountPayToSeller: BigNumber,
        feePayToCreator: BigNumber,
        creatorAddress: string,
        dummyUTXO: UTXO,
    },
): string => {
    const psbt = new Psbt({ network });
    const { inscriptionUTXO: ordinalInput, amountPayToSeller, receiverBTCAddress, sellerPrivateKey, dummyUTXO, creatorAddress, feePayToCreator } = params;

    const { keyPair, tweakedSigner, p2pktr } = generateTaprootKeyPair(sellerPrivateKey);

    // add ordinal input into the first input coins with 
    // sighashType: Transaction.SIGHASH_SINGLE | Transaction.SIGHASH_ANYONECANPAY

    psbt.addInput({
        hash: ordinalInput.tx_hash,
        index: ordinalInput.tx_output_n,
        witnessUtxo: { value: ordinalInput.value.toNumber(), script: p2pktr.output as Buffer },
        tapInternalKey: toXOnly(keyPair.publicKey),
        sighashType: Transaction.SIGHASH_SINGLE | Transaction.SIGHASH_ANYONECANPAY,
    });

    if (dummyUTXO !== undefined && dummyUTXO !== null && dummyUTXO.value.gt(BNZero)) {
        psbt.addOutput({
            address: receiverBTCAddress,
            value: amountPayToSeller.plus(dummyUTXO.value).toNumber(),
        });
    } else {
        psbt.addOutput({
            address: receiverBTCAddress,
            value: amountPayToSeller.toNumber(),
        });
    }

    // the second input and output
    // add dummy UTXO and output for paying to creator

    if (feePayToCreator.gt(BNZero) && creatorAddress !== "") {
        psbt.addInput({
            hash: dummyUTXO.tx_hash,
            index: dummyUTXO.tx_output_n,
            witnessUtxo: { value: dummyUTXO.value.toNumber(), script: p2pktr.output as Buffer },
            tapInternalKey: toXOnly(keyPair.publicKey),
            sighashType: Transaction.SIGHASH_SINGLE | Transaction.SIGHASH_ANYONECANPAY,
        });

        psbt.addOutput({
            address: creatorAddress,
            value: feePayToCreator.toNumber()
        });
    }

    // sign tx
    psbt.txInputs.forEach((utxo, index) => {
        psbt.signInput(index, tweakedSigner, [Transaction.SIGHASH_SINGLE | Transaction.SIGHASH_ANYONECANPAY]);
        let isValid = true;
        try {
            isValid = psbt.validateSignaturesOfInput(index, verifySchnorr, tweakedSigner.publicKey);
        } catch (e) {
            isValid = false;
        }
        if (!isValid) {
            throw new SDKError(ERROR_CODE.INVALID_SIG);
        }
    });
    psbt.finalizeAllInputs();

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
const createPSBTToBuy = (
    params: {
        sellerSignedPsbt: Psbt,
        buyerPrivateKey: Buffer,
        receiverInscriptionAddress: string,
        valueInscription: BigNumber,
        price: BigNumber,
        paymentUtxos: UTXO[],
        dummyUtxo: UTXO,
        feeRate: number,
    }
): ICreateTxResp => {
    const psbt = new Psbt({ network });
    const {
        sellerSignedPsbt,
        buyerPrivateKey,
        price,
        receiverInscriptionAddress,
        valueInscription,
        paymentUtxos,
        dummyUtxo,
        feeRate
    } = params;
    let totalValue = BNZero;

    const { keyPair, tweakedSigner, p2pktr, senderAddress: buyerAddress } = generateTaprootKeyPair(buyerPrivateKey);

    // Add dummy utxo to the first input coin
    psbt.addInput({
        hash: dummyUtxo.tx_hash,
        index: dummyUtxo.tx_output_n,
        witnessUtxo: { value: dummyUtxo.value.toNumber(), script: p2pktr.output as Buffer },
        tapInternalKey: toXOnly(keyPair.publicKey),
    });

    // Add inscription output
    // the frist output coin has value equal to the sum of dummy value and value inscription
    // this makes sure the first output coin is inscription outcoin 
    psbt.addOutput({
        address: receiverInscriptionAddress,
        value: dummyUtxo.value.plus(valueInscription).toNumber(),
    });

    if (sellerSignedPsbt.txInputs.length !== sellerSignedPsbt.txOutputs.length) {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "Length of inputs and outputs in seller psbt must not be different.");
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
            witnessUtxo: { value: utxo.value.toNumber(), script: p2pktr.output as Buffer },
            tapInternalKey: toXOnly(keyPair.publicKey),
        });

        totalValue = totalValue.plus(utxo.value);
    }

    let fee = new BigNumber(estimateTxFee(psbt.txInputs.length, psbt.txOutputs.length, feeRate));
    let changeValue = totalValue.minus(price).minus(fee);

    if (changeValue.gte(DummyUTXOValue)) {
        // Create a new dummy utxo output for the next purchase
        psbt.addOutput({
            address: buyerAddress,
            value: DummyUTXOValue,
        });
        changeValue = changeValue.minus(DummyUTXOValue);

        const extraFee = new BigNumber(OutputSize * feeRate);
        if (changeValue.gte(extraFee)) {
            changeValue = changeValue.minus(extraFee);
            fee = fee.plus(extraFee);
        }
    }

    if (changeValue.lt(BNZero)) {
        throw new SDKError(ERROR_CODE.NOT_ENOUGH_BTC_TO_SEND);
    }

    // Change utxo
    if (changeValue.gt(BNZero)) {
        if (changeValue.gte(MinSats)) {
            psbt.addOutput({
                address: buyerAddress,
                value: changeValue.toNumber(),
            });
        } else {
            fee = fee.plus(changeValue);
        }
    }

    // sign tx
    psbt.txInputs.forEach((utxo, index) => {
        if (index === 0 || index > sellerSignedPsbt.txInputs.length) {
            psbt.signInput(index, tweakedSigner);
        }
    });

    psbt.txInputs.forEach((utxo, index) => {
        if (index === 0 || index > sellerSignedPsbt.txInputs.length) {
            psbt.finalizeInput(index);
            try {
                const isValid = psbt.validateSignaturesOfInput(index, verifySchnorr, tweakedSigner.publicKey);
                if (!isValid) {
                    console.log("Tx signature is invalid " + index);
                }
            } catch (e) {
                console.log("Tx signature is invalid " + index);
            }
        }
    });

    // get tx hex
    const tx = psbt.extractTransaction();
    console.log("Transaction : ", tx);
    const txHex = tx.toHex();
    return { txID: tx.getId(), txHex, fee, selectedUTXOs: [...paymentUtxos, dummyUtxo], changeAmount: changeValue, tx };
};

/**
* reqListForSaleInscription creates the PSBT of the seller to list for sale inscription. 
* NOTE: Currently, the function only supports sending from Taproot address. 
* @param sellerPrivateKey buffer private key of the seller
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the seller
* @param sellInscriptionID id of inscription to sell
* @param receiverBTCAddress the seller's address to receive BTC
* @param amountPayToSeller BTC amount to pay to seller
* @param feePayToCreator BTC fee to pay to creator
* @param creatorAddress address of creator
* amountPayToSeller + feePayToCreator = price that is showed on UI
* @returns the base64 encode Psbt
*/
const reqListForSaleInscription = async (
    params: {
        sellerPrivateKey: Buffer,
        utxos: UTXO[],
        inscriptions: { [key: string]: Inscription[] },
        sellInscriptionID: string,
        receiverBTCAddress: string,
        amountPayToSeller: BigNumber,
        feePayToCreator: BigNumber,
        creatorAddress: string,
        feeRatePerByte: number,
    }
): Promise<ICreateTxSellResp> => {
    const { sellerPrivateKey,
        utxos,
        inscriptions,
        sellInscriptionID,
        receiverBTCAddress,
        feeRatePerByte
    } = params;

    let {
        amountPayToSeller,
        feePayToCreator,
        creatorAddress,
    } = params;

    // validation
    if (feePayToCreator.gt(BNZero) && creatorAddress === "") {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "Creator address must not be empty.");
    }
    if (sellInscriptionID === "") {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "SellInscriptionID must not be empty.");
    }
    if (receiverBTCAddress === "") {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "receiverBTCAddress must not be empty.");
    }
    if (amountPayToSeller.eq(BNZero)) {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "amountPayToSeller must be greater than zero.");
    }

    let needDummyUTXO = false;

    if (feePayToCreator.gt(BNZero)) {
        // creator is the selller
        if (creatorAddress !== receiverBTCAddress) {
            needDummyUTXO = true;
        } else {
            // create only one output, don't need to create 2 outputs
            amountPayToSeller = amountPayToSeller.plus(feePayToCreator);
            creatorAddress = "";
            feePayToCreator = BNZero;
        }
    }

    if (amountPayToSeller.lt(MinSats)) {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "amountPayToSeller must not be less than " + fromSat(MinSats) + " BTC.");
    }
    if (feePayToCreator.gt(BNZero) && feePayToCreator.lt(MinSats)) {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "feePayToCreator must not be less than " + fromSat(MinSats) + " BTC.");
    }

    // select inscription UTXO
    const { inscriptionUTXO, inscriptionInfo } = selectInscriptionUTXO(utxos, inscriptions, sellInscriptionID);
    let newInscriptionUTXO = inscriptionUTXO;

    // select dummy UTXO 
    // if there is no dummy UTXO, we have to create and broadcast the tx to split dummy UTXO first
    let dummyUTXORes: any;
    let selectedUTXOs: UTXO[] = [];
    let splitTxID = "";
    let splitTxRaw = "";

    if (needDummyUTXO) {
        try {
            // create dummy UTXO from cardinal UTXOs
            const res = await createDummyUTXOFromCardinal(sellerPrivateKey, utxos, inscriptions, feeRatePerByte);
            dummyUTXORes = res.dummyUTXO;
            selectedUTXOs = res.selectedUTXOs;
            splitTxID = res.splitTxID;
            splitTxRaw = res.txHex;
        } catch (e) {
            console.log("HHH Split fund from cardinal UTXO err: ", e);
            // create dummy UTXO from inscription UTXO
            const { txID, txHex, newValueInscription } = createTxSplitFundFromOrdinalUTXO(sellerPrivateKey, inscriptionUTXO, inscriptionInfo, new BigNumber(DummyUTXOValue), feeRatePerByte);
            splitTxID = txID;
            splitTxRaw = txHex;

            newInscriptionUTXO = {
                tx_hash: txID,
                tx_output_n: 0,
                value: newValueInscription,
            };
            dummyUTXORes = {
                tx_hash: txID,
                tx_output_n: 1,
                value: new BigNumber(DummyUTXOValue),
            };
        }
    }
    console.log("sell splitTxID: ", splitTxID);
    console.log("sell dummyUTXORes: ", dummyUTXORes);
    console.log("sell newInscriptionUTXO: ", newInscriptionUTXO);

    const base64Psbt = createPSBTToSell({
        inscriptionUTXO: newInscriptionUTXO,
        amountPayToSeller: amountPayToSeller,
        receiverBTCAddress: receiverBTCAddress,
        sellerPrivateKey: sellerPrivateKey,
        dummyUTXO: dummyUTXORes,
        creatorAddress: creatorAddress,
        feePayToCreator: feePayToCreator,
    });

    return { base64Psbt, selectedUTXOs: [inscriptionUTXO], splitTxID, splitUTXOs: selectedUTXOs, splitTxRaw: splitTxRaw };
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
* @param price  = amount pay to seller + fee pay to creator
* @returns the base64 encode Psbt
*/
const reqBuyInscription = async (
    params: {
        sellerSignedPsbtB64: string,
        buyerPrivateKey: Buffer,
        receiverInscriptionAddress: string,
        price: BigNumber,
        utxos: UTXO[],
        inscriptions: { [key: string]: Inscription[] },
        feeRatePerByte: number,
    }
): Promise<ICreateTxBuyResp> => {
    const {
        sellerSignedPsbtB64,
        buyerPrivateKey,
        receiverInscriptionAddress,
        price,
        utxos,
        inscriptions,
        feeRatePerByte
    } = params;
    // decode seller's signed PSBT
    const sellerSignedPsbt = Psbt.fromBase64(sellerSignedPsbtB64, { network });
    const sellerInputs = sellerSignedPsbt.data.inputs;
    if (sellerInputs.length === 0) {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "Invalid seller's PSBT.");
    }
    const valueInscription = sellerInputs[0].witnessUtxo?.value;
    if (valueInscription === undefined || valueInscription === 0) {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "Invalid value inscription in seller's PSBT.");
    }

    const newUTXOs = utxos;

    // select or create dummy UTXO
    const { dummyUTXO, splitTxID, selectedUTXOs, newUTXO, fee: feeSplitUTXO, txHex: splitTxRaw } = await createDummyUTXOFromCardinal(
        buyerPrivateKey, utxos, inscriptions, feeRatePerByte);

    console.log("buy dummyUTXO: ", dummyUTXO);
    console.log("buy splitTxID: ", splitTxID);
    console.log("buy selectedUTXOs for split: ", selectedUTXOs);
    console.log("buy newUTXO: ", newUTXO);


    // remove selected utxo or dummyUTXO, and append new UTXO to list of UTXO to create the next PSBT 
    if (selectedUTXOs.length > 0) {
        selectedUTXOs.forEach((selectedUtxo) => {
            const index = newUTXOs.findIndex((utxo) => utxo.tx_hash === selectedUtxo.tx_hash && utxo.tx_output_n === selectedUtxo.tx_output_n);
            newUTXOs.splice(index, 1);
        });
    } else {
        const index = newUTXOs.findIndex((utxo) => utxo.tx_hash === dummyUTXO.tx_hash && utxo.tx_output_n === dummyUTXO.tx_output_n);
        newUTXOs.splice(index, 1);
    }

    if (newUTXO !== undefined && newUTXO !== null) {
        newUTXOs.push(newUTXO);
    }

    console.log("buy newUTXOs: ", newUTXOs);

    // select cardinal UTXOs to payment
    const { numIns, numOuts } = estimateNumInOutputsForBuyInscription(sellerSignedPsbt);
    const estTotalPaymentAmount = price.plus(DummyUTXOValue + estimateTxFee(numIns, numOuts, feeRatePerByte));

    const { selectedUTXOs: paymentUTXOs } = selectCardinalUTXOs(newUTXOs, inscriptions, estTotalPaymentAmount);


    // create PBTS from the seller's one
    const res = createPSBTToBuy({
        sellerSignedPsbt: sellerSignedPsbt,
        buyerPrivateKey: buyerPrivateKey,
        receiverInscriptionAddress: receiverInscriptionAddress,
        valueInscription: new BigNumber(valueInscription),
        price: price,
        paymentUtxos: paymentUTXOs,
        dummyUtxo: dummyUTXO,
        feeRate: feeRatePerByte,
    });

    return {
        tx: res.tx,
        txID: res?.txID,
        txHex: res?.txHex,
        fee: res?.fee.plus(feeSplitUTXO),
        selectedUTXOs: [...paymentUTXOs, dummyUTXO],
        splitTxID,
        splitUTXOs: [...selectedUTXOs],
        splitTxRaw: splitTxRaw,
    };
};

export {
    createPSBTToSell,
    createPSBTToBuy,
    reqListForSaleInscription,
    reqBuyInscription,
};