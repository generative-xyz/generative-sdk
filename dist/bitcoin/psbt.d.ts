import { Psbt } from "bitcoinjs-lib";
import { ICreateTxResp, Inscription, UTXO } from "./types";
/**
* createPSBTForSale creates the partially signed bitcoin transaction to sale the inscription.
* NOTE: Currently, the function only supports sending from Taproot address.
* @param sellerPrivateKey buffer private key of the seller
* @param sellerAddress payment address of the seller to recieve BTC from buyer
* @param ordinalInput ordinal input coin to sell
* @param price price of the inscription that the seller wants to sell (in satoshi)
* @returns the encoded base64 partially signed transaction
*/
declare const createPSBTToSale: (params: {
    ordinalInput: UTXO;
    price: number;
    sellerAddress: string;
    sellerPrivateKey: Buffer;
    dummyUTXO: UTXO;
    creatorAddress: string;
    feeForCreator: number;
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
    buyerAddress: string;
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
* @returns the base64 encode Psbt
*/
declare const reqListForSaleInscription: (sellerPrivateKey: Buffer, utxos: UTXO[], inscriptions: {
    [key: string]: Inscription[];
}, sellInscriptionID: string | undefined, receiverBTCAddress: string, price: number, creatorAddress?: string, feeForCreator?: number) => string;
/**
* reqBuyInscription creates the PSBT of the seller to list for sale inscription.
* NOTE: Currently, the function only supports sending from Taproot address.
* @param sellerSignedPsbtB64 buffer private key of the buyer
* @param buyerPrivateKey buffer private key of the buyer
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the seller
* @param sellInscriptionID id of inscription to sell
* @param receiverBTCAddress the seller's address to receive BTC
* @returns the base64 encode Psbt
*/
declare const reqBuyInscription: (sellerSignedPsbtB64: string, buyerPrivateKey: Buffer, buyerAddress: string, valueInscription: number, price: number, utxos: UTXO[], inscriptions: {
    [key: string]: Inscription[];
}, feeRatePerByte: number) => ICreateTxResp;
export { createPSBTToSale, createPSBTToBuy, reqListForSaleInscription, reqBuyInscription, };
