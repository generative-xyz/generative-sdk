import { createPSBTToSale, createPSBTToBuy, UTXO, network } from "../dist/index";
import { Psbt } from "bitcoinjs-lib";
import { assert } from "chai";


// for unit tests
let sellerUTXOs = [
    // normal UTXOs
    {
        tx_hash: "228a956320c18970c71e44ba1185b2a0e810127be0328b8e3668bd4691a069e5",
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

// for unit tests
let buyerUTXOs = [
    // normal UTXOs
    {
        tx_hash: "228a956320c18970c71e44ba1185b2a0e810127be0328b8e3668bd4691a069e5",
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

var buyerPrivateKey = Buffer.from([]);
let buyerAddress = "bc1prvw0jnlq7zhvy3jxuley9qjxm8kpz2wgwrd2e7nce455am6glpxqavdcc9";

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
    it("should return error Can not find inscription UTXO for sendInscriptionID", () => {

        // first, seller create the transaction
        let error = null;
        let signedTx = "";
        let signedTx2 = "";
        let txID = "";
        let txHex = "";
        let fee = 0;

        let ordinalUTXO: UTXO =
        {
            tx_hash: "fecd11d6da5404af3574db4d4fd87aa2d4e2a4d4c3d7d6a767474eeea34e55f3",
            tx_output_n: 0,
            value: 5274
        };
        const price = 1000;

        try {
            signedTx = createPSBTToSale({
                ordinalInput: ordinalUTXO,
                price: price,
                sellerAddress: sellerAddress,
                sellerPrivateKey: sellerPrivateKey
            });
            console.log(signedTx);
        } catch (e) {
            error = e;
            console.log("create tx sell error: ", e);
        }
        assert.equal(error, null);
        assert.equal(signedTx.length > 0, true);

        // next, seller create the transaction

        // let dummyUTXO: UTXO =
        // {
        //     tx_hash: "228a956320c18970c71e44ba1185b2a0e810127be0328b8e3668bd4691a069e5",
        //     tx_output_n: 1,
        //     value: 1000
        // };
        // let paymentUTXO = {
        //     tx_hash: "228a956320c18970c71e44ba1185b2a0e810127be0328b8e3668bd4691a069e5",
        //     tx_output_n: 2,
        //     value: 4000
        // };

        // let sellerSignedPsbt = Psbt.fromBase64(signedTx, { network })

        // try {
        //     const res = createPSBTToBuy({
        //         sellerSignedPsbt: sellerSignedPsbt,
        //         buyerPrivateKey: buyerPrivateKey,
        //         buyerAddress: buyerAddress,
        //         sellerAddress: sellerAddress,
        //         valueInscription: 5274,
        //         price: price,
        //         paymentUtxos: [paymentUTXO],
        //         dummyUtxo: dummyUTXO,
        //         feeRate: 4,
        //     });
        //     // txId = res.txId;
        //     // {txID, txHex, fee} = res;
        //     // console.log(signedTx2);
        //     console.log(res);
        // } catch (e) {
        //     error = e;
        //     console.log(error);
        // }

        // assert.equal(error, null);
        // assert.equal(signedTx2.length > 0, true);


    });
});


