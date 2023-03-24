import { Transaction } from "bitcoinjs-lib";
/**
* handleSignPsbtWithXverse calls Xverse signTransaction and finalizes signed raw psbt.
* extract to msgTx (if isGetMsgTx is true)
* @param sellerPrivateKey buffer private key of the seller
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the seller
* @param sellInscriptionID id of inscription to sell
* @param receiverBTCAddress the seller's address to receive BTC
* @param amountPayToSeller BTC amount to pay to seller
* @param feePayToCreator BTC fee to pay to creator
* @param isGetMsgTx address of creator
* amountPayToSeller + feePayToCreator = price that is showed on UI
* @returns the base64 encode Psbt
*/
declare const handleSignPsbtWithXverse: ({ base64Psbt, indicesToSign, address, sigHashType, isGetMsgTx, cancelFn, }: {
    base64Psbt: string;
    indicesToSign: number[];
    address: string;
    sigHashType?: number | undefined;
    isGetMsgTx?: boolean | undefined;
    cancelFn: () => void;
}) => Promise<{
    base64SignedPsbt: string;
    msgTx: Transaction;
    msgTxID: string;
    msgTxHex: string;
}>;
export { handleSignPsbtWithXverse };
