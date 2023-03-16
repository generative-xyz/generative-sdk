import { BNZero } from "./constants";
import { Inscription, UTXO } from "./types";
import BigNumber from "bignumber.js";

const getBTCBalance = (
    params: {
        utxos: UTXO[],
        inscriptions: { [key: string]: Inscription[] },
    }
): BigNumber => {
    const normalUTXOs: UTXO[] = [];
    let btcBalance = BNZero;

    const { utxos, inscriptions } = params;

    // filter normal UTXO and inscription UTXO to send
    utxos.forEach(utxo => {
        // txIDKey = tx_hash:tx_output_n
        let txIDKey = utxo.tx_hash.concat(":");
        txIDKey = txIDKey.concat(utxo.tx_output_n.toString());

        // try to get inscriptionInfos
        const inscriptionInfos = inscriptions[txIDKey];

        if (inscriptionInfos === undefined || inscriptionInfos === null || inscriptionInfos.length == 0) {
            // normal UTXO
            normalUTXOs.push(utxo);
            btcBalance = btcBalance.plus(utxo.value);
        }
    });

    return btcBalance;
};

export {
    getBTCBalance,
};