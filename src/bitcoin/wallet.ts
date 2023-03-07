import { writeFile } from "fs";
import { Inscription, UTXO, Wallet } from "./types";
import { ethers, utils } from "ethers";
import { AES, enc } from "crypto-js";
import { convertPrivateKeyFromStr, generateTaprootKeyPair } from "./utils";

const getBTCBalance = (
    params: {
        utxos: UTXO[],
        inscriptions: { [key: string]: Inscription[] },
    }
): number => {
    const normalUTXOs: UTXO[] = [];
    let btcBalance = 0;

    const { utxos, inscriptions } = params;

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
            btcBalance += utxo.value;
        }
    });

    return btcBalance;
};

const importBTCPrivateKey = (wifPrivKey: string): { privKeyBuffer: Buffer, taprootAddress: string } => {
    const privKeyBuffer = convertPrivateKeyFromStr(wifPrivKey);
    const { senderAddress } = generateTaprootKeyPair(privKeyBuffer);

    return {
        privKeyBuffer: privKeyBuffer,
        taprootAddress: senderAddress,
    };
};

const getBitcoinKeySignContent = (message: string): Buffer => {
    return Buffer.from(message);
};

/**
* derivePasswordWallet derive the password from ONE SPECIFIC evm address. 
* This password is used to encrypt and decrypt the imported BTC wallet.
* NOTE: The client should save the corresponding evm address to retrieve the same BTC wallet. 
* @param provider ETH provider
* @param evmAddress evm address is chosen to create the valid signature on IMPORT_MESSAGE
* @returns the base64 encode Psbt
*/
const derivePasswordWallet = async (evmAddress: string, provider: ethers.providers.Web3Provider): Promise<Buffer> => {
    // sign message with first sign transaction
    const IMPORT_MESSAGE =
        "Sign this message to import your Bitcoin wallet. This key will be used to encrypt your wallet.";

    // const provider = new ethers.providers.Web3Provider(
    //     window.ethereum as ethers.providers.ExternalProvider
    // );
    // const provider: ethers.providers.Web3Provider;
    const toSign =
        "0x" + getBitcoinKeySignContent(IMPORT_MESSAGE).toString("hex");
    const signature = await provider.send("personal_sign", [
        toSign,
        evmAddress.toString(),
    ]);

    // Password = Keccak256(sig)
    const password = utils.arrayify(
        utils.keccak256(utils.arrayify(signature))
    );

    return Buffer.from(password);
};

const encryptWallet = (wallet: Wallet, password: string) => {
    // convert wallet to string
    const walletStr = JSON.stringify(wallet);
    const ciphertext = AES.encrypt(walletStr, password).toString();
    return ciphertext;
};

const decryptWallet = (ciphertext: string, password: string): Wallet => {
    const plaintextBytes = AES.decrypt(ciphertext, password);

    // parse to wallet object
    const wallet = JSON.parse(plaintextBytes.toString(enc.Utf8));

    return wallet;
};


export {
    getBTCBalance,
    importBTCPrivateKey,
    derivePasswordWallet,
    encryptWallet,
    decryptWallet,
};