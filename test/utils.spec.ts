import { assert } from "chai";

import {
    networks,
    payments,
    Psbt
} from "bitcoinjs-lib";
import { broadcastTx, fromSat } from "../src/index";
const network = networks.bitcoin;  // mainnet


describe("Broadcast Tx Tests", async () => {
    it("Must return error", async () => {
        const txHex = "020000000001042753e3ff7ce580974f6be8a4217b0dead005a7777a66780c784770fbbfd04b440000000000ffffffffc900d2e9f80251bdd91a2f60a28a34de123df5cee237c8d43fd835c02d52db1b0000000000ffffffffb2a4c3c7bf5f71aa9ac52fe8bf02ef6fc8c3833c035f730dee81b68607b3f2430000000000ffffffff2753e3ff7ce580974f6be8a4217b0dead005a7777a66780c784770fbbfd04b440100000000ffffffff05e20a0000000000002251209296a808da18058233515c4d90a1b3bf24a136364a10306da503be88b2068f9234080000000000002251201b1cf94fe0f0aec24646e7f2428246d9ec1129c870daacfa78cd694eef48f84ce8030000000000002251200c1ce68358188765ffb523f834ef00c9e7e72d70619a6896d51f18d7bce638d8e8030000000000002251209296a808da18058233515c4d90a1b3bf24a136364a10306da503be88b2068f9218300000000000002251209296a808da18058233515c4d90a1b3bf24a136364a10306da503be88b2068f920140dbfa53114e6480e377289ab5088eb5c8f451aa09786deb2dc510b50dd82dd8f042428419ff1944cbbf20fe6578ae02b75e4d1c923c64e70c7c046308f66e36740141c5083b59e5fb215d3bdcb458063b2d6275c2797841ddf43f86131a3fcb1b7967e00ea56b0d983388451c0033122b689d93b8b0e9112d056d65791d2079cdd0bf8301416df3dc54a577da209cc2e5fba353009a18a39d35fa077d09b6983228dffd58fc5f079282322f87ffcfb865f5c6b03a5b78dbac90d226a481475fb0367125a213830140c6cee3dfd23cca507bf93f4dc7960bfa1680afa921c4964ef37953c4a15fdcc0036268f462d458f8e8dc0e46b224bceaa5837cbdcca59d2520c0ef1f034e9fe400000000";
        let er;
        try {
            const res = await broadcastTx(txHex);
            console.log("res: ", res);
        } catch (e) {
            er = e;
        }

        assert.notEqual(er, null);
    })
});

describe("Convert from sat Tests", async () => {
    it("should return 0.00001", async () => {
        const amt = 1000;
        const res = fromSat(amt);
        console.log("res: ", res);

        assert.equal(res, 0.00001);

        const arr = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        // const arr = [0];
        const newArr = arr.splice(0, arr.length - 1);
        console.log("arr: ", arr);
        console.log("newArr: ", newArr);
    })
});



