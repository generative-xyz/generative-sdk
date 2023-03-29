import { Inscription, UTXO } from "..";
import { payments } from "bitcoinjs-lib";
import { Tapleaf } from "bitcoinjs-lib/src/types";
import { ECPairInterface } from "ecpair";
declare function generateInscribeContent(protocolID: string, reimbursementAddr: string, datas: string[]): string;
declare const createRawCommitTx: ({ internalPubKey, data, utxos, feeRatePerByte, reImbursementTCAddress, hashLockKeyPair, hashLockRedeem, hashLockScript, script_p2tr, revealVByte, }: {
    internalPubKey: Buffer;
    data: string[];
    utxos: UTXO[];
    feeRatePerByte: number;
    reImbursementTCAddress: string;
    hashLockKeyPair: ECPairInterface;
    hashLockRedeem: Tapleaf;
    hashLockScript: Buffer;
    script_p2tr: payments.Payment;
    revealVByte: number;
}) => {
    commitTxB64: string;
};
declare const createRawRevealTx: ({ internalPubKey, feeRatePerByte, commitTxID, hashLockKeyPair, hashLockRedeem, script_p2tr, revealVByte }: {
    internalPubKey: Buffer;
    feeRatePerByte: number;
    commitTxID: string;
    revealVByte: number;
    hashLockKeyPair: ECPairInterface;
    hashLockRedeem: any;
    script_p2tr: payments.Payment;
}) => {
    revealTxHex: string;
    revealTxID: string;
};
declare const start_taptree: ({ privateKey, data, utxos, feeRatePerByte, reImbursementTCAddress, }: {
    privateKey: Buffer;
    data: string[];
    utxos: UTXO[];
    feeRatePerByte: number;
    reImbursementTCAddress: string;
}) => (Promise<{
    commitTxHex: string;
    revealTxHex: string;
}>);
/**
* createInscribeTx creates commit and reveal tx to inscribe data on Bitcoin netword.
* NOTE: Currently, the function only supports sending from Taproot address.
* @param senderPrivateKey buffer private key of the inscriber
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the sender
* @param data list of hex data need to inscribe
* @param reImbursementTCAddress TC address of the inscriber to receive gas.
* @param feeRatePerByte fee rate per byte (in satoshi)
* @returns the hex commit transaction
* @returns the commit transaction id
* @returns the hex reveal transaction
* @returns the reveal transaction id
* @returns the total network fee
*/
declare const createInscribeTx: ({ senderPrivateKey, utxos, inscriptions, data, reImbursementTCAddress, feeRatePerByte, }: {
    senderPrivateKey: Buffer;
    utxos: UTXO[];
    inscriptions: {
        [key: string]: Inscription[];
    };
    data: string[];
    reImbursementTCAddress: string;
    feeRatePerByte: number;
}) => {
    commitTxHex: string;
    commitTxID: string;
    revealTxHex: string;
    revealTxID: string;
};
export { start_taptree, generateInscribeContent, createRawRevealTx, createRawCommitTx, createInscribeTx };
