import { Inscription, UTXO } from "./types";
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
}, sendInscriptionID: string | undefined, receiverInsAddress: string, sendAmount: number, feeRatePerByte: number, isUseInscriptionPayFeeParam?: boolean) => {
    txID: string;
    txHex: string;
    fee: number;
};
declare const broadcastTx: (txHex: string) => Promise<string>;
export { selectUTXOs, createTx, broadcastTx, };
