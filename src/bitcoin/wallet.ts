import { Inscription, UTXO } from "./types";

const getBTCBalance = (
    params: {
        utxos: UTXO[],
        inscriptions: { [key: string]: Inscription[] },
    }
): number => {
    const normalUTXOs: UTXO[] = [];
    let btcBalance = 0;
    
    const {utxos, inscriptions} = params;

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
            btcBalance+= utxo.value;
        }
    });

    return btcBalance;
};

export {
    getBTCBalance,
};