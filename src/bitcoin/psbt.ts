import {
    networks,
    payments,
    Psbt,
    Transaction,
} from "bitcoinjs-lib";

import axios, { AxiosResponse } from "axios";
import { ICreateTxResp, Inscription, UTXO } from "./types";
import { BlockStreamURL, MinSatInscription, network, DummyUTXOValue } from "./constants";
import {
    toXOnly,
    tweakSigner,
    ECPair,
    estimateTxFee,
    estimateNumInOutputs,
    generateTaprootKeyPair,
} from "./utils";
import {
    witnessStackToScriptWitness
} from "./bitcoin";

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
    },
): string => {
    const psbt = new Psbt({ network });
    const { ordinalInput, price, sellerAddress, sellerPrivateKey } = params;

    const { keyPair, tweakedSigner, p2pktr } = generateTaprootKeyPair(sellerPrivateKey);

    // const [ordinalUtxoTxId, ordinalUtxoVout] = ordinalOutput.split(':')
    // const tx = Transaction.fromHex(await getTxHexById(ordinalUtxoTxId))
    // for (const output in tx.outs) {
    //     try { tx.setWitness(output, []) } catch { }
    // }
    // psbt.addInput({
    //     hash: ordinalInput.tx_hash,
    //     index: ordinalInput.tx_output_n,
    //     nonWitnessUtxo: tx.toBuffer(),
    //     // witnessUtxo: tx.outs[ordinalUtxoVout],
    //     sighashType: Transaction.SIGHASH_SINGLE | Transaction.SIGHASH_ANYONECANPAY,
    // });

    // add ordinal input into the first input coins with 
    // sighashType: Transaction.SIGHASH_SINGLE | Transaction.SIGHASH_ANYONECANPAY

    psbt.addInput({
        hash: ordinalInput.tx_hash,
        index: ordinalInput.tx_output_n,
        witnessUtxo: { value: ordinalInput.value, script: p2pktr.output as Buffer},
        tapInternalKey: toXOnly(keyPair.publicKey),
        sighashType: Transaction.SIGHASH_SINGLE | Transaction.SIGHASH_ANYONECANPAY,
    });

    console.log("Add input successfully");

    psbt.addOutput({
        address: sellerAddress,
        value: price,
    });

    // sign on the first input coin and the first output coin
    psbt.signTaprootInput(0, tweakedSigner, undefined, [Transaction.SIGHASH_SINGLE | Transaction.SIGHASH_ANYONECANPAY]);
    console.log("sign input successfully");
    console.log("psbt after signing: ", psbt);
    console.log("psbt after signingtapScriptSig: ", psbt.data.inputs[0].tapScriptSig);
    console.log("psbt after signing tapKeySig: ", psbt.data.inputs[0].tapKeySig,  psbt.data.inputs[0].tapKeySig?.length);
    console.log("psbt after signing partialSig: ", psbt.data.inputs[0].partialSig);



    // const base64Tx = psbt.toBase64();
    // const signedContent = psbt.toHex();

    // console.log("base64Tx ", base64Tx);
    // console.log("signedContent ", signedContent);

    // let signedSalePsbt;
    // // if (signedContent.startsWith("02000000") || signedContent.startsWith("01000000")) {
    //     const sellerSignedTx = Transaction.fromHex(signedContent);
    //     const sellerSignedInput = sellerSignedTx.ins[0];
    //     signedSalePsbt = Psbt.fromBase64(base64Tx, { network });

    //     if (sellerSignedInput?.script?.length) {
    //         console.log("0");
    //         signedSalePsbt.updateInput(0, {
    //             finalScriptSig: sellerSignedInput.script,
    //         });
    //     }
    //     if (sellerSignedInput?.witness?.[0]?.length) {
    //         console.log("1");
    //         signedSalePsbt.updateInput(0, {
    //             finalScriptWitness: witnessStackToScriptWitness(sellerSignedInput.witness),
    //         });
    //     }

    //     signedSalePsbt = signedSalePsbt.toBase64();
    // } else {
    //     signedSalePsbt = base64Tx;
    // }

    psbt.finalizeAllInputs();
    console.log("finalize input successfully");

    // const tx = psbt.extractTransaction();
    // console.log("extract tx successfully");




    // const hexTx = tx.toHex();
    // console.log("hexTx: ", hexTx);
    // const base64Tx = psbt.toBase64();
    // console.log("base64Tx: ", base64Tx);

    // let sellerSignedTx = psbt.data.globalMap.unsignedTx;
    // try {
    //      sellerSignedTx = Transaction.fromHex(hexTx);
    // } catch (e) {
    //     console.log("ERr: ", e);

    // }

    // const sellerSignedTx = Psbt.fromHex(hexTx);



   

    // console.log("sellerSignedTx: ", sellerSignedTx);
    // // sellerSignedTx.

    // const sellerSignedInput = sellerSignedTx.txInputs[0];


    // const signedSalePsbt = Psbt.fromBase64(base64Tx, { network });

    // if (sellerSignedInput?.script?.length) {
    //     signedSalePsbt.updateInput(0, {
    //         finalScriptSig: sellerSignedInput.script,
    //     });
    // }
    // if (sellerSignedInput?.witness?.[0]?.length) {
    //     signedSalePsbt.updateInput(0, {
    //         finalScriptWitness: witnessStackToScriptWitness(sellerSignedInput.witness),
    //     });
    // }


    return psbt.toBase64();
};

