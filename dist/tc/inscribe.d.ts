import { Inscription, UTXO } from "..";
import { payments } from "bitcoinjs-lib";
import BigNumber from "bignumber.js";
import { ECPairInterface } from "ecpair";
declare function generateInscribeContent(protocolID: string, reimbursementAddr: string, datas: string[]): string;
declare const createRawRevealTx: ({ internalPubKey, commitTxID, hashLockKeyPair, hashLockRedeem, script_p2tr, revealTxFee }: {
    internalPubKey: Buffer;
    commitTxID: string;
    hashLockKeyPair: ECPairInterface;
    hashLockRedeem: any;
    script_p2tr: payments.Payment;
    revealTxFee: number;
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
    totalFee: BigNumber;
};
/**
* estimateInscribeFee estimate BTC amount need to inscribe for creating project.
* NOTE: Currently, the function only supports sending from Taproot address.
* @param htmlFileSizeByte size of html file from user (in byte)
* @param feeRatePerByte fee rate per byte (in satoshi)
* @returns the total BTC fee
*/
declare const estimateInscribeFee: ({ htmlFileSizeByte, feeRatePerByte, }: {
    htmlFileSizeByte: number;
    feeRatePerByte: number;
}) => {
    totalFee: BigNumber;
};
export { start_taptree, generateInscribeContent, createRawRevealTx, createInscribeTx, estimateInscribeFee };
