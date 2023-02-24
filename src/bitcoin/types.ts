interface UTXO {
    tx_hash: string;
    block_height: number;
    tx_input_n: number;
    tx_output_n: number;
    value: number;
    // RefBalance    int       `json:"ref_balance"`
    // Spent         bool      `json:"spent"`
    // Confirmations int       `json:"confirmations"`
    // Confirmed     time.Time `json:"confirmed"`
    // DoubleSpend   bool      `json:"double_spend"`
}

// key : "TxID:OutcoinIndex" : Inscription[]
interface Inscription {
    offset: number,
    id: string,
}

export {
    UTXO,
    Inscription
};