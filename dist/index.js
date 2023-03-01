'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var bitcoinjsLib = require('bitcoinjs-lib');
var axios = require('axios');
var ecpair = require('ecpair');
var ecc = require('@bitcoinerlab/secp256k1');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n["default"] = e;
    return Object.freeze(n);
}

var axios__default = /*#__PURE__*/_interopDefaultLegacy(axios);
var ecc__namespace = /*#__PURE__*/_interopNamespace(ecc);

const BlockStreamURL = "https://blockstream.info/api";
const MinSatInscription = 546;
const network = bitcoinjsLib.networks.bitcoin; // mainnet
const DummyUTXOValue = 1000;

const wif = require("wif");
bitcoinjsLib.initEccLib(ecc__namespace);
const ECPair = ecpair.ECPairFactory(ecc__namespace);
/**
* convertPrivateKey converts buffer private key to WIF private key string
* @param bytes buffer private key
* @returns the WIF private key string
*/
const convertPrivateKey = (bytes) => {
    return wif.encode(128, bytes, true);
};
/**
* estimateTxFee estimates the transaction fee
* @param numIns number of inputs in the transaction
* @param numOuts number of outputs in the transaction
* @param feeRatePerByte fee rate per byte (in satoshi)
* @returns returns the estimated transaction fee in satoshi
*/
const estimateTxFee = (numIns, numOuts, feeRatePerByte) => {
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
const estimateNumInOutputs = (inscriptionID, sendAmount, isUseInscriptionPayFee) => {
    let numOuts = 0;
    let numIns = 0;
    if (inscriptionID !== "") {
        numOuts++;
        numIns++;
    }
    if (sendAmount > 0) {
        numOuts++;
    }
    if (sendAmount > 0 || !isUseInscriptionPayFee) {
        numIns++;
        numOuts++; // for change BTC output
    }
    return { numIns, numOuts };
};
function toXOnly(pubkey) {
    return pubkey.subarray(1, 33);
}
function tweakSigner(signer, opts = {}) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let privateKey = signer.privateKey;
    if (!privateKey) {
        throw new Error("Private key is required for tweaking signer!");
    }
    if (signer.publicKey[0] === 3) {
        privateKey = ecc__namespace.privateNegate(privateKey);
    }
    const tweakedPrivateKey = ecc__namespace.privateAdd(privateKey, tapTweakHash(toXOnly(signer.publicKey), opts.tweakHash));
    if (!tweakedPrivateKey) {
        throw new Error("Invalid tweaked private key!");
    }
    return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
        network: opts.network,
    });
}
function tapTweakHash(pubKey, h) {
    return bitcoinjsLib.crypto.taggedHash("TapTweak", Buffer.concat(h ? [pubKey, h] : [pubKey]));
}
const generateTaprootAddress = (privateKey) => {
    const keyPair = ECPair.fromPrivateKey(privateKey);
    const internalPubkey = toXOnly(keyPair.publicKey);
    const { address } = bitcoinjsLib.payments.p2tr({
        internalPubkey,
    });
    return address ? address : "";
};
const generateTaprootKeyPair = (privateKey) => {
    // init key pair from senderPrivateKey
    const keyPair = ECPair.fromPrivateKey(privateKey);
    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keyPair, { network });
    // Generate an address from the tweaked public key
    const p2pktr = bitcoinjsLib.payments.p2tr({
        pubkey: toXOnly(tweakedSigner.publicKey),
        network
    });
    const senderAddress = p2pktr.address ? p2pktr.address : "";
    if (senderAddress === "") {
        throw new Error("Can not get sender address from private key");
    }
    return { keyPair, senderAddress, tweakedSigner, p2pktr };
};

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
const selectUTXOs = (utxos, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFee) => {
    const resultUTXOs = [];
    let normalUTXOs = [];
    let inscriptionUTXO = null;
    let inscriptionInfo = null;
    let valueOutInscription = 0;
    let changeAmount = 0;
    let maxAmountInsTransfer = 0;
    // convert feeRate to interger
    feeRatePerByte = Math.round(feeRatePerByte);
    // estimate fee
    const { numIns, numOuts } = estimateNumInOutputs(sendInscriptionID, sendAmount, isUseInscriptionPayFee);
    const estFee = estimateTxFee(numIns, numOuts, feeRatePerByte);
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
        }
        else {
            // inscription UTXO
            if (sendInscriptionID !== "") {
                const inscription = inscriptionInfos.find(ins => ins.id === sendInscriptionID);
                if (inscription !== undefined) {
                    // don't support send tx with outcoin that includes more than one inscription
                    if (inscriptionInfos.length > 1) {
                        throw new Error(`InscriptionID ${{ sendInscriptionID }} is not supported to send.`);
                    }
                    inscriptionUTXO = utxo;
                    inscriptionInfo = inscription;
                    maxAmountInsTransfer = (inscriptionUTXO.value - inscriptionInfo.offset - 1) - MinSatInscription;
                    console.log("maxAmountInsTransfer: ", maxAmountInsTransfer);
                }
            }
        }
    });
    if (sendInscriptionID !== "") {
        if (inscriptionUTXO === null || inscriptionInfo == null) {
            throw new Error("Can not find inscription UTXO for sendInscriptionID");
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
            throw new Error("Your balance is insufficient.");
        }
        normalUTXOs = normalUTXOs.sort((a, b) => {
            if (a.value > b.value) {
                return -1;
            }
            if (a.value < b.value) {
                return 1;
            }
            return 0;
        });
        console.log("normalUTXOs: ", normalUTXOs);
        if (normalUTXOs[normalUTXOs.length - 1].value >= totalSendAmount) {
            // select the smallest utxo
            resultUTXOs.push(normalUTXOs[normalUTXOs.length - 1]);
            totalInputAmount = normalUTXOs[normalUTXOs.length - 1].value;
        }
        else if (normalUTXOs[0].value < totalSendAmount) {
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
                throw new Error("Your balance is insufficient.");
            }
        }
        else {
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
    let fee = estimateTxFee(resultUTXOs.length, reNumOuts, feeRatePerByte);
    // calculate output amount
    if (isUseInscriptionPayFee) {
        if (maxAmountInsTransfer < fee) {
            fee = maxAmountInsTransfer;
        }
        valueOutInscription = inscriptionUTXO.value - fee;
        changeAmount = totalInputAmount - sendAmount;
    }
    else {
        if (totalInputAmount < sendAmount + fee) {
            fee = totalInputAmount - sendAmount;
        }
        valueOutInscription = (inscriptionUTXO === null || inscriptionUTXO === void 0 ? void 0 : inscriptionUTXO.value) || 0;
        changeAmount = totalInputAmount - sendAmount - fee;
    }
    return { selectedUTXOs: resultUTXOs, isUseInscriptionPayFee: isUseInscriptionPayFee, valueOutInscription: valueOutInscription, changeAmount: changeAmount, fee: fee };
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
const createTx = (senderPrivateKey, utxos, inscriptions, sendInscriptionID = "", receiverInsAddress, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam = true) => {
    const network = bitcoinjsLib.networks.bitcoin; // mainnet
    // select UTXOs
    const { selectedUTXOs, valueOutInscription, changeAmount, fee } = selectUTXOs(utxos, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);
    console.log("selectedUTXOs: ", selectedUTXOs);
    // init key pair from senderPrivateKey
    const keypair = ECPair.fromPrivateKey(senderPrivateKey);
    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network });
    // Generate an address from the tweaked public key
    const p2pktr = bitcoinjsLib.payments.p2tr({
        pubkey: toXOnly(tweakedSigner.publicKey),
        network
    });
    const senderAddress = p2pktr.address ? p2pktr.address : "";
    if (senderAddress === "") {
        throw new Error("Can not get sender address from private key");
    }
    const psbt = new bitcoinjsLib.Psbt({ network });
    // add inputs
    selectedUTXOs.forEach((input) => {
        psbt.addInput({
            hash: input.tx_hash,
            index: input.tx_output_n,
            witnessUtxo: { value: input.value, script: p2pktr.output },
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
        var _a;
        psbt.signInput(index, tweakedSigner);
        console.log("psbt after signing tapKeySig: ", psbt.data.inputs[index].tapKeySig, (_a = psbt.data.inputs[index].tapKeySig) === null || _a === void 0 ? void 0 : _a.length);
    });
    psbt.finalizeAllInputs();
    // get tx hex
    const tx = psbt.extractTransaction();
    console.log("Transaction : ", tx);
    const txHex = tx.toHex();
    return { txID: tx.getId(), txHex, fee, selectedUTXOs };
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
const createTxWithSpecificUTXOs = (senderPrivateKey, utxos, sendInscriptionID = "", receiverInsAddress, sendAmount, valueOutInscription, changeAmount, fee) => {
    const network = bitcoinjsLib.networks.bitcoin; // mainnet
    const selectedUTXOs = utxos;
    // init key pair from senderPrivateKey
    const keypair = ECPair.fromPrivateKey(senderPrivateKey);
    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network });
    // Generate an address from the tweaked public key
    const p2pktr = bitcoinjsLib.payments.p2tr({
        pubkey: toXOnly(tweakedSigner.publicKey),
        network
    });
    const senderAddress = p2pktr.address ? p2pktr.address : "";
    if (senderAddress === "") {
        throw new Error("Can not get sender address from private key");
    }
    const psbt = new bitcoinjsLib.Psbt({ network });
    // add inputs
    selectedUTXOs.forEach((input) => {
        psbt.addInput({
            hash: input.tx_hash,
            index: input.tx_output_n,
            witnessUtxo: { value: input.value, script: p2pktr.output },
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
const broadcastTx = async (txHex) => {
    const blockstream = new axios__default["default"].Axios({
        baseURL: BlockStreamURL
    });
    const response = await blockstream.post("/tx", txHex);
    return response.data;
};

const getBTCBalance = (params) => {
    let btcBalance = 0;
    const { utxos, inscriptions } = params;
    // filter normal UTXO and inscription UTXO to send
    utxos.forEach(utxo => {
        // txIDKey = tx_hash:tx_output_n
        let txIDKey = utxo.tx_hash.concat(":");
        txIDKey = txIDKey.concat(utxo.tx_output_n.toString());
        // try to get inscriptionInfos
        const inscriptionInfos = inscriptions[txIDKey];
        if (inscriptionInfos === undefined || inscriptionInfos === null || inscriptionInfos.length == 0) {
            btcBalance += utxo.value;
        }
    });
    return btcBalance;
};

/**
* createPSBTForSale creates the partially signed bitcoin transaction to sale the inscription.
* NOTE: Currently, the function only supports sending from Taproot address.
* @param sellerPrivateKey buffer private key of the seller
* @param sellerAddress payment address of the seller to recieve BTC from buyer
* @param ordinalInput ordinal input coin to sell
* @param price price of the inscription that the seller wants to sell (in satoshi)
* @returns the encoded base64 partially signed transaction
*/
const createPSBTToSale = (params) => {
    var _a;
    const psbt = new bitcoinjsLib.Psbt({ network });
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
        witnessUtxo: { value: ordinalInput.value, script: p2pktr.output },
        tapInternalKey: toXOnly(keyPair.publicKey),
        sighashType: bitcoinjsLib.Transaction.SIGHASH_SINGLE | bitcoinjsLib.Transaction.SIGHASH_ANYONECANPAY,
    });
    console.log("Add input successfully");
    psbt.addOutput({
        address: sellerAddress,
        value: price,
    });
    // sign on the first input coin and the first output coin
    psbt.signTaprootInput(0, tweakedSigner, undefined, [bitcoinjsLib.Transaction.SIGHASH_SINGLE | bitcoinjsLib.Transaction.SIGHASH_ANYONECANPAY]);
    console.log("sign input successfully");
    console.log("psbt after signing: ", psbt);
    console.log("psbt after signingtapScriptSig: ", psbt.data.inputs[0].tapScriptSig);
    console.log("psbt after signing tapKeySig: ", psbt.data.inputs[0].tapKeySig, (_a = psbt.data.inputs[0].tapKeySig) === null || _a === void 0 ? void 0 : _a.length);
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
const createPSBTToBuy = (params) => {
    const psbt = new bitcoinjsLib.Psbt({ network });
    const { sellerSignedPsbt, buyerPrivateKey, buyerAddress, sellerAddress, valueInscription, price, paymentUtxos, dummyUtxo, feeRate } = params;
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
        witnessUtxo: { value: dummyUtxo.value, script: p2pktr.output },
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
            witnessUtxo: { value: utxo.value, script: p2pktr.output },
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

exports.BlockStreamURL = BlockStreamURL;
exports.DummyUTXOValue = DummyUTXOValue;
exports.ECPair = ECPair;
exports.MinSatInscription = MinSatInscription;
exports.broadcastTx = broadcastTx;
exports.convertPrivateKey = convertPrivateKey;
exports.createPSBTToBuy = createPSBTToBuy;
exports.createPSBTToSale = createPSBTToSale;
exports.createTx = createTx;
exports.createTxWithSpecificUTXOs = createTxWithSpecificUTXOs;
exports.estimateNumInOutputs = estimateNumInOutputs;
exports.estimateTxFee = estimateTxFee;
exports.generateTaprootAddress = generateTaprootAddress;
exports.generateTaprootKeyPair = generateTaprootKeyPair;
exports.getBTCBalance = getBTCBalance;
exports.network = network;
exports.selectUTXOs = selectUTXOs;
exports.tapTweakHash = tapTweakHash;
exports.toXOnly = toXOnly;
exports.tweakSigner = tweakSigner;
//# sourceMappingURL=index.js.map
