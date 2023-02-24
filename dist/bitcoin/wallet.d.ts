import { Inscription, UTXO } from "./types";
declare const getBTCBalance: (params: {
    utxos: UTXO[];
    inscriptions: {
        [key: string]: Inscription[];
    };
}) => number;
export { getBTCBalance, };
