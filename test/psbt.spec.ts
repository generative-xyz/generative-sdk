import { createPSBTToSale, createPSBTToBuy, UTXO, network, convertPrivateKeyFromStr, convertPrivateKey } from "../dist/index";
import { Psbt } from "bitcoinjs-lib";
import { assert } from "chai";


// for unit tests
let sellerUTXOs = [
    // inscription UTXOs
    // real
    {
        tx_hash: "be6360fc87a5e81ef88b9dfbf6b299556af19476a68a3dbd24725f3422f1124e",
        tx_output_n: 0,
        value: 390
    },
];

// for unit tests
let buyerUTXOs = [
    // normal UTXOs
    {
        tx_hash: "c4fcd8281a48803a3c87a4dcd8bad4ac4d4d5473e17d674ea1fac372c93e1681",
        block_height: 777754,
        tx_input_n: -1,
        tx_output_n: 1,
        value: 1000
    },
    {
        tx_hash: "228a956320c18970c71e44ba1185b2a0e810127be0328b8e3668bd4691a069e5",
        block_height: 777754,
        tx_input_n: -1,
        tx_output_n: 2,
        value: 2000
    },
    {
        tx_hash: "228a956320c18970c71e44ba1185b2a0e810127be0328b8e3668bd4691a069e5",
        block_height: 777754,
        tx_input_n: -1,
        tx_output_n: 3,
        value: 10000
    },
    // inscription UTXOs
    // real
    {
        tx_hash: "fecd11d6da5404af3574db4d4fd87aa2d4e2a4d4c3d7d6a767474eeea34e55f3",
        block_height: 777918,
        tx_input_n: -1,
        tx_output_n: 0,
        value: 5274
    },

    {
        tx_hash: "dd1d3dfce672ccdeabf0b4d96de95045760e465ab359171132fb3dbff232ab09",
        block_height: 777766,
        tx_input_n: -1,
        tx_output_n: 0,  // offset != 0
        value: 1234
    },
];

// TODO: fill the private key
var sellerPrivateKey = Buffer.from([]);
let sellerAddress = "bc1prvw0jnlq7zhvy3jxuley9qjxm8kpz2wgwrd2e7nce455am6glpxqavdcc9";

let buyerPrivateKeyWIF = "";
let buyerAddress = "bc1pj2t2szx6rqzcyv63t3xepgdnhuj2zd3kfggrqmd9qwlg3vsx37fqywwhyx";
let buyerPrivateKey = convertPrivateKeyFromStr(buyerPrivateKeyWIF);

let inscriptions = {
    "fecd11d6da5404af3574db4d4fd87aa2d4e2a4d4c3d7d6a767474eeea34e55f3:0": [{
        id: "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0",
        offset: 4607
    }],
    "dd1d3dfce672ccdeabf0b4d96de95045760e465ab359171132fb3dbff232ab09:0": [{
        id: "dd1d3dfce672ccdeabf0b4d96de95045760e465ab359171132fb3dbff232ab09i1",
        offset: 568
    }]
};

let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
let txIDKey = "b44b7b9688ee1203f58de75dce01e954891f4a118cb4adfa9803334fef660e25:0";

let receiverAddress = "bc1qn74ftxrvh862jcre972ulnvmve9ek50ewngwyx"; // segwit
let feeRatePerByte = 6;
let sendAmount = 0;
let isUseInscriptionPayFeeParam = true;

describe("Buy and Sell inscription with PSBT", () => {
    it("should return the hex tx", () => {

        // first, seller create the transaction
        let error = null;
        let signedTx = "";
        let signedTx2 = "";
        let txID = "";
        let txHex = "";
        let fee = 0;

        let ordinalUTXO: UTXO =
        {
            tx_hash: "be6360fc87a5e81ef88b9dfbf6b299556af19476a68a3dbd24725f3422f1124e",
            tx_output_n: 0,
            value: 390
        }
        const price = 1078;

        try {
            signedTx = createPSBTToSale({
                ordinalInput: ordinalUTXO,
                price: price,
                sellerAddress: sellerAddress,
                sellerPrivateKey: sellerPrivateKey,
                dummyUTXO: null,
                creatorAddress: "",
                feeForCreator: 0,
            });
            console.log(signedTx);
        } catch (e) {
            error = e;
            console.log("create tx sell error: ", e);
        }
        assert.equal(error, null);
        assert.equal(signedTx.length > 0, true);

        // next, buyer create the transaction

        let dummyUTXO: UTXO =
        {
            tx_hash: "c4fcd8281a48803a3c87a4dcd8bad4ac4d4d5473e17d674ea1fac372c93e1681",
            tx_output_n: 0,
            value: 1000
        };
        let paymentUTXO = {
            tx_hash: "c4fcd8281a48803a3c87a4dcd8bad4ac4d4d5473e17d674ea1fac372c93e1681",
            tx_output_n: 1,
            value: 4076
        };

        let sellerSignedPsbt = Psbt.fromBase64(signedTx, { network })
        console.log("sellerSignedPsbt: ", sellerSignedPsbt.data.inputs[0]);
        console.log("sellerSignedPsbt: ", sellerSignedPsbt.data.globalMap.unsignedTx.toBuffer());

        try {
            const res = createPSBTToBuy({
                sellerSignedPsbt: sellerSignedPsbt,
                buyerPrivateKey: buyerPrivateKey,
                buyerAddress: buyerAddress,
                valueInscription: ordinalUTXO.value,
                price: price,
                paymentUtxos: [paymentUTXO],
                dummyUtxo: dummyUTXO,
                feeRate: 6,
            });
            txID = res.txID;
            txHex = res.txHex;
            fee = res.fee;

            // console.log(signedTx2);
            console.log(res);
        } catch (e) {
            error = e;
            console.log(error);
        }

        assert.equal(error, null);


    });
});


