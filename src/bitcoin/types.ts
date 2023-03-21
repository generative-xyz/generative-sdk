import { Transaction, Psbt } from "bitcoinjs-lib";
import BigNumber from "bignumber.js";

interface UTXO {
    tx_hash: string;
    tx_output_n: number;
    value: BigNumber;
}

// key : "TxID:OutcoinIndex" : Inscription[]
interface Inscription {
    offset: BigNumber,
    id: string,
}

interface ICreateTxResp {
    tx: Transaction,
    txID: string,
    txHex: string,
    fee: BigNumber,
    selectedUTXOs: UTXO[],
    changeAmount: BigNumber,
}

interface ICreateTxBuyResp {
    tx: Transaction,
    txID: string,
    txHex: string,
    fee: BigNumber,
    selectedUTXOs: UTXO[],
    splitTxID: string,
    splitUTXOs: UTXO[],
    splitTxRaw: string,
}

interface ICreateTxSellResp {
    base64Psbt: string,
    selectedUTXOs: UTXO[],
    splitTxID: string,
    splitUTXOs: UTXO[],
    splitTxRaw: string,
}

interface ICreateTxSplitInscriptionResp {
    txID: string,
    txHex: string,
    fee: BigNumber,
    selectedUTXOs: UTXO[]
    newValueInscription: BigNumber,
}

interface BuyReqInfo {
    sellerSignedPsbtB64: string,
    receiverInscriptionAddress: string,
    price: BigNumber,
}

interface BuyReqFullInfo extends BuyReqInfo {
    sellerSignedPsbt: Psbt,
    valueInscription: BigNumber,
    paymentUTXO: any, // UTXO || null
}

interface PaymentInfo {
    address: string,
    amount: BigNumber
}

interface Wallet {
    privKey: string,
}

export {
    UTXO,
    Inscription,
    ICreateTxResp,
    ICreateTxSplitInscriptionResp,
    ICreateTxBuyResp,
    ICreateTxSellResp,
    BuyReqInfo,
    PaymentInfo,
    BuyReqFullInfo,
    Wallet
};