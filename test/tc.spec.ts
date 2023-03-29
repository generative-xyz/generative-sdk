import { ECPair, convertPrivateKeyFromStr, createInscribeTx, createRawCommitTx, createRawRevealTx, generateInscribeContent, network, start_taptree } from "../src";

import BigNumber from 'bignumber.js';
import { ECPairInterface } from 'ecpair';
import { Psbt } from "bitcoinjs-lib";
import { assert } from 'chai';

require("dotenv").config({ path: __dirname + "/.env" });
console.log(__dirname + "../test/.env");


// TODO: fill the private key
var sellerPrivateKeyWIF = process.env.PRIV_KEY_1 || "";
var sellerPrivateKey = convertPrivateKeyFromStr(sellerPrivateKeyWIF);
let sellerAddress = process.env.ADDRESS_1 || "";

let buyerPrivateKeyWIF = process.env.PRIV_KEY_2 || "";
let buyerAddress = process.env.ADDRESS_2 || "";
let buyerPrivateKey = convertPrivateKeyFromStr(buyerPrivateKeyWIF);
console.log("buyerPrivateKeyWIF ", buyerPrivateKeyWIF);
console.log("buyerAddress ", buyerAddress);

let sellerUTXOs = [
    // inscription UTXOs
    // real

    // {
    //     tx_hash: "4963e4ec3bf2599c542259ad5cc393ceef6a1dfea1aa0df2c3533a27d173aeee",
    //     tx_output_n: 1,
    //     value: 1078, // normal
    // },
    {
        tx_hash: "4df03f8d428aeec015a8d0ee7f2bc03d0cd32f36479647683ab9192a1ba11fde",
        tx_output_n: 0,
        value: new BigNumber(10000),
    },
    // {
    //     tx_hash: "da7d8f7d7234d65ce8876475ba75e7ab60f6ea807fc0b248270f640db2d0189f",
    //     tx_output_n: 1,
    //     value: 1536, // normal
    // },
    // {
    //     tx_hash: "357b0288744386a5a62c4bda4640566750feee7c0e15f7888d247d251b8db75c",
    //     tx_output_n: 0,
    //     value: 4421,
    // }
];

