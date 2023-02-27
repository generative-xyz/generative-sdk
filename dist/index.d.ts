/// <reference types="node" />
import { Signer } from 'bitcoinjs-lib';
import { ECPairAPI } from 'ecpair';

declare const BlockStreamURL = "https://blockstream.info/api";
declare const MinSatInscription = 3000;

interface UTXO {
    tx_hash: string;
    block_height: number;
    tx_input_n: number;
    tx_output_n: number;
    value: number;
}
interface Inscription {
    offset: number;
    id: string;
}
interface ICreateTxResp {
    txID: string;
    txHex: string;
    fee: number;
    selectedUTXOs: UTXO[];
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
declare const selectUTXOs: (utxos: UTXO[], inscriptions: {
    [key: string]: Inscription[];
}, sendInscriptionID: string, sendAmount: number, feeRatePerByte: number, isUseInscriptionPayFee: boolean) => {
    selectedUTXOs: UTXO[];
    isUseInscriptionPayFee: boolean;
    valueOutInscription: number;
    changeAmount: number;
    fee: number;
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
declare const createTx: (senderPrivateKey: Buffer, utxos: UTXO[], inscriptions: {
    [key: string]: Inscription[];
}, sendInscriptionID: string | undefined, receiverInsAddress: string, sendAmount: number, feeRatePerByte: number, isUseInscriptionPayFeeParam?: boolean) => ICreateTxResp;
declare const broadcastTx: (txHex: string) => Promise<string>;

declare const ECPair: ECPairAPI;
/**
* convertPrivateKey converts buffer private key to WIF private key string
* @param bytes buffer private key
* @returns the WIF private key string
*/
declare const convertPrivateKey: (bytes: Buffer) => string;
/**
* estimateTxFee estimates the transaction fee
* @param numIns number of inputs in the transaction
* @param numOuts number of outputs in the transaction
* @param feeRatePerByte fee rate per byte (in satoshi)
* @returns returns the estimated transaction fee in satoshi
*/
declare const estimateTxFee: (numIns: number, numOuts: number, feeRatePerByte: number) => number;
/**
* estimateNumInOutputs estimates number of inputs and outputs by parameters:
* @param inscriptionID id of inscription to send (if any)
* @param sendAmount satoshi amount need to send
* @param isUseInscriptionPayFee use inscription output coin to pay fee or not
* @returns returns the estimated number of inputs and outputs in the transaction
*/
declare const estimateNumInOutputs: (inscriptionID: string, sendAmount: number, isUseInscriptionPayFee: boolean) => {
    numIns: number;
    numOuts: number;
};
declare function toXOnly(pubkey: Buffer): Buffer;
declare function tweakSigner(signer: Signer, opts?: any): Signer;
declare function tapTweakHash(pubKey: Buffer, h: Buffer | undefined): Buffer;
declare const generateTaprootAddress: (privateKey: Buffer) => string;

declare const getBTCBalance: (params: {
    utxos: UTXO[];
    inscriptions: {
        [key: string]: Inscription[];
    };
}) => number;

export { BlockStreamURL, ECPair, ICreateTxResp, Inscription, MinSatInscription, UTXO, broadcastTx, convertPrivateKey, createTx, estimateNumInOutputs, estimateTxFee, generateTaprootAddress, getBTCBalance, selectUTXOs, tapTweakHash, toXOnly, tweakSigner };
