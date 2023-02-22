"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
const chai_1 = require("chai");
let UTXOs = [
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
        value: 3000
    },
    // inscription UTXOs
    {
        tx_hash: "b44b7b9688ee1203f58de75dce01e954891f4a118cb4adfa9803334fef660e25",
        block_height: 777766,
        tx_input_n: -1,
        tx_output_n: 0,
        value: 5274
    },
];
// TODO: fill the private key
var senderPrivateKey = Buffer.from([]);
let senderAddress = "bc1prvw0jnlq7zhvy3jxuley9qjxm8kpz2wgwrd2e7nce455am6glpxqavdcc9";
let inscriptions = {
    "b44b7b9688ee1203f58de75dce01e954891f4a118cb4adfa9803334fef660e25:0": [{ id: "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0", offset: 0 }]
};
let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
let txIDKey = "b44b7b9688ee1203f58de75dce01e954891f4a118cb4adfa9803334fef660e25:0";
let receiverAddress = "bc1prvw0jnlq7zhvy3jxuley9qjxm8kpz2wgwrd2e7nce455am6glpxqavdcc9"; // same as sender
let feeRatePerByte = 6;
let sendAmount = 0;
let isUseInscriptionPayFeeParam = true;
describe("Selecting UTXOs Tests", () => {
    it("should return error Can not find inscription UTXO for sendInscriptionID", () => {
        let sendInscriptionID = "not-found-id";
        let error;
        try {
            const {} = (0, index_1.selectUTXOs)(UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);
        }
        catch (e) {
            error = e;
        }
        chai_1.assert.equal(error === null || error === void 0 ? void 0 : error.toString(), "Error: Can not find inscription UTXO for sendInscriptionID");
    });
    it("should return 1 selected UTXO - use inscription to pay fee", () => {
        let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
        console.log("inscriptions: ", inscriptions);
        const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount } = (0, index_1.selectUTXOs)(UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);
        let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
        actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());
        let actualInscriptionInfos = inscriptions[actualTxIDKey];
        let actualInscriptionID = actualInscriptionInfos[0].id;
        chai_1.assert.equal(selectedUTXOs.length, 1);
        chai_1.assert.equal(actualInscriptionID, sendInscriptionID);
    });
});
// const TestSendInscriptionFromTaprootAddress = async() => {
//   let txHex = createTx(senderPrivateKey, uxtos, inscriptions, sendInscriptionID, receiverAddress, 4000, 6);
//   // let txID = await broadcastTx(txHex);
//   // console.log(txID);
// }
// TestSendInscriptionFromTaprootAddress()
