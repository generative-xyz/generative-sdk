import { assert } from "chai";

import {
    networks,
    payments,
    Psbt
} from "bitcoinjs-lib";
import { setEnvironmentData } from "worker_threads";
const network = networks.bitcoin;  // mainnet


describe("Calculator Tests", () => {
    it("should return 5 when 2 is added to 3", () => {
    const result = 5;
    assert.equal(result, 5);
 });
});


describe("Psbt test", () => {
    it("should return 5 when 2 is added to 3", () => {
        let sellerSignedPsbtBase64  = "cHNidP8BAF4CAAAAASStirqVDHOWnSGHnIvXJVvwjhpZ5v2Or75UkHwdoy/MAAAAAAD/////AQAtMQEAAAAAIlEglezdRu5yxli+1EPqnhKaUA5SjS4pGvsIFE4KX1Fs+G4AAAAAAAEAogEAAAAAAQE0fKfBDjiTQwWbgeZOZPNTIGTxyfYZQs5FWASHEfHg5AAAAAAA/f///wGPIAAAAAAAACJRIJXs3UbucsZYvtRD6p4SmlAOUo0uKRr7CBROCl9RbPhuAUAcID1HH1o+ESYE6clZbzbVQL175XHv2Aq10uKmCWpQTIf8GzvbCxRzX6EO3Pi+7q8iuiB/kOVpQcE0r4sqBFdbAAAAAAEDBIMAAAAAAA==";


        let sellerSignedPsbt = Psbt.fromBase64(sellerSignedPsbtBase64, { network });

        let tx = sellerSignedPsbt.data.globalMap.unsignedTx;

        console.log("txinputs txout", sellerSignedPsbt.txInputs);
        console.log("txinputs txout", sellerSignedPsbt.txOutputs);


        // console.log(sellerSignedPsbt);
        let data = sellerSignedPsbt.data;
        console.log("inputs ", data.inputs.length, data.inputs);
        console.log("outputs ", data.outputs.length, data.outputs, data.outputs[0]);
        console.log("unsignedTx ", data.globalMap.unsignedTx.toBuffer());
 });
});


