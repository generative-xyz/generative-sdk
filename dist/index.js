"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectUTXOs = exports.broadcastTx = exports.createTx = exports.convertPrivateKey = void 0;
const secp256k1_1 = __importDefault(require("@bitcoinerlab/secp256k1"));
const wif = require('wif');
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const axios_1 = __importDefault(require("axios"));
const ecpair_1 = require("ecpair");
(0, bitcoinjs_lib_1.initEccLib)(secp256k1_1.default);
const ECPair = (0, ecpair_1.ECPairFactory)(secp256k1_1.default);
const BlockStreamURL = "https://blockstream.info/api";
const MinSatInscription = 10;
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
function toXOnly(pubkey) {
    return pubkey.subarray(1, 33);
}
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
function tapTweakHash(pubKey, h) {
    return bitcoinjs_lib_1.crypto.taggedHash("TapTweak", Buffer.concat(h ? [pubKey, h] : [pubKey]));
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
    let resultUTXOs = [];
    let normalUTXOs = [];
    let inscriptionUTXO = null;
    let inscriptionInfo = null;
    let valueOutInscription = 0;
    let changeAmount = 0;
    // estimate fee
    let { numIns, numOuts } = estimateNumInOutputs(sendInscriptionID, sendAmount, isUseInscriptionPayFee);
    let estFee = estimateTxFee(numIns, numOuts, feeRatePerByte);
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
        let inscriptionInfos = inscriptions[txIDKey];
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
                }
            }
        }
    });
    if (sendInscriptionID !== "") {
        if (inscriptionUTXO === null || inscriptionInfo == null) {
            throw new Error("Can not find inscription UTXO for sendInscriptionID");
        }
        if (isUseInscriptionPayFee) {
            // if offset is 0: SHOULD use inscription to pay fee
            // otherwise, MUST use normal UTXOs to pay fee
            if (inscriptionInfo.offset !== 0) {
                isUseInscriptionPayFee = false;
            }
            else {
                // if value is not enough to pay fee, MUST use normal UTXOs to pay fee
                if (inscriptionUTXO.value < estFee + MinSatInscription) {
                    isUseInscriptionPayFee = false;
                }
            }
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
            throw new Error("Insuffient BTC balance to send");
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
                let utxo = normalUTXOs[i];
                resultUTXOs.push(utxo);
                totalInputAmount += utxo.value;
                if (totalInputAmount >= totalSendAmount) {
                    break;
                }
            }
            if (totalInputAmount < totalSendAmount) {
                throw new Error("Insuffient BTC balance to send");
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
    let { numOuts: reNumOuts } = estimateNumInOutputs(sendInscriptionID, sendAmount, isUseInscriptionPayFee);
    let fee = estimateTxFee(resultUTXOs.length, reNumOuts, feeRatePerByte);
    // calculate output amount
    if (isUseInscriptionPayFee) {
        if (inscriptionUTXO.value < fee + MinSatInscription) {
            fee = inscriptionUTXO.value - MinSatInscription;
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
exports.selectUTXOs = selectUTXOs;
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
    let network = bitcoinjs_lib_1.networks.bitcoin; // mainnet
    // select UTXOs
    let { selectedUTXOs, valueOutInscription, changeAmount, fee } = selectUTXOs(utxos, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);
    console.log("selectedUTXOs: ", selectedUTXOs);
    // init key pair from senderPrivateKey
    let keypair = ECPair.fromPrivateKey(senderPrivateKey);
    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network });
    // Generate an address from the tweaked public key
    const p2pktr = bitcoinjs_lib_1.payments.p2tr({
        pubkey: toXOnly(tweakedSigner.publicKey),
        network
    });
    const senderAddress = p2pktr.address ? p2pktr.address : "";
    console.log("senderAddress ", senderAddress);
    if (senderAddress === "") {
        throw new Error("Can not get sender address from private key");
    }
    const psbt = new bitcoinjs_lib_1.Psbt({ network });
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
    let tx = psbt.extractTransaction();
    console.log("Transaction : ", tx);
    let txHex = tx.toHex();
    console.log("Transaction Hex:", txHex);
    return { txID: tx.getId(), txHex, fee };
};
exports.createTx = createTx;
const broadcastTx = (txHex) => __awaiter(void 0, void 0, void 0, function* () {
    const blockstream = new axios_1.default.Axios({
        baseURL: BlockStreamURL
    });
    const response = yield blockstream.post("/tx", txHex);
    return response.data;
});
exports.broadcastTx = broadcastTx;
