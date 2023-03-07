import { assert } from "chai";

import {
    networks,
    payments,
    Psbt
} from "bitcoinjs-lib";
import { broadcastTx, decryptWallet, encryptWallet, fromSat, importBTCPrivateKey, Wallet } from "../src/index";
const network = networks.bitcoin;  // mainnet


describe("Import Wallet", async () => {
    it("Import private key WIF", async () => {
        // TODO: enter the private key
        const privKeyStr = "";
        const password = "";
        const { privKeyBuffer, taprootAddress } = importBTCPrivateKey(privKeyStr);
        const wallet: Wallet = {
            privKey: privKeyStr
        };
        console.log("Taproot address: ", taprootAddress);

        const cipherText = encryptWallet(wallet, password);

        const decryptedWallet = decryptWallet(cipherText, password);

        assert.notEqual(decryptedWallet, undefined);
        assert.equal(decryptedWallet?.privKey, privKeyStr);

    })
});
