import {
    networks,
    payments,
    Psbt
} from "bitcoinjs-lib";
import axios, { AxiosResponse } from "axios";
import { Inscription, UTXO } from "./types";
import { BlockStreamURL, MinSatInscription } from "./constants";
import {
    toXOnly,
    tweakSigner,
    ECPair,
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
    sendAmount: number,
    feeRatePerByte: number,
    isUseInscriptionPayFee: boolean,
): { selectedUTXOs: UTXO[], isUseInscriptionPayFee: boolean, valueOutInscription: number, changeAmount: number, fee: number } => {
    const resultUTXOs: UTXO[] = [];
    let normalUTXOs: UTXO[] = [];
    let inscriptionUTXO: any = null;
    let inscriptionInfo: any = null;
    let valueOutInscription = 0;
    let changeAmount = 0;
    let maxAmountInsTransfer = 0;

    // validation
    if (sendInscriptionID !== "" && sendAmount > 0) {
        throw new Error("Don't support send BTC while sending inscription");
    }

    if (sendInscriptionID === "" && sendAmount === 0) {
        throw new Error("Payment info is empty");
    }

    if (sendInscriptionID !== "") {
        isUseInscriptionPayFee = true;
    } else {
        isUseInscriptionPayFee = false;
    }

    // convert feeRate to interger
    feeRatePerByte = Math.round(feeRatePerByte);

    // estimate fee
    const { numIns, numOuts } = estimateNumInOutputs(sendInscriptionID, sendAmount, isUseInscriptionPayFee);
    const estFee: number = estimateTxFee(numIns, numOuts, feeRatePerByte);

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
                    maxAmountInsTransfer = inscriptionUTXO.value - inscriptionInfo.offset - 1 ;
                    console.log("maxAmountInsTransfer ", maxAmountInsTransfer);
                }
            }
        }
    });

    if (sendInscriptionID !== "") {
        if (inscriptionUTXO === null || inscriptionInfo == null) {
            throw new Error("Can not find inscription UTXO for sendInscriptionID");
        }
        if (isUseInscriptionPayFee) {
            if (maxAmountInsTransfer < estFee ) {
                throw new Error("Value in the inscription is not enough to pay fee");
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
                const utxo = normalUTXOs[i];
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
    const { numOuts: reNumOuts } = estimateNumInOutputs(sendInscriptionID, sendAmount, isUseInscriptionPayFee);
    let fee: number = estimateTxFee(resultUTXOs.length, reNumOuts, feeRatePerByte);

    // calculate output amount
    if (isUseInscriptionPayFee) {
        if (maxAmountInsTransfer < fee ) {
            fee = maxAmountInsTransfer;
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
const createTx = (
    senderPrivateKey: Buffer,
    utxos: UTXO[],
    inscriptions: { [key: string]: Inscription[] },
    sendInscriptionID = "",
    receiverInsAddress: string,
    sendAmount: number,
    feeRatePerByte: number,
    isUseInscriptionPayFeeParam = true,  // default is true
): { txID: string, txHex: string, fee: number } => {
    const network = networks.bitcoin;  // mainnet

    // select UTXOs
    const { selectedUTXOs, valueOutInscription, changeAmount, fee } = selectUTXOs(utxos, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);
    console.log("selectedUTXOs: ", selectedUTXOs);

    // init key pair from senderPrivateKey
    const keypair = ECPair.fromPrivateKey(senderPrivateKey);
    // Tweak the original keypair
    const tweakedSigner = tweakSigner(keypair, { network });

    // Generate an address from the tweaked public key
    const p2pktr = payments.p2tr({
        pubkey: toXOnly(tweakedSigner.publicKey),
        network
    });
    const senderAddress = p2pktr.address ? p2pktr.address : "";
    if (senderAddress === "") {
        throw new Error("Can not get sender address from private key");
    }

    const psbt = new Psbt({ network });
    // add inputs
    selectedUTXOs.forEach((input) => {
        psbt.addInput({
            hash: input.tx_hash,
            index: input.tx_output_n,
            witnessUtxo: { value: input.value, script: p2pktr.output as Buffer },
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

const broadcastTx = async (txHex: string): Promise<string> => {
    const blockstream = new axios.Axios({
        baseURL: BlockStreamURL
    });
    const response: AxiosResponse<string> = await blockstream.post("/tx", txHex);
    return response.data;
};

export {
    selectUTXOs,
    createTx,
    broadcastTx,
};