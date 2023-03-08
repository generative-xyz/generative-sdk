'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var bitcoinjsLib = require('bitcoinjs-lib');
var axios = require('axios');
var ecpair = require('ecpair');
var ecc = require('@bitcoinerlab/secp256k1');
var ethers = require('ethers');
var cryptoJs = require('crypto-js');
var jsSha3 = require('js-sha3');

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
const MinSats = 1000;
const network = bitcoinjsLib.networks.bitcoin; // mainnet
const DummyUTXOValue = 1000;
const InputSize = 68;
const OutputSize = 43;

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
* convertPrivateKeyFromStr converts private key WIF string to Buffer
* @param str private key string
* @returns buffer private key
*/
const convertPrivateKeyFromStr = (str) => {
    const res = wif.decode(str);
    return res === null || res === void 0 ? void 0 : res.privateKey;
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
/**
* estimateNumInOutputs estimates number of inputs and outputs by parameters:
* @param inscriptionID id of inscription to send (if any)
* @param sendAmount satoshi amount need to send
* @param isUseInscriptionPayFee use inscription output coin to pay fee or not
* @returns returns the estimated number of inputs and outputs in the transaction
*/
const estimateNumInOutputsForBuyInscription = (sellerSignedPsbt) => {
    const numIns = 1 + sellerSignedPsbt.txInputs.length + 2;
    const numOuts = 1 + sellerSignedPsbt.txOutputs.length + 1 + 1;
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
const fromSat = (sat) => {
    return sat / 1e8;
};

const ERROR_CODE = {
    INVALID_PARAMS: "-1",
    NOT_SUPPORT_SEND: "-2",
    NOT_FOUND_INSCRIPTION: "-3",
    NOT_ENOUGH_BTC_TO_SEND: "-4",
    NOT_ENOUGH_BTC_TO_PAY_FEE: "-5",
    ERR_BROADCAST_TX: "-6",
    INVALID_SIG: "-7",
};
const ERROR_MESSAGE = {
    [ERROR_CODE.INVALID_PARAMS]: {
        message: "Invalid input params.",
        desc: "Invalid input params.",
    },
    [ERROR_CODE.NOT_SUPPORT_SEND]: {
        message: "This inscription is not supported to send.",
        desc: "This inscription is not supported to send.",
    },
    [ERROR_CODE.NOT_FOUND_INSCRIPTION]: {
        message: "Can not find inscription UTXO in your wallet.",
        desc: "Can not find inscription UTXO in your wallet.",
    },
    [ERROR_CODE.NOT_ENOUGH_BTC_TO_SEND]: {
        message: "Your balance is insufficient. Please top up BTC to your wallet.",
        desc: "Your balance is insufficient. Please top up BTC to your wallet.",
    },
    [ERROR_CODE.NOT_ENOUGH_BTC_TO_PAY_FEE]: {
        message: "Your balance is insufficient. Please top up BTC to pay network fee.",
        desc: "Your balance is insufficient. Please top up BTC to pay network fee.",
    },
    [ERROR_CODE.ERR_BROADCAST_TX]: {
        message: "There was an issue when broadcasting the transaction to the BTC network.",
        desc: "There was an issue when broadcasting the transaction to the BTC network.",
    },
    [ERROR_CODE.INVALID_SIG]: {
        message: "Signature is invalid in the partially signed bitcoin transaction.",
        desc: "Signature is invalid in the partially signed bitcoin transaction.",
    },
};
class SDKError extends Error {
    constructor(code, desc) {
        super();
        const _error = ERROR_MESSAGE[code];
        this.message = `${_error} ERROR_CODE${code}` || "";
        this.code = code;
        this.desc = desc || (_error === null || _error === void 0 ? void 0 : _error.desc);
    }
    getMessage() {
        return this.message;
    }
}

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
        normalUTXOs = normalUTXOs.sort((a, b) => {
            if (a.value > b.value) {
                return -1;
            }
            if (a.value < b.value) {
                return 1;
            }
            return 0;
        });
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
                throw new SDKError(ERROR_CODE.NOT_ENOUGH_BTC_TO_SEND);
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
    let feeRes = estimateTxFee(resultUTXOs.length, reNumOuts, feeRatePerByte);
    // calculate output amount
    if (isUseInscriptionPayFee) {
        if (maxAmountInsTransfer < feeRes) {
            feeRes = maxAmountInsTransfer;
        }
        valueOutInscription = inscriptionUTXO.value - feeRes;
        changeAmount = totalInputAmount - sendAmount;
    }
    else {
        if (totalInputAmount < sendAmount + feeRes) {
            feeRes = totalInputAmount - sendAmount;
        }
        valueOutInscription = (inscriptionUTXO === null || inscriptionUTXO === void 0 ? void 0 : inscriptionUTXO.value) || 0;
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
const selectInscriptionUTXO = (utxos, inscriptions, inscriptionID) => {
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
const selectCardinalUTXOs = (utxos, inscriptions, sendAmount) => {
    const resultUTXOs = [];
    let normalUTXOs = [];
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
    normalUTXOs = normalUTXOs.sort((a, b) => {
        if (a.value > b.value) {
            return -1;
        }
        if (a.value < b.value) {
            return 1;
        }
        return 0;
    });
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
                throw new SDKError(ERROR_CODE.NOT_ENOUGH_BTC_TO_SEND);
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
const selectTheSmallestUTXO = (utxos, inscriptions) => {
    let normalUTXOs = [];
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
    normalUTXOs = normalUTXOs.sort((a, b) => {
        if (a.value > b.value) {
            return -1;
        }
        if (a.value < b.value) {
            return 1;
        }
        return 0;
    });
    return normalUTXOs[normalUTXOs.length - 1];
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
    // validation
    if (sendAmount > 0 && sendAmount < MinSats) {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "sendAmount must not be less than " + fromSat(MinSats) + " BTC.");
    }
    // select UTXOs
    const { selectedUTXOs, valueOutInscription, changeAmount, fee } = selectUTXOs(utxos, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);
    let feeRes = fee;
    // init key pair and tweakedSigner from senderPrivateKey
    const { keyPair, senderAddress, tweakedSigner, p2pktr } = generateTaprootKeyPair(senderPrivateKey);
    const psbt = new bitcoinjsLib.Psbt({ network });
    // add inputs
    selectedUTXOs.forEach((input) => {
        psbt.addInput({
            hash: input.tx_hash,
            index: input.tx_output_n,
            witnessUtxo: { value: input.value, script: p2pktr.output },
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
        }
        else {
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
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "Can not get the sender address from the private key");
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
const createTxSplitFundFromOrdinalUTXO = (senderPrivateKey, inscriptionUTXO, inscriptionInfo, sendAmount, feeRatePerByte) => {
    // validation
    if (sendAmount > 0 && sendAmount < MinSats) {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "sendAmount must not be less than " + fromSat(MinSats) + " BTC.");
    }
    const { keyPair, senderAddress, tweakedSigner, p2pktr } = generateTaprootKeyPair(senderPrivateKey);
    const maxAmountInsSpend = (inscriptionUTXO.value - inscriptionInfo.offset - 1) - MinSats;
    const fee = estimateTxFee(1, 2, feeRatePerByte);
    const totalAmountSpend = sendAmount + fee;
    if (totalAmountSpend > maxAmountInsSpend) {
        throw new SDKError(ERROR_CODE.NOT_ENOUGH_BTC_TO_PAY_FEE);
    }
    const newValueInscription = inscriptionUTXO.value - totalAmountSpend;
    const psbt = new bitcoinjsLib.Psbt({ network });
    // add inputs
    psbt.addInput({
        hash: inscriptionUTXO.tx_hash,
        index: inscriptionUTXO.tx_output_n,
        witnessUtxo: { value: inscriptionUTXO.value, script: p2pktr.output },
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
const createDummyUTXOFromCardinal = async (senderPrivateKey, utxos, inscriptions, feeRatePerByte) => {
    // create dummy UTXO from cardinal UTXOs
    let dummyUTXO;
    let newUTXO = null;
    const smallestUTXO = selectTheSmallestUTXO(utxos, inscriptions);
    if (smallestUTXO.value <= DummyUTXOValue) {
        dummyUTXO = smallestUTXO;
        return { dummyUTXO: dummyUTXO, splitTxID: "", selectedUTXOs: [], newUTXO: newUTXO, fee: 0, txHex: "" };
    }
    else {
        const { senderAddress } = generateTaprootKeyPair(senderPrivateKey);
        const { txID, txHex, fee, selectedUTXOs, changeAmount } = createTx(senderPrivateKey, utxos, inscriptions, "", senderAddress, DummyUTXOValue, feeRatePerByte, false);
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
        return { dummyUTXO: dummyUTXO, splitTxID: txID, selectedUTXOs, newUTXO: newUTXO, fee, txHex };
    }
};
const broadcastTx = async (txHex) => {
    const blockstream = new axios__default["default"].Axios({
        baseURL: BlockStreamURL
    });
    const response = await blockstream.post("/tx", txHex);
    const { status, data } = response;
    if (status !== 200) {
        throw new SDKError(ERROR_CODE.ERR_BROADCAST_TX, data);
    }
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
const importBTCPrivateKey = (wifPrivKey) => {
    const privKeyBuffer = convertPrivateKeyFromStr(wifPrivKey);
    const { senderAddress } = generateTaprootKeyPair(privKeyBuffer);
    return {
        privKeyBuffer: privKeyBuffer,
        taprootAddress: senderAddress,
    };
};
const getBitcoinKeySignContent = (message) => {
    return Buffer.from(message);
};
/**
* derivePasswordWallet derive the password from ONE SPECIFIC evm address.
* This password is used to encrypt and decrypt the imported BTC wallet.
* NOTE: The client should save the corresponding evm address to retrieve the same BTC wallet.
* @param provider ETH provider
* @param evmAddress evm address is chosen to create the valid signature on IMPORT_MESSAGE
* @returns the password string
*/
const derivePasswordWallet = async (evmAddress, provider) => {
    // sign message with first sign transaction
    const IMPORT_MESSAGE = "Sign this message to import your Bitcoin wallet. This key will be used to encrypt your wallet.";
    const toSign = "0x" + getBitcoinKeySignContent(IMPORT_MESSAGE).toString("hex");
    const signature = await provider.send("personal_sign", [
        toSign,
        evmAddress.toString(),
    ]);
    // const signature = randomBytes(64);
    const password = jsSha3.keccak256(ethers.utils.arrayify(signature));
    return password;
};
const encryptWallet = (wallet, password) => {
    // convert wallet to string
    const walletStr = JSON.stringify(wallet);
    const ciphertext = cryptoJs.AES.encrypt(walletStr, password).toString();
    return ciphertext;
};
const decryptWallet = (ciphertext, password) => {
    const plaintextBytes = cryptoJs.AES.decrypt(ciphertext, password);
    // parse to wallet object
    const wallet = JSON.parse(plaintextBytes.toString(cryptoJs.enc.Utf8));
    return wallet;
};

/**
* createPSBTToSell creates the partially signed bitcoin transaction to sale the inscription.
* NOTE: Currently, the function only supports sending from Taproot address.
* @param sellerPrivateKey buffer private key of the seller
* @param sellerAddress payment address of the seller to recieve BTC from buyer
* @param ordinalInput ordinal input coin to sell
* @param price price of the inscription that the seller wants to sell (in satoshi)
* @returns the encoded base64 partially signed transaction
*/
const createPSBTToSell = (params) => {
    const psbt = new bitcoinjsLib.Psbt({ network });
    const { inscriptionUTXO: ordinalInput, amountPayToSeller, receiverBTCAddress, sellerPrivateKey, dummyUTXO, creatorAddress, feePayToCreator } = params;
    const { keyPair, tweakedSigner, p2pktr } = generateTaprootKeyPair(sellerPrivateKey);
    // add ordinal input into the first input coins with 
    // sighashType: Transaction.SIGHASH_SINGLE | Transaction.SIGHASH_ANYONECANPAY
    psbt.addInput({
        hash: ordinalInput.tx_hash,
        index: ordinalInput.tx_output_n,
        witnessUtxo: { value: ordinalInput.value, script: p2pktr.output },
        tapInternalKey: toXOnly(keyPair.publicKey),
        sighashType: bitcoinjsLib.Transaction.SIGHASH_SINGLE | bitcoinjsLib.Transaction.SIGHASH_ANYONECANPAY,
    });
    if (dummyUTXO !== undefined && dummyUTXO !== null && dummyUTXO.value > 0) {
        psbt.addOutput({
            address: receiverBTCAddress,
            value: amountPayToSeller + dummyUTXO.value,
        });
    }
    else {
        psbt.addOutput({
            address: receiverBTCAddress,
            value: amountPayToSeller,
        });
    }
    // the second input and output
    // add dummy UTXO and output for paying to creator
    if (feePayToCreator > 0 && creatorAddress !== "") {
        psbt.addInput({
            hash: dummyUTXO.tx_hash,
            index: dummyUTXO.tx_output_n,
            witnessUtxo: { value: dummyUTXO.value, script: p2pktr.output },
            tapInternalKey: toXOnly(keyPair.publicKey),
            sighashType: bitcoinjsLib.Transaction.SIGHASH_SINGLE | bitcoinjsLib.Transaction.SIGHASH_ANYONECANPAY,
        });
        psbt.addOutput({
            address: creatorAddress,
            value: feePayToCreator
        });
    }
    // sign tx
    psbt.txInputs.forEach((utxo, index) => {
        psbt.signInput(index, tweakedSigner, [bitcoinjsLib.Transaction.SIGHASH_SINGLE | bitcoinjsLib.Transaction.SIGHASH_ANYONECANPAY]);
        let isValid = true;
        try {
            isValid = psbt.validateSignaturesOfInput(index, ecc.verifySchnorr, tweakedSigner.publicKey);
        }
        catch (e) {
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
const createPSBTToBuy = (params) => {
    const psbt = new bitcoinjsLib.Psbt({ network });
    const { sellerSignedPsbt, buyerPrivateKey, price, receiverInscriptionAddress, valueInscription, paymentUtxos, dummyUtxo, feeRate } = params;
    let totalValue = 0;
    const { keyPair, tweakedSigner, p2pktr, senderAddress: buyerAddress } = generateTaprootKeyPair(buyerPrivateKey);
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
        address: receiverInscriptionAddress,
        value: dummyUtxo.value + valueInscription,
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
            witnessUtxo: { value: utxo.value, script: p2pktr.output },
            tapInternalKey: toXOnly(keyPair.publicKey),
        });
        totalValue += utxo.value;
    }
    let fee = estimateTxFee(psbt.txInputs.length, psbt.txOutputs.length, feeRate);
    let changeValue = totalValue - price - fee;
    if (changeValue >= DummyUTXOValue) {
        // Create a new dummy utxo output for the next purchase
        psbt.addOutput({
            address: buyerAddress,
            value: DummyUTXOValue,
        });
        changeValue -= DummyUTXOValue;
        const extraFee = OutputSize * feeRate;
        if (changeValue >= extraFee) {
            changeValue -= extraFee;
            fee += extraFee;
        }
    }
    if (changeValue < 0) {
        throw new SDKError(ERROR_CODE.NOT_ENOUGH_BTC_TO_SEND);
    }
    // Change utxo
    if (changeValue > 0) {
        if (changeValue >= MinSats) {
            psbt.addOutput({
                address: buyerAddress,
                value: changeValue,
            });
        }
        else {
            fee += changeValue;
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
                const isValid = psbt.validateSignaturesOfInput(index, ecc.verifySchnorr, tweakedSigner.publicKey);
                if (!isValid) {
                    console.log("Tx signature is invalid " + index);
                }
            }
            catch (e) {
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
const reqListForSaleInscription = async (params) => {
    const { sellerPrivateKey, utxos, inscriptions, sellInscriptionID, receiverBTCAddress, feeRatePerByte } = params;
    let { amountPayToSeller, feePayToCreator, creatorAddress, } = params;
    // validation
    if (feePayToCreator > 0 && creatorAddress === "") {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "Creator address must not be empty.");
    }
    if (sellInscriptionID === "") {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "SellInscriptionID must not be empty.");
    }
    if (receiverBTCAddress === "") {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "receiverBTCAddress must not be empty.");
    }
    if (amountPayToSeller === 0) {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "amountPayToSeller must be greater than zero.");
    }
    let needDummyUTXO = false;
    if (feePayToCreator > 0) {
        // creator is the selller
        if (creatorAddress !== receiverBTCAddress) {
            needDummyUTXO = true;
        }
        else {
            // create only one output, don't need to create 2 outputs
            amountPayToSeller += feePayToCreator;
            creatorAddress = "";
            feePayToCreator = 0;
        }
    }
    if (amountPayToSeller < MinSats) {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "amountPayToSeller must not be less than " + fromSat(MinSats) + " BTC.");
    }
    if (feePayToCreator > 0 && feePayToCreator < MinSats) {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "feePayToCreator must not be less than " + fromSat(MinSats) + " BTC.");
    }
    // select inscription UTXO
    const { inscriptionUTXO, inscriptionInfo } = selectInscriptionUTXO(utxos, inscriptions, sellInscriptionID);
    let newInscriptionUTXO = inscriptionUTXO;
    // select dummy UTXO 
    // if there is no dummy UTXO, we have to create and broadcast the tx to split dummy UTXO first
    let dummyUTXORes;
    let selectedUTXOs = [];
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
        }
        catch (e) {
            // create dummy UTXO from inscription UTXO
            const { txID, txHex, newValueInscription } = createTxSplitFundFromOrdinalUTXO(sellerPrivateKey, inscriptionUTXO, inscriptionInfo, DummyUTXOValue, feeRatePerByte);
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
                value: DummyUTXOValue,
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
const reqBuyInscription = async (params) => {
    var _a;
    const { sellerSignedPsbtB64, buyerPrivateKey, receiverInscriptionAddress, price, utxos, inscriptions, feeRatePerByte } = params;
    // decode seller's signed PSBT
    const sellerSignedPsbt = bitcoinjsLib.Psbt.fromBase64(sellerSignedPsbtB64, { network });
    const sellerInputs = sellerSignedPsbt.data.inputs;
    if (sellerInputs.length === 0) {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "Invalid seller's PSBT.");
    }
    const valueInscription = (_a = sellerInputs[0].witnessUtxo) === null || _a === void 0 ? void 0 : _a.value;
    if (valueInscription === undefined || valueInscription === 0) {
        throw new SDKError(ERROR_CODE.INVALID_PARAMS, "Invalid value inscription in seller's PSBT.");
    }
    const newUTXOs = utxos;
    // select or create dummy UTXO
    const { dummyUTXO, splitTxID, selectedUTXOs, newUTXO, fee: feeSplitUTXO, txHex: splitTxRaw } = await createDummyUTXOFromCardinal(buyerPrivateKey, utxos, inscriptions, feeRatePerByte);
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
    }
    else {
        const index = newUTXOs.findIndex((utxo) => utxo.tx_hash === dummyUTXO.tx_hash && utxo.tx_output_n === dummyUTXO.tx_output_n);
        newUTXOs.splice(index, 1);
    }
    if (newUTXO !== undefined && newUTXO !== null) {
        newUTXOs.push(newUTXO);
    }
    console.log("buy newUTXOs: ", newUTXOs);
    // select cardinal UTXOs to payment
    const { numIns, numOuts } = estimateNumInOutputsForBuyInscription(sellerSignedPsbt);
    const estTotalPaymentAmount = price + DummyUTXOValue + estimateTxFee(numIns, numOuts, feeRatePerByte);
    const { selectedUTXOs: paymentUTXOs } = selectCardinalUTXOs(newUTXOs, inscriptions, estTotalPaymentAmount);
    // create PBTS from the seller's one
    const res = createPSBTToBuy({
        sellerSignedPsbt: sellerSignedPsbt,
        buyerPrivateKey: buyerPrivateKey,
        receiverInscriptionAddress: receiverInscriptionAddress,
        valueInscription: valueInscription,
        price: price,
        paymentUtxos: paymentUTXOs,
        dummyUtxo: dummyUTXO,
        feeRate: feeRatePerByte,
    });
    return {
        tx: res.tx,
        txID: res === null || res === void 0 ? void 0 : res.txID,
        txHex: res === null || res === void 0 ? void 0 : res.txHex,
        fee: (res === null || res === void 0 ? void 0 : res.fee) + feeSplitUTXO,
        selectedUTXOs: [...paymentUTXOs, dummyUTXO],
        splitTxID,
        splitUTXOs: [...selectedUTXOs],
        splitTxRaw: splitTxRaw,
    };
};

exports.BlockStreamURL = BlockStreamURL;
exports.DummyUTXOValue = DummyUTXOValue;
exports.ECPair = ECPair;
exports.InputSize = InputSize;
exports.MinSats = MinSats;
exports.OutputSize = OutputSize;
exports.broadcastTx = broadcastTx;
exports.convertPrivateKey = convertPrivateKey;
exports.convertPrivateKeyFromStr = convertPrivateKeyFromStr;
exports.createDummyUTXOFromCardinal = createDummyUTXOFromCardinal;
exports.createPSBTToBuy = createPSBTToBuy;
exports.createPSBTToSell = createPSBTToSell;
exports.createTx = createTx;
exports.createTxSplitFundFromOrdinalUTXO = createTxSplitFundFromOrdinalUTXO;
exports.createTxWithSpecificUTXOs = createTxWithSpecificUTXOs;
exports.decryptWallet = decryptWallet;
exports.derivePasswordWallet = derivePasswordWallet;
exports.encryptWallet = encryptWallet;
exports.estimateNumInOutputs = estimateNumInOutputs;
exports.estimateNumInOutputsForBuyInscription = estimateNumInOutputsForBuyInscription;
exports.estimateTxFee = estimateTxFee;
exports.fromSat = fromSat;
exports.generateTaprootAddress = generateTaprootAddress;
exports.generateTaprootKeyPair = generateTaprootKeyPair;
exports.getBTCBalance = getBTCBalance;
exports.importBTCPrivateKey = importBTCPrivateKey;
exports.network = network;
exports.reqBuyInscription = reqBuyInscription;
exports.reqListForSaleInscription = reqListForSaleInscription;
exports.selectCardinalUTXOs = selectCardinalUTXOs;
exports.selectInscriptionUTXO = selectInscriptionUTXO;
exports.selectTheSmallestUTXO = selectTheSmallestUTXO;
exports.selectUTXOs = selectUTXOs;
exports.tapTweakHash = tapTweakHash;
exports.toXOnly = toXOnly;
exports.tweakSigner = tweakSigner;
//# sourceMappingURL=index.js.map
