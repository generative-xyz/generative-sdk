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
export { UTXO, Inscription, ICreateTxResp };