describe("Sign msg Tx", async () => {
    it("should return the raw commit tx", async () => {
        const data = "0xf8698080825208949b9add2b5b572ccc43ef2660d8b81cfd0701435b8898a7d9b8314c000080823696a0ee3795a786dd6c4f028517f2f5dd7333f066b83d03ca7404d73b8b212454e123a0488ddfdb48101b5ac0647e1b823f98e05ba7310c3046810e3327d1d2ccc51434";
        const tcAddress = "";
        const pubKeyStr = "";
        const { commitTxHex, commitTxID, revealTxHex, revealTxID } = createInscribeTx({
            senderPrivateKey: sellerPrivateKey,

            // internalPubKey: Buffer.from(pubKeyStr, "hex"),
            data: [data],
            utxos: sellerUTXOs,
            inscriptions: {},
            feeRatePerByte: 6,
            reImbursementTCAddress: tcAddress,
        });
        // console.log("commitTxB64: ", commitTxB64);
        // console.log("hashLockRedeemScriptHex: ", hashLockRedeemScriptHex);
        // console.log("revealVByte: ", revealVByte);
        // console.log("hashLockPriKey: ", hashLockPriKey);
        // const dataBuff = Buffer.from("f8698080825208949b9add2b5b572ccc43ef2660d8b81cfd0701435b8898a7d9b8314c000080823696a0ee3795a786dd6c4f028517f2f5dd7333f066b83d03ca7404d73b8b212454e123a0488ddfdb48101b5ac0647e1b823f98e05ba7310c3046810e3327d1d2ccc51434", "hex");

        // console.log(dataBuff.length);

        console.log("commitTxHex: ", commitTxHex);
        console.log("commitTxID: ", commitTxID);
        console.log("revealTxHex: ", revealTxHex);
        console.log("revealTxID: ", revealTxID);


    });
    // it("finalize raw commit tx", async () => {
    //     const signedCommitTxB64 = "cHNidP8BAIkCAAAAAd4foRsqGbk6aEeWRzYv0ww9wCt/7tCoFcDuikKNP/BNAAAAAAD/////AsYHAAAAAAAAIlEgydBhfWmBPkcNjiD8mMF7+yxJskRnbs4Nhrk3RuzO5SyuGwAAAAAAACJRIIwBcHKBtuPNaLYvJMGzVoV0l9y6m0oYFTJFCJBSfZf4AAAAAAABASsQJwAAAAAAACJRIIwBcHKBtuPNaLYvJMGzVoV0l9y6m0oYFTJFCJBSfZf4ARNAIghJb5aBPBsiWMmurMp8bVvpno9TsPeLIZm8MlQvkYlSDiUqOao8Vux3fm+S+If4O4P+IHUYDxeZ8vPLC8//7QEXIJO8b4pdMKXOlGH5JToh0FFIinmYG051yiKI+QFa1fYVAAAA";

    //     const psbt = Psbt.fromBase64(signedCommitTxB64);
    //     psbt.finalizeAllInputs();

    //     const msgTx = psbt.extractTransaction();

    //     console.log("commitTxHex: ", msgTx.toHex());
    //     console.log("commitTxID: ", msgTx.getId());
    // });


    // it("should return the raw commit tx", async () => {

    //     const commitTxID = "2930061e7b32bc90f79109f0a13d1fa4c417bc58e00ab98e28b37d131fcf401d";
    //     const hashLockPriKey = "KwsMY7zgHQ3DobYpto3HFkkTh8k5Pw5FL3d8pLAqSSntF4c8WG8p";
    //     const hashLockRedeemScriptHex = "2097f06802a32c09033bdc7b8e84d5c9a5b8c88781493d63e55d9bea956f5c7d2fac006304736274634c8862766d763182268af8207117ddbcd8ce4e444263ccd8d1bf87000000d6f8698080825208949b9add2b5b572ccc43ef2660d8b81cfd0701435b8898a7d9b8314c000080823696a0ee3795a786dd6c4f028517f2f5dd7333f066b83d03ca7404d73b8b212454e123a0488ddfdb48101b5ac0647e1b823f98e05ba7310c3046810e3327d1d2ccc5143468";
    //     const revealVByte = 165;
    //     const pubKeyStr = "93bc6f8a5d30a5ce9461f9253a21d051488a79981b4e75ca2288f9015ad5f615";


    //     const { revealTxHex, revealTxID } = await createRawRevealTx({
    //         internalPubKey: Buffer.from(pubKeyStr, "hex"),
    //         feeRatePerByte: 6,
    //         commitTxID,
    //         hashLockPriKey,
    //         hashLockRedeemScriptHex,
    //         revealVByte,
    //     });
    //     console.log("revealTxHex: ", revealTxHex);
    //     console.log("revealTxID: ", revealTxID);


    //     // 02000000000101de1fa11b2a19b93a68479647362fd30c3dc02b7feed0a815c0ee8a428d3ff04d0000000000ffffffff02c607000000000000225120c9d0617d69813e470d8e20fc98c17bfb2c49b244676ece0d86b93746eccee52cae1b0000000000002251208c01707281b6e3cd68b62f24c1b356857497dcba9b4a181532450890527d97f801402208496f96813c1b2258c9aeacca7c6d5be99e8f53b0f78b2199bc32542f9189520e252a39aa3c56ec777e6f92f887f83b83fe2075180f1799f2f3cb0bcfffed00000000


    // });

    // it("abc", () => {
    //     const hash_lock_keypair: ECPairInterface = ECPair.makeRandom({ network });
    //     const privateKeyWIF: string = hash_lock_keypair.toWIF();

    //     const keyPair = ECPair.fromWIF(privateKeyWIF);
    //     console.log("hash_lock_keypair: ", hash_lock_keypair);
    //     console.log("keyPair: ", keyPair);

    //     // assert.equal(hash_lock_keypair, keyPair);


    // })


});