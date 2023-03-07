/// <reference types="node" />
import { networks, Transaction, Psbt, Signer, payments } from 'bitcoinjs-lib';
import * as ecpair from 'ecpair';
import { ECPairAPI } from 'ecpair';

declare const BlockStreamURL = "https://blockstream.info/api";
declare const MinSats = 1000;
declare const network: networks.Network;
declare const DummyUTXOValue = 1000;
declare const InputSize = 68;
declare const OutputSize = 43;

interface UTXO {
    tx_hash: string;
    tx_output_n: number;
    value: number;
}
interface Inscription {
    offset: number;
    id: string;
}
interface ICreateTxResp {
    tx: Transaction;
    txID: string;
    txHex: string;
    fee: number;
    selectedUTXOs: UTXO[];
    changeAmount: number;
}
interface ICreateTxBuyResp {
    tx: Transaction;
    txID: string;
    txHex: string;
    fee: number;
    selectedUTXOs: UTXO[];
    splitTxID: string;
    splitUTXOs: UTXO[];
    splitTxRaw: string;
}
interface ICreateTxSellResp {
    base64Psbt: string;
    selectedUTXOs: UTXO[];
    splitTxID: string;
    splitUTXOs: UTXO[];
    splitTxRaw: string;
}
interface ICreateTxSplitInscriptionResp {
    txID: string;
    txHex: string;
    fee: number;
    selectedUTXOs: UTXO[];
    newValueInscription: number;
}

/**
* selectUTXOs selects the most reasonable UTXOs to create the transaction.
* if sending inscription, the first selected UTXO is always the UTXO contain inscription.
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the sender
* @param sendInscriptionID id of inscription to send
* @param sendAmount satoshi amount need to send
* @param feeRatePerByte fee rate per byte (in satoshi)
* @param isUseInscriptionPayFee flag defines using inscription coin to pay fee
* @returns the list of selected UTXOs
* @returns the actual flag using inscription coin to pay fee
* @returns the value of inscription outputs, and the change amount (if any)
* @returns the network fee
*/
declare const selectUTXOs: (utxos: UTXO[], inscriptions: {
    [key: string]: Inscription[];
}, sendInscriptionID: string, sendAmount: number, feeRatePerByte: number, isUseInscriptionPayFee: boolean) => {
    selectedUTXOs: UTXO[];
    isUseInscriptionPayFee: boolean;
    valueOutInscription: number;
    changeAmount: number;
    fee: number;
};
/**
* selectUTXOs selects the most reasonable UTXOs to create the transaction.
* if sending inscription, the first selected UTXO is always the UTXO contain inscription.
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the sender
* @param sendInscriptionID id of inscription to send
* @returns the ordinal UTXO
* @returns the actual flag using inscription coin to pay fee
* @returns the value of inscription outputs, and the change amount (if any)
* @returns the network fee
*/
declare const selectInscriptionUTXO: (utxos: UTXO[], inscriptions: {
    [key: string]: Inscription[];
}, inscriptionID: string) => {
    inscriptionUTXO: UTXO;
    inscriptionInfo: Inscription;
};
/**
* selectCardinalUTXOs selects the most reasonable UTXOs to create the transaction.
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the sender
* @param sendAmount satoshi amount need to send
* @returns the list of selected UTXOs
* @returns the actual flag using inscription coin to pay fee
* @returns the value of inscription outputs, and the change amount (if any)
* @returns the network fee
*/
declare const selectCardinalUTXOs: (utxos: UTXO[], inscriptions: {
    [key: string]: Inscription[];
}, sendAmount: number) => {
    selectedUTXOs: UTXO[];
};
/**
* selectTheSmallestUTXO selects the most reasonable UTXOs to create the transaction.
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the sender
* @param sendAmount satoshi amount need to send
* @param isSelectDummyUTXO need to select dummy UTXO or not
* @returns the list of selected UTXOs
* @returns the actual flag using inscription coin to pay fee
* @returns the value of inscription outputs, and the change amount (if any)
* @returns the network fee
*/
declare const selectTheSmallestUTXO: (utxos: UTXO[], inscriptions: {
    [key: string]: Inscription[];
}) => UTXO;

/**
* createTx creates the Bitcoin transaction (including sending inscriptions).
* NOTE: Currently, the function only supports sending from Taproot address.
* @param senderPrivateKey buffer private key of the sender
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the sender
* @param sendInscriptionID id of inscription to send
* @param receiverInsAddress the address of the inscription receiver
* @param sendAmount satoshi amount need to send
* @param feeRatePerByte fee rate per byte (in satoshi)
* @param isUseInscriptionPayFee flag defines using inscription coin to pay fee
* @returns the transaction id
* @returns the hex signed transaction
* @returns the network fee
*/
declare const createTx: (senderPrivateKey: Buffer, utxos: UTXO[], inscriptions: {
    [key: string]: Inscription[];
}, sendInscriptionID: string | undefined, receiverInsAddress: string, sendAmount: number, feeRatePerByte: number, isUseInscriptionPayFeeParam?: boolean) => ICreateTxResp;
/**
* createTxWithSpecificUTXOs creates the Bitcoin transaction with specific UTXOs (including sending inscriptions).
* NOTE: Currently, the function only supports sending from Taproot address.
* This function is used for testing.
* @param senderPrivateKey buffer private key of the sender
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param sendInscriptionID id of inscription to send
* @param receiverInsAddress the address of the inscription receiver
* @param sendAmount amount need to send (in sat)
* @param valueOutInscription inscription output's value (in sat)
* @param changeAmount cardinal change amount (in sat)
* @param fee transaction fee (in sat)
* @returns the transaction id
* @returns the hex signed transaction
* @returns the network fee
*/
declare const createTxWithSpecificUTXOs: (senderPrivateKey: Buffer, utxos: UTXO[], sendInscriptionID: string | undefined, receiverInsAddress: string, sendAmount: number, valueOutInscription: number, changeAmount: number, fee: number) => {
    txID: string;
    txHex: string;
    fee: number;
};
/**
* createTx creates the Bitcoin transaction (including sending inscriptions).
* NOTE: Currently, the function only supports sending from Taproot address.
* @param senderPrivateKey buffer private key of the sender
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the sender
* @param sendInscriptionID id of inscription to send
* @param receiverInsAddress the address of the inscription receiver
* @param sendAmount satoshi amount need to send
* @param feeRatePerByte fee rate per byte (in satoshi)
* @param isUseInscriptionPayFee flag defines using inscription coin to pay fee
* @returns the transaction id
* @returns the hex signed transaction
* @returns the network fee
*/
declare const createTxSplitFundFromOrdinalUTXO: (senderPrivateKey: Buffer, inscriptionUTXO: UTXO, inscriptionInfo: Inscription, sendAmount: number, feeRatePerByte: number) => ICreateTxSplitInscriptionResp;
declare const createDummyUTXOFromCardinal: (senderPrivateKey: Buffer, utxos: UTXO[], inscriptions: {
    [key: string]: Inscription[];
}, feeRatePerByte: number) => Promise<{
    dummyUTXO: UTXO;
    splitTxID: string;
    selectedUTXOs: UTXO[];
    newUTXO: any;
    fee: number;
    txHex: string;
}>;
declare const broadcastTx: (txHex: string) => Promise<string>;

declare const ECPair: ECPairAPI;
/**
* convertPrivateKey converts buffer private key to WIF private key string
* @param bytes buffer private key
* @returns the WIF private key string
*/
declare const convertPrivateKey: (bytes: Buffer) => string;
/**
* convertPrivateKeyFromStr converts private key WIF string to Buffer
* @param str private key string
* @returns buffer private key
*/
declare const convertPrivateKeyFromStr: (str: string) => Buffer;
/**
* estimateTxFee estimates the transaction fee
* @param numIns number of inputs in the transaction
* @param numOuts number of outputs in the transaction
* @param feeRatePerByte fee rate per byte (in satoshi)
* @returns returns the estimated transaction fee in satoshi
*/
declare const estimateTxFee: (numIns: number, numOuts: number, feeRatePerByte: number) => number;
/**
* estimateNumInOutputs estimates number of inputs and outputs by parameters:
* @param inscriptionID id of inscription to send (if any)
* @param sendAmount satoshi amount need to send
* @param isUseInscriptionPayFee use inscription output coin to pay fee or not
* @returns returns the estimated number of inputs and outputs in the transaction
*/
declare const estimateNumInOutputs: (inscriptionID: string, sendAmount: number, isUseInscriptionPayFee: boolean) => {
    numIns: number;
    numOuts: number;
};
/**
* estimateNumInOutputs estimates number of inputs and outputs by parameters:
* @param inscriptionID id of inscription to send (if any)
* @param sendAmount satoshi amount need to send
* @param isUseInscriptionPayFee use inscription output coin to pay fee or not
* @returns returns the estimated number of inputs and outputs in the transaction
*/
declare const estimateNumInOutputsForBuyInscription: (sellerSignedPsbt: Psbt) => {
    numIns: number;
    numOuts: number;
};
declare function toXOnly(pubkey: Buffer): Buffer;
declare function tweakSigner(signer: Signer, opts?: any): Signer;
declare function tapTweakHash(pubKey: Buffer, h: Buffer | undefined): Buffer;
declare const generateTaprootAddress: (privateKey: Buffer) => string;
declare const generateTaprootKeyPair: (privateKey: Buffer) => {
    keyPair: ecpair.ECPairInterface;
    senderAddress: string;
    tweakedSigner: Signer;
    p2pktr: payments.Payment;
};
declare const fromSat: (sat: number) => number;

declare const getBTCBalance: (params: {
    utxos: UTXO[];
    inscriptions: {
        [key: string]: Inscription[];
    };
}) => number;

/**
* createPSBTToSell creates the partially signed bitcoin transaction to sale the inscription.
* NOTE: Currently, the function only supports sending from Taproot address.
* @param sellerPrivateKey buffer private key of the seller
* @param sellerAddress payment address of the seller to recieve BTC from buyer
* @param ordinalInput ordinal input coin to sell
* @param price price of the inscription that the seller wants to sell (in satoshi)
* @returns the encoded base64 partially signed transaction
*/
declare const createPSBTToSell: (params: {
    sellerPrivateKey: Buffer;
    receiverBTCAddress: string;
    inscriptionUTXO: UTXO;
    amountPayToSeller: number;
    feePayToCreator: number;
    creatorAddress: string;
    dummyUTXO: UTXO;
}) => string;
/**
* createPSBTToBuy creates the partially signed bitcoin transaction to buy the inscription.
* NOTE: Currently, the function only supports sending from Taproot address.
* @param sellerSignedPsbt PSBT from seller
* @param buyerPrivateKey buffer private key of the buyer
* @param buyerAddress payment address of the buy to receive inscription
* @param valueInscription value in inscription
* @param price price of the inscription that the seller wants to sell (in satoshi)
* @param paymentUtxos cardinal input coins to payment
* @param dummyUtxo cardinal dummy input coin
* @returns the encoded base64 partially signed transaction
*/
declare const createPSBTToBuy: (params: {
    sellerSignedPsbt: Psbt;
    buyerPrivateKey: Buffer;
    receiverInscriptionAddress: string;
    valueInscription: number;
    price: number;
    paymentUtxos: UTXO[];
    dummyUtxo: UTXO;
    feeRate: number;
}) => ICreateTxResp;
/**
* reqListForSaleInscription creates the PSBT of the seller to list for sale inscription.
* NOTE: Currently, the function only supports sending from Taproot address.
* @param sellerPrivateKey buffer private key of the seller
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the seller
* @param sellInscriptionID id of inscription to sell
* @param receiverBTCAddress the seller's address to receive BTC
* @param amountPayToSeller BTC amount to pay to seller
* @param feePayToCreator BTC fee to pay to creator
* @param creatorAddress address of creator
* amountPayToSeller + feePayToCreator = price that is showed on UI
* @returns the base64 encode Psbt
*/
declare const reqListForSaleInscription: (params: {
    sellerPrivateKey: Buffer;
    utxos: UTXO[];
    inscriptions: {
        [key: string]: Inscription[];
    };
    sellInscriptionID: string;
    receiverBTCAddress: string;
    amountPayToSeller: number;
    feePayToCreator: number;
    creatorAddress: string;
    feeRatePerByte: number;
}) => Promise<ICreateTxSellResp>;
/**
* reqBuyInscription creates the PSBT of the seller to list for sale inscription.
* NOTE: Currently, the function only supports sending from Taproot address.
* @param sellerSignedPsbtB64 buffer private key of the buyer
* @param buyerPrivateKey buffer private key of the buyer
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the seller
* @param sellInscriptionID id of inscription to sell
* @param receiverBTCAddress the seller's address to receive BTC
* @param price  = amount pay to seller + fee pay to creator
* @returns the base64 encode Psbt
*/
declare const reqBuyInscription: (params: {
    sellerSignedPsbtB64: string;
    buyerPrivateKey: Buffer;
    receiverInscriptionAddress: string;
    price: number;
    utxos: UTXO[];
    inscriptions: {
        [key: string]: Inscription[];
    };
    feeRatePerByte: number;
}) => Promise<ICreateTxBuyResp>;

declare const ERROR_CODE: {
    INVALID_PARAMS: string;
    NOT_SUPPORT_SEND: string;
    NOT_FOUND_INSCRIPTION: string;
    NOT_ENOUGH_BTC_TO_SEND: string;
    NOT_ENOUGH_BTC_TO_PAY_FEE: string;
    ERR_BROADCAST_TX: string;
    INVALID_SIG: string;
};
declare const ERROR_MESSAGE: {
    [x: string]: {
        message: string;
        desc: string;
    };
};
declare class SDKError extends Error {
    message: string;
    code: string;
    desc: string;
    constructor(code: string, desc?: string);
    getMessage(): string;
}

export { BlockStreamURL, DummyUTXOValue, ECPair, ERROR_CODE, ERROR_MESSAGE, ICreateTxBuyResp, ICreateTxResp, ICreateTxSellResp, ICreateTxSplitInscriptionResp, InputSize, Inscription, MinSats, OutputSize, SDKError, UTXO, broadcastTx, convertPrivateKey, convertPrivateKeyFromStr, createDummyUTXOFromCardinal, createPSBTToBuy, createPSBTToSell, createTx, createTxSplitFundFromOrdinalUTXO, createTxWithSpecificUTXOs, estimateNumInOutputs, estimateNumInOutputsForBuyInscription, estimateTxFee, fromSat, generateTaprootAddress, generateTaprootKeyPair, getBTCBalance, network, reqBuyInscription, reqListForSaleInscription, selectCardinalUTXOs, selectInscriptionUTXO, selectTheSmallestUTXO, selectUTXOs, tapTweakHash, toXOnly, tweakSigner };
