import { Inscription, UTXO } from "./types";
import BigNumber from "bignumber.js";
declare const getBTCBalance: (params: {
    utxos: UTXO[];
    inscriptions: {
        [key: string]: Inscription[];
    };
}) => BigNumber;
export { getBTCBalance, };
