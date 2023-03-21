import { assert } from "chai";

import {
    networks,
    payments,
    Psbt,
    Transaction
} from "bitcoinjs-lib";
import { decryptWallet, derivePasswordWallet, encryptWallet, importBTCPrivateKey, Wallet } from "../src/index";
const network = networks.bitcoin;  // mainnet


describe("Import Wallet", async () => {
    it("Derive password", async () => {
        // TODO: enter the private key
        const privKeyStr = "";
        const evmAddress = "";
        const password = "";

        // derive password from sig
        // const password = await derivePasswordWallet(evmAddress, undefined);
        // console.log("Password: ", password);

        const wallet: Wallet = {
            privKey: privKeyStr
        };

        // import btc private key
        const { privKeyBuffer, taprootAddress } = importBTCPrivateKey(privKeyStr);
        console.log("Taproot address: ", taprootAddress);

        // encrypt
        const cipherText = encryptWallet(wallet, password);

        // decrypt
        const decryptedWallet = decryptWallet(cipherText, password);

        assert.notEqual(decryptedWallet, undefined);
        assert.equal(decryptedWallet?.privKey, privKeyStr);
    });
});
