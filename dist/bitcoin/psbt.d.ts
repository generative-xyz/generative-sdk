import { Psbt } from "bitcoinjs-lib";
import { UTXO } from "./types";
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
}) => string;
/**
* createPSBTToBuy creates the partially signed bitcoin transaction to buy the inscription.
* NOTE: Currently, the function only supports sending from Taproot address.
* @param buyerPrivateKey buffer private key of the buyer
* @param sellerAddress payment address of the seller to recieve BTC from buyer
* @param ordinalInput ordinal input coin to sell
* @param price price of the inscription that the seller wants to sell (in satoshi)
* @returns the encoded base64 partially signed transaction
*/
declare const createPSBTToBuy: (params: {
    sellerSignedPsbt: Psbt;
    buyerPrivateKey: Buffer;
    buyerAddress: string;
    sellerAddress: string;
    valueInscription: number;
    price: number;
    paymentUtxos: UTXO[];
    dummyUtxo: UTXO;
    feeRate: number;
}) => {
    txID: string;
    txHex: string;
    fee: number;
};
export { createPSBTToSale, createPSBTToBuy, };
