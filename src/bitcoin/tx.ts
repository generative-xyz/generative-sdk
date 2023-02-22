import {
    initEccLib,
    networks,
    script,
    Signer,
    payments,
    crypto,
    Psbt
} from "bitcoinjs-lib";
import { ECPairFactory, ECPairAPI, TinySecp256k1Interface } from "ecpair";
const tinysecp: TinySecp256k1Interface = require('tiny-secp256k1');
initEccLib(tinysecp as any);
const ECPair: ECPairAPI = ECPairFactory(tinysecp);
import axios, { AxiosResponse } from "axios";
import { Inscription, UTXO } from "./types";
import { BlockStreamURL } from "./constants";


const selectUTXOs = (
    utxos: UTXO[],
    inscriptions: { [key: string]: Inscription[] },
    sendInscriptionID: string,
    sendAmount: number,
    fee: number,
    isUseInscriptionPayFee: boolean,
): { selectedUTXOs: UTXO[], isUseInscriptionPayFee: boolean, valueOutInscription: number, changeAmount: number } => {
    let resultUTXOs: UTXO[] = [];
    let normalUTXOs: UTXO[] = [];
    let inscriptionUTXO: any = null;
    let inscriptionInfo: any = null;
    let valueOutInscription: number = 0;
    let changeAmount: number = 0;

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
                if (inscriptionUTXO.value <= fee) {
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
        totalSendAmount += fee;
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

    // calculate output amount
    if (isUseInscriptionPayFee) {
        valueOutInscription = inscriptionUTXO.value - fee;
        changeAmount = totalInputAmount - sendAmount;
    } else {
        valueOutInscription = inscriptionUTXO.value;
        changeAmount = totalInputAmount - sendAmount - fee;
    }

    return { selectedUTXOs: resultUTXOs, isUseInscriptionPayFee: isUseInscriptionPayFee, valueOutInscription: valueOutInscription, changeAmount: changeAmount };
}

const createTxFromTaprootAddress = (
    senderPrivateKey: Buffer,
    senderAddress: string,
    utxos: UTXO[],
    inscriptions: { [key: string]: Inscription[] },
    sendInscriptionID: string,
    addressReceiver: string,
    sendAmount: number,
    isUseInscriptionPayFeeParam: boolean = true,  // default is true
): string => {
    let network = networks.bitcoin;  // mainnet
    let fee = 1000; // TODO:
    
    // select UTXOs
    let { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount } = selectUTXOs(utxos, inscriptions, sendInscriptionID, sendAmount, fee, isUseInscriptionPayFeeParam)

    // init key pair from senderPrivateKey
    let keypair = ECPair.fromPrivateKey(senderPrivateKey)
    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network });

    // Generate an address from the tweaked public key
    const p2pktr = payments.p2tr({
        pubkey: toXOnly(tweakedSigner.publicKey),
        network
    });

    // console.log("p2pktr.address: ", p2pktr.address);

    const psbt = new Psbt({ network });

    console.log("selectedUTXOs: ", selectedUTXOs);

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
            address: addressReceiver,
            value: valueOutInscription,
        });
    }
    // add output send BTC
    if (sendAmount > 0) {
        psbt.addOutput({
            address: addressReceiver,
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
    console.log(`Transaction Hex: ${txHex}`);
    return txHex;
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
        privateKey = tinysecp.privateNegate(privateKey);
    }

    const tweakedPrivateKey = tinysecp.privateAdd(
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

const broadcastTx = async (hexTx: string): Promise<string> => {
    const blockstream = new axios.Axios({
        baseURL: BlockStreamURL
    });
    const response: AxiosResponse<string> = await blockstream.post("/tx", hexTx);
    return response.data;
}


export {
    createTxFromTaprootAddress,
    broadcastTx,
}