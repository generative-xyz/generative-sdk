import { Inscription, UTXO } from "..";
import { TcClient } from "tc-js";
import BigNumber from "bignumber.js";
/**
* createInscribeTx creates commit and reveal tx to inscribe data on Bitcoin netword.
* NOTE: Currently, the function only supports sending from Taproot address.
* @param senderPrivateKey buffer private key of the inscriber
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the sender
* @param tcTxID TC txID need to be inscribed
* @param reImbursementTCAddress TC address of the inscriber to receive gas.
* @param feeRatePerByte fee rate per byte (in satoshi)
* @returns the hex commit transaction
* @returns the commit transaction id
* @returns the hex reveal transaction
* @returns the reveal transaction id
* @returns the total network fee
*/
declare const createInscribeTx: ({ senderPrivateKey, utxos, inscriptions, tcTxID, feeRatePerByte, tcClient }: {
    senderPrivateKey: Buffer;
    utxos: UTXO[];
    inscriptions: {
        [key: string]: Inscription[];
    };
    tcTxID: string;
    feeRatePerByte: number;
    tcClient: TcClient;
}) => Promise<{
    commitTxHex: string;
    commitTxID: string;
    revealTxHex: string;
    revealTxID: string;
    totalFee: BigNumber;
}>;
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
export { createInscribeTx, estimateInscribeFee };
