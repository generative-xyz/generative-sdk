import { Transaction } from "bitcoinjs-lib";
import BigNumber from "bignumber.js";

interface UTXO {
    tx_hash: string;
    tx_output_n: number;
    value: BigNumber;
}

// key : "TxID:OutcoinIndex" : Inscription[]
interface Inscription {
    offset: BigNumber,
    id: string,
}

interface ICreateTxResp {
    tx: Transaction,
    txID: string,
    txHex: string,
    fee: BigNumber,
    selectedUTXOs: UTXO[],
    changeAmount: BigNumber,
}

interface ICreateTxBuyResp {
    tx: Transaction,
    txID: string,
    txHex: string,
    fee: BigNumber,
    selectedUTXOs: UTXO[],
    splitTxID: string,
    splitUTXOs: UTXO[],
    splitTxRaw: string,
}

interface ICreateTxSellResp {
    base64Psbt: string,
    selectedUTXOs: UTXO[],
    splitTxID: string,
    splitUTXOs: UTXO[],
    splitTxRaw: string,
}

interface ICreateTxSplitInscriptionResp {
    txID: string,
    txHex: string,
    fee: BigNumber,
    selectedUTXOs: UTXO[]
    newValueInscription: BigNumber,
}

export {
    UTXO,
    Inscription,
    ICreateTxResp,
    ICreateTxSplitInscriptionResp,
    ICreateTxBuyResp,
    ICreateTxSellResp,
};