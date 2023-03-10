import { Inscription, UTXO } from "./types";
import { Psbt } from "bitcoinjs-lib";
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
declare const selectInscriptionUTXO: (utxos: UTXO[], inscriptions: {
    [key: string]: Inscription[];
}, inscriptionID: string) => {
    inscriptionUTXO: UTXO;
    inscriptionInfo: Inscription;
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
declare const selectCardinalUTXOs: (utxos: UTXO[], inscriptions: {
    [key: string]: Inscription[];
}, sendAmount: number) => {
    selectedUTXOs: UTXO[];
    remainUTXOs: UTXO[];
    totalInputAmount: number;
};
declare const selectUTXOsToCreateBuyTx: (params: {
    sellerSignedPsbt: Psbt;
    price: number;
    utxos: UTXO[];
    inscriptions: {
        [key: string]: Inscription[];
    };
    feeRate: number;
}) => {
    selectedUTXOs: UTXO[];
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
declare const selectTheSmallestUTXO: (utxos: UTXO[], inscriptions: {
    [key: string]: Inscription[];
}) => UTXO;
export { selectUTXOs, selectInscriptionUTXO, selectCardinalUTXOs, selectTheSmallestUTXO, selectUTXOsToCreateBuyTx, };
