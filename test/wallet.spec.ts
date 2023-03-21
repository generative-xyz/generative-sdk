import { assert } from "chai";

import {
    networks,
    payments,
    Psbt,
    Transaction
} from "bitcoinjs-lib";
import { decryptWallet, deriveETHWallet, derivePasswordWallet, deriveSegwitWallet, encryptWallet, importBTCPrivateKey, Wallet } from "../src/index";
const network = networks.bitcoin;  // mainnet
require("dotenv").config({ path: __dirname + "/.env" });


describe("Import Wallet", async () => {
    it("Import BTC private key - encrypt and decrypt wallet", async () => {
        // TODO: enter the private key
        const privKeyStr = process.env.PRIV_KEY_1 || "";
        const password = "hsbefjwkbfkw";

        const wallet: Wallet = {
            privKey: privKeyStr
        };

        // import btc private key
        const { taprootPrivKeyBuffer, taprootAddress } = importBTCPrivateKey(privKeyStr);
        console.log("Taproot address: ", taprootAddress);

        // encrypt
        const cipherText = encryptWallet(wallet, password);

        // decrypt
        const decryptedWallet = decryptWallet(cipherText, password);

        assert.notEqual(decryptedWallet, undefined);
        assert.equal(decryptedWallet?.privKey, privKeyStr);
    });

    it("Import BTC private key - derive segwit wallet and eth wallet", async () => {
        // TODO: enter the private key
        const privKeyStr = process.env.PRIV_KEY_1 || "";
        const password = "hsbefjwkbfkw";

        const wallet: Wallet = {
            privKey: privKeyStr
        };

        // import btc private key
        const { taprootPrivKeyBuffer, taprootAddress } = importBTCPrivateKey(privKeyStr);
        console.log("Taproot address: ", taprootAddress);

        // derive segwit wallet
        const { segwitPrivKeyBuffer, segwitAddress } = deriveSegwitWallet(taprootPrivKeyBuffer);
        console.log("segwitPrivKeyBuffer, segwitAddress: ", segwitPrivKeyBuffer, segwitAddress);

        // derive segwit wallet
        const { ethPrivKey, ethAddress } = deriveETHWallet(taprootPrivKeyBuffer);
        console.log("ethPrivKey, ethAddress: ", ethPrivKey, ethAddress);
    });
});
