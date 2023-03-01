interface UTXO {
    tx_hash: string;
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
export { UTXO, Inscription, ICreateTxResp };
