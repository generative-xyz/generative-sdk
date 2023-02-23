const {
    initEccLib,
    crypto,
    payments,
} = require("../bitcoinjs-lib");
import { ECPairFactory, ECPairAPI } from "ecpair";
import * as ecc from "@bitcoinerlab/secp256k1";

initEccLib(ecc);
const ECPair: ECPairAPI = ECPairFactory(ecc);
const wif = require("wif");


/**
* convertPrivateKey converts buffer private key to WIF private key string
* @param bytes buffer private key
* @returns the WIF private key string
*/
const convertPrivateKey = (bytes: Buffer): string => {
    return wif.encode(128, bytes, true);
}

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
}

/**
* estimateNumInOutputs estimates number of inputs and outputs by parameters: 
* @param inscriptionID id of inscription to send (if any)
* @param sendAmount satoshi amount need to send 
* @param isUseInscriptionPayFee use inscription output coin to pay fee or not
* @returns returns the estimated number of inputs and outputs in the transaction
*/
const estimateNumInOutputs = (inscriptionID: string, sendAmount: number, isUseInscriptionPayFee: boolean): { numIns: number, numOuts: number } => {
    let numOuts = 0;
    let numIns = 0;
    if (inscriptionID !== "") {
        numOuts++;
        numIns++;
        if (!isUseInscriptionPayFee) {
            numOuts++;  // for change BTC output
        }
    }
    if (sendAmount > 0) {
        numOuts++;
    }

    if (sendAmount > 0 || !isUseInscriptionPayFee) {
        numIns++;
    }
    return { numIns, numOuts };
}

function toXOnly(pubkey: Buffer): Buffer {
    return pubkey.subarray(1, 33)
}

function tweakSigner(signer: any, opts: any = {}): any {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let privateKey: Uint8Array | undefined = signer.privateKey!;
    if (!privateKey) {
        throw new Error("Private key is required for tweaking signer!");
    }
    if (signer.publicKey[0] === 3) {
        privateKey = ecc.privateNegate(privateKey);
    }

    const tweakedPrivateKey = ecc.privateAdd(
        privateKey,
        tapTweakHash(toXOnly(signer.publicKey), opts.tweakHash),
    );

    if (!tweakedPrivateKey) {
        throw new Error("Invalid tweaked private key!");
    }

    return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
        network: opts.network,
    });
}

function tapTweakHash(pubKey: Buffer, h: Buffer | undefined): Buffer {
    return crypto.taggedHash(
        "TapTweak",
        Buffer.concat(h ? [pubKey, h] : [pubKey]),
    );
}

const generateTaprootAddress = (privateKey: Buffer): string => {
    const keyPair = ECPair.fromPrivateKey(privateKey);
    const internalPubkey = toXOnly(keyPair.publicKey);

    const { address, output } = payments.p2tr({
        internalPubkey,
    });

    return address ? address : "";
}

export {
    convertPrivateKey,
    estimateTxFee,
    estimateNumInOutputs,
    toXOnly,
    tweakSigner,
    tapTweakHash,
    ECPair,
    generateTaprootAddress,
}