
import { Inscription } from '../src/bitcoin/types';
import {
  convertPrivateKey,
  createTx,
  broadcastTx,
  UTXO,
  selectUTXOs
} from '../src/index';

import { assert } from "chai";

let UTXOs: UTXO[] = [
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
var senderPrivateKey = Buffer.from([
  
])

let senderAddress = "bc1prvw0jnlq7zhvy3jxuley9qjxm8kpz2wgwrd2e7nce455am6glpxqavdcc9";

let inscriptions: { [key: string]: Inscription[] } = {
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
      const { } = selectUTXOs(UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);
    } catch (e) {
      error = e;
    }
    assert.equal(error?.toString(), "Error: Can not find inscription UTXO for sendInscriptionID");
  });

  it("should return 1 selected UTXO - use inscription to pay fee", () => {
    let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
    console.log("inscriptions: ", inscriptions);

    const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount } = selectUTXOs(
      UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);
    

    let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
    actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

    let actualInscriptionInfos = inscriptions[actualTxIDKey];
    let actualInscriptionID = actualInscriptionInfos[0].id

    assert.equal(selectedUTXOs.length, 1);
    assert.equal(actualInscriptionID, sendInscriptionID);
  });
});



// const TestSendInscriptionFromTaprootAddress = async() => {
//   let txHex = createTx(senderPrivateKey, uxtos, inscriptions, sendInscriptionID, receiverAddress, 4000, 6);

//   // let txID = await broadcastTx(txHex);
//   // console.log(txID);
// }

// TestSendInscriptionFromTaprootAddress()

