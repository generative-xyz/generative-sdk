"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAddress = exports.ECPair = exports.tapTweakHash = exports.tweakSigner = exports.toXOnly = exports.estimateNumInOutputs = exports.estimateTxFee = exports.convertPrivateKey = void 0;
var wif = require('wif');
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const ecpair_1 = require("ecpair");
// const tinysecp: TinySecp256k1Interface = require('tiny-secp256k1');
const secp256k1_1 = __importDefault(require("@bitcoinerlab/secp256k1"));
(0, bitcoinjs_lib_1.initEccLib)(secp256k1_1.default);
const ECPair = (0, ecpair_1.ECPairFactory)(secp256k1_1.default);
exports.ECPair = ECPair;
/**
* convertPrivateKey converts buffer private key to WIF private key string
* @param bytes buffer private key
* @returns the WIF private key string
*/
const convertPrivateKey = (bytes) => {
    return wif.encode(128, bytes, true);
};
exports.convertPrivateKey = convertPrivateKey;
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
exports.estimateTxFee = estimateTxFee;
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
        if (!isUseInscriptionPayFee) {
            numOuts++; // for change BTC output
        }
    }
    if (sendAmount > 0) {
        numOuts++;
    }
    if (sendAmount > 0 || !isUseInscriptionPayFee) {
        numIns++;
    }
    return { numIns, numOuts };
};
exports.estimateNumInOutputs = estimateNumInOutputs;
function toXOnly(pubkey) {
    return pubkey.subarray(1, 33);
}
exports.toXOnly = toXOnly;
function tweakSigner(signer, opts = {}) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let privateKey = signer.privateKey;
    if (!privateKey) {
        throw new Error('Private key is required for tweaking signer!');
    }
    if (signer.publicKey[0] === 3) {
        privateKey = secp256k1_1.default.privateNegate(privateKey);
    }
    const tweakedPrivateKey = secp256k1_1.default.privateAdd(privateKey, tapTweakHash(toXOnly(signer.publicKey), opts.tweakHash));
    if (!tweakedPrivateKey) {
        throw new Error('Invalid tweaked private key!');
    }
    return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
        network: opts.network,
    });
}
exports.tweakSigner = tweakSigner;
function tapTweakHash(pubKey, h) {
    return bitcoinjs_lib_1.crypto.taggedHash("TapTweak", Buffer.concat(h ? [pubKey, h] : [pubKey]));
}
exports.tapTweakHash = tapTweakHash;
const generateAddress = (privateKey) => {
    const keyPair = ECPair.fromPrivateKey(privateKey);
    const internalPubkey = toXOnly(keyPair.publicKey);
    const { address, output } = bitcoinjs_lib_1.payments.p2tr({
        internalPubkey,
    });
    console.log("address, output", address, output);
    console.log("internalPubkey ", keyPair.publicKey);
};
exports.generateAddress = generateAddress;