/**
* createPSBTToBuy creates the partially signed bitcoin transaction to buy the inscription. 
* NOTE: Currently, the function only supports sending from Taproot address. 
* @param buyerPrivateKey buffer private key of the buyer
* @param sellerAddress payment address of the seller to recieve BTC from buyer
* @param ordinalInput ordinal input coin to sell
* @param price price of the inscription that the seller wants to sell (in satoshi)
* @returns the encoded base64 partially signed transaction
*/
const createPSBTToBuy = (
    params: {
        sellerSignedPsbt: Psbt,
        buyerPrivateKey: Buffer,
        buyerAddress: string,
        sellerAddress: string,
        valueInscription: number,
        price: number,
        paymentUtxos: UTXO[],
        dummyUtxo: UTXO,
        feeRate: number,
    }
) => {
    const psbt = new Psbt({ network });
    const {
        sellerSignedPsbt,
        buyerPrivateKey,
        buyerAddress,
        sellerAddress,
        valueInscription,
        price,
        paymentUtxos,
        dummyUtxo,
        feeRate
    } = params;
    let totalValue = 0;
    let totalPaymentValue = 0;

    const { keyPair, tweakedSigner, p2pktr } = generateTaprootKeyPair(buyerPrivateKey);

    // const tx = bitcoin.Transaction.fromHex(await getTxHexById(dummyUtxo.txid))
    // for (const output in tx.outs) {
    //     try { tx.setWitness(output, []) } catch { }
    // }

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
        address: sellerAddress,
        value: dummyUtxo.value + valueInscription,
    });

    // Add payer signed input
    // TODO
    // ...sellerSignedPsbt.data.globalMap.unsignedTx.tx.ins[0],
    psbt.addInput({
        ...sellerSignedPsbt.txInputs[0],
        ...sellerSignedPsbt.data.inputs[0]
    });
    // Add payer output
    // ...sellerSignedPsbt.data.globalMap.unsignedTx.tx.outs[0],
    psbt.addOutput({
        ...sellerSignedPsbt.txOutputs[0],
    });

    // Add payment utxo inputs
    for (const utxo of paymentUtxos) {
        // const tx = bitcoin.Transaction.fromHex(await getTxHexById(utxo.txid))
        // for (const output in tx.outs) {
        //     try { tx.setWitness(output, []) } catch { }
        // }

        // psbt.addInput({
        //     hash: utxo.txid,
        //     index: utxo.vout,
        //     nonWitnessUtxo: tx.toBuffer(),
        //     // witnessUtxo: tx.outs[utxo.vout],
        // });

        psbt.addInput({
            hash: utxo.tx_hash,
            index: utxo.tx_output_n,
            witnessUtxo: { value: utxo.value, script: p2pktr.output as Buffer },
            tapInternalKey: toXOnly(keyPair.publicKey),
            // sighashType: Transaction.SIGHASH_SINGLE | Transaction.SIGHASH_ANYONECANPAY,
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
    psbt.addOutput({
        address: buyerAddress,
        value: changeValue,
    });

    // sign tx
    psbt.txInputs.forEach((utxo, index) => {
        if (index != 1) {
            psbt.signInput(index, tweakedSigner);
        }
    });
    console.log("sign input successfully");

    psbt.txInputs.forEach((utxo, index) => {
        // utxo.
        // if (index != 1) {
        psbt.finalizeInput(index);
        // }
    });

    console.log("finalize input successfully");


    // psbt.finalizeAllInputs();

    // get tx hex
    const tx = psbt.extractTransaction();
    console.log("Transaction : ", tx);
    const txHex = tx.toHex();
    return { txID: tx.getId(), txHex, fee };
};

export {
    createPSBTToSale,
    createPSBTToBuy,
};