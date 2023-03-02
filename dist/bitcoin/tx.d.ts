import { ICreateTxResp, Inscription, UTXO, ICreateTxSplitInscriptionResp } from "./types";
import { selectUTXOs } from "./selectcoin";
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
declare const createTxWithSpecificUTXOs: (senderPrivateKey: Buffer, utxos: UTXO[], sendInscriptionID: string | undefined, receiverInsAddress: string, sendAmount: number, valueOutInscription: number, changeAmount: number, fee: number) => {
    txID: string;
    txHex: string;
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
declare const createTxSplitFundFromOrdinalUTXO: (senderPrivateKey: Buffer, inscriptionUTXO: UTXO, inscriptionInfo: Inscription, sendAmount: number, feeRatePerByte: number) => ICreateTxSplitInscriptionResp;
declare const createDummyUTXOFromCardinal: (senderPrivateKey: Buffer, utxos: UTXO[], inscriptions: {
    [key: string]: Inscription[];
}, feeRatePerByte: number) => Promise<{
    dummyUTXO: UTXO;
    splitTxID: string;
    selectedUTXOs: UTXO[];
    newUTXO: any;
    fee: number;
}>;
declare const broadcastTx: (txHex: string) => Promise<string>;
export { selectUTXOs, createTx, broadcastTx, createTxWithSpecificUTXOs, createTxSplitFundFromOrdinalUTXO, createDummyUTXOFromCardinal, };
