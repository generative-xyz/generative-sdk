interface UTXO {
    tx_hash: string;
    tx_output_n: number;
    value: number;
}

// key : "TxID:OutcoinIndex" : Inscription[]
interface Inscription {
    offset: number,
    id: string,
}

interface ICreateTxResp {
    txID: string,
    txHex: string,
    fee: number,
    selectedUTXOs: UTXO[],
    changeAmount: number,
}

interface ICreateTxSplitInscriptionResp {
    txID: string,
    txHex: string,
    fee: number,
    selectedUTXOs: UTXO[]
    newValueInscription: number,
}

export {
    UTXO,
    Inscription,
    ICreateTxResp,
    ICreateTxSplitInscriptionResp,
};