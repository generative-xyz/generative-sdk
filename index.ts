import ecc from "@bitcoinerlab/secp256k1";
const wif = require('wif');
import {
    networks,
    payments,
    Psbt,
    initEccLib,
    Signer,
    crypto
} from "bitcoinjs-lib";
import axios, { AxiosResponse } from "axios";
import { ECPairFactory, ECPairAPI } from "ecpair";

initEccLib(ecc as any);
const ECPair: ECPairAPI = ECPairFactory(ecc);

const BlockStreamURL = "https://blockstream.info/api";
const MinSatInscription = 10;

interface UTXO {
    tx_hash: string;
    block_height: number;
    tx_input_n: number;
    tx_output_n: number;
    value: number;
    // RefBalance    int       `json:"ref_balance"`
    // Spent         bool      `json:"spent"`
    // Confirmations int       `json:"confirmations"`
    // Confirmed     time.Time `json:"confirmed"`
    // DoubleSpend   bool      `json:"double_spend"`
}

// key : "TxID:OutcoinIndex" : Inscription[]
interface Inscription {
    offset: number,
    id: string,
}


/**
 * convertPrivateKey converts buffer private key to WIF private key string
 * @param bytes buffer private key
 * @returns the WIF private key string
 */
const convertPrivateKey = (bytes: Buffer) : string => {
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
    let numOuts: number = 0;
    let numIns: number = 0;
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

function tweakSigner(signer: Signer, opts: any = {}): Signer {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let privateKey: Uint8Array | undefined = signer.privateKey!;
    if (!privateKey) {
        throw new Error('Private key is required for tweaking signer!');
    }
    if (signer.publicKey[0] === 3) {
        privateKey = ecc.privateNegate(privateKey);
    }

    const tweakedPrivateKey = ecc.privateAdd(
        privateKey,
        tapTweakHash(toXOnly(signer.publicKey), opts.tweakHash),
    );
    if (!tweakedPrivateKey) {
        throw new Error('Invalid tweaked private key!');
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
    let resultUTXOs: UTXO[] = [];
    let normalUTXOs: UTXO[] = [];
    let inscriptionUTXO: any = null;
    let inscriptionInfo: any = null;
    let valueOutInscription: number = 0;
    let changeAmount: number = 0;

    // estimate fee
    let { numIns, numOuts } = estimateNumInOutputs(sendInscriptionID, sendAmount, isUseInscriptionPayFee);
    let estFee: number = estimateTxFee(numIns, numOuts, feeRatePerByte);

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
        } else {
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
            } else {
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

    let totalInputAmount: number = 0;
    if (totalSendAmount > 0) {
        if (normalUTXOs.length === 0) {
            throw new Error("Insuffient BTC balance to send");
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

        console.log("normalUTXOs: ", normalUTXOs);

        if (normalUTXOs[normalUTXOs.length - 1].value >= totalSendAmount) {
            // select the smallest utxo
            resultUTXOs.push(normalUTXOs[normalUTXOs.length - 1]);
            totalInputAmount = normalUTXOs[normalUTXOs.length - 1].value;
        } else if (normalUTXOs[0].value < totalSendAmount) {
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
    let { numOuts: reNumOuts } = estimateNumInOutputs(sendInscriptionID, sendAmount, isUseInscriptionPayFee)
    let fee: number = estimateTxFee(resultUTXOs.length, reNumOuts, feeRatePerByte);

    // calculate output amount
    if (isUseInscriptionPayFee) {
        if (inscriptionUTXO.value < fee + MinSatInscription) {
            fee = inscriptionUTXO.value - MinSatInscription;
        }
        valueOutInscription = inscriptionUTXO.value - fee;
        changeAmount = totalInputAmount - sendAmount;
    } else {
        if (totalInputAmount < sendAmount + fee) {
            fee = totalInputAmount - sendAmount;
        }
        valueOutInscription = inscriptionUTXO?.value || 0;
        changeAmount = totalInputAmount - sendAmount - fee;
    }

    return { selectedUTXOs: resultUTXOs, isUseInscriptionPayFee: isUseInscriptionPayFee, valueOutInscription: valueOutInscription, changeAmount: changeAmount, fee: fee };
}


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
const createTx = (
    senderPrivateKey: Buffer,
    utxos: UTXO[],
    inscriptions: { [key: string]: Inscription[] },
    sendInscriptionID: string = "",
    receiverInsAddress: string,
    sendAmount: number,
    feeRatePerByte: number,
    isUseInscriptionPayFeeParam: boolean = true,  // default is true
): { txID: string, txHex: string, fee: number } => {
    let network = networks.bitcoin;  // mainnet

    // select UTXOs
    let { selectedUTXOs, valueOutInscription, changeAmount, fee } = selectUTXOs(utxos, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);
    console.log("selectedUTXOs: ", selectedUTXOs);

    // init key pair from senderPrivateKey
    let keypair = ECPair.fromPrivateKey(senderPrivateKey);
    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network });

    // Generate an address from the tweaked public key
    const p2pktr = payments.p2tr({
        pubkey: toXOnly(tweakedSigner.publicKey),
        network
    });
    const senderAddress = p2pktr.address ? p2pktr.address : "";
    console.log("senderAddress ", senderAddress);
    if (senderAddress === "") {
        throw new Error("Can not get sender address from private key");
    }

    const psbt = new Psbt({ network });
    // add inputs
    selectedUTXOs.forEach((input) => {
        psbt.addInput({
            hash: input.tx_hash,
            index: input.tx_output_n,
            witnessUtxo: { value: input.value, script: p2pktr.output! },
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
}

const broadcastTx = async (txHex: string): Promise<string> => {
    const blockstream = new axios.Axios({
        baseURL: BlockStreamURL
    });
    const response: AxiosResponse<string> = await blockstream.post("/tx", txHex);
    return response.data;
}

export {
    convertPrivateKey,
    createTx,
    broadcastTx,
    UTXO,
    selectUTXOs
}