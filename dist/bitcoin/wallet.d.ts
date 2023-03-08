import { Inscription, UTXO, Wallet } from "./types";
import { ethers } from "ethers";
declare const getBTCBalance: (params: {
    utxos: UTXO[];
    inscriptions: {
        [key: string]: Inscription[];
    };
}) => number;
declare const importBTCPrivateKey: (wifPrivKey: string) => {
    privKeyBuffer: Buffer;
    taprootAddress: string;
};
/**
* derivePasswordWallet derive the password from ONE SPECIFIC evm address.
* This password is used to encrypt and decrypt the imported BTC wallet.
* NOTE: The client should save the corresponding evm address to retrieve the same BTC wallet.
* @param provider ETH provider
* @param evmAddress evm address is chosen to create the valid signature on IMPORT_MESSAGE
* @returns the password string
*/
declare const derivePasswordWallet: (evmAddress: string, provider: ethers.providers.Web3Provider) => Promise<string>;
declare const encryptWallet: (wallet: Wallet, password: string) => string;
declare const decryptWallet: (ciphertext: string, password: string) => Wallet;
export { getBTCBalance, importBTCPrivateKey, derivePasswordWallet, encryptWallet, decryptWallet, };
