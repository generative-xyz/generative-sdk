import {assert} from "chai"
import {selectUTXOs, UTXO, Inscription, createTx, MinSatInscription} from "../src/index"

// for real tx
// let UTXOs: UTXO[] = [
//   // normal UTXOs
//   // real
//   {
//     tx_hash: "9fb225358d6774b3f88b9d8aa1b08f5b976e4f842ec9518f529e36e1b73c1ec9",
//     block_height: 777754,
//     tx_input_n: -1,
//     tx_output_n: 1,
//     value: 1890
//   },

//    // inscription UTXOs
//    // real
//   {
//     tx_hash: "2f6ad85ccffee5a4b5e60662ab8c7694f08a14765bc7a1363e3eefc1a49d2b17",
//     block_height: 777781,
//     tx_input_n: -1,
//     tx_output_n: 0,
//     value: 7225
//   },

 
//    // real
//   {
//     tx_hash: "2c492cef25eff2c5dda21c6af83262c8b7f862cbd91c545a83d527463810cc18",
//     block_height: 777933,
//     tx_input_n: -1,
//     tx_output_n: 0,
//     value: 3054
//   },
// ];

// for unit tests
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
var senderPrivateKey = Buffer.from([
])

let senderAddress = "bc1prvw0jnlq7zhvy3jxuley9qjxm8kpz2wgwrd2e7nce455am6glpxqavdcc9";

let inscriptions: { [key: string]: Inscription[] } = {
  // "2f6ad85ccffee5a4b5e60662ab8c7694f08a14765bc7a1363e3eefc1a49d2b17:0": [{ id: "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0", offset: 0 }],
  // "2c492cef25eff2c5dda21c6af83262c8b7f862cbd91c545a83d527463810cc18:0": [{ id: "dd1d3dfce672ccdeabf0b4d96de95045760e465ab359171132fb3dbff232ab09i1", offset: 0 }]

  "fecd11d6da5404af3574db4d4fd87aa2d4e2a4d4c3d7d6a767474eeea34e55f3:0": [{ id: "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0", offset: 1607 }],
  "dd1d3dfce672ccdeabf0b4d96de95045760e465ab359171132fb3dbff232ab09:0": [{ id: "dd1d3dfce672ccdeabf0b4d96de95045760e465ab359171132fb3dbff232ab09i1", offset: 568 }]
};

let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
let txIDKey = "b44b7b9688ee1203f58de75dce01e954891f4a118cb4adfa9803334fef660e25:0";

let receiverAddress = "bc1qn74ftxrvh862jcre972ulnvmve9ek50ewngwyx"; // segwit
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

  it("inscriptionId is not empty - should return 1 selected UTXO value is enough to pay fee (inscription) - isUseInscriptionPayFeeParam = true", () => {
    let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";

    const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
      UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

    console.log("selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee ", selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee);

    let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
    actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

    let actualInscriptionInfos = inscriptions[actualTxIDKey];
    let actualInscriptionID = actualInscriptionInfos[0].id;

    assert.equal(selectedUTXOs.length, 1);
    assert.equal(actualInscriptionID, sendInscriptionID);
    assert.equal(isUseInscriptionPayFee, true);

    assert.equal(valueOutInscription, 5274 - fee);
    assert.equal(valueOutInscription > 4607, true);
    assert.equal(changeAmount, 0);
  });

  it("inscriptionId is empty && sendAmount > 0 - should return 1 selected normal UTXO - isUseInscriptionPayFeeParam = true", () => {
    let sendInscriptionID = "";
    let sendAmount = 100;

    const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
      UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

    console.log("selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee ", selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee);

    assert.equal(selectedUTXOs.length, 1);
    assert.equal(selectedUTXOs[0].value , 2000);
    assert.equal(isUseInscriptionPayFee, false);
    assert.equal(valueOutInscription, 0);
    assert.equal(fee, 924)
    assert.equal(changeAmount, 2000 - fee - 100);
  });

  it("inscriptionId is not empty - should return 1 selected UTXO value is not enough to pay fee (inscription) - isUseInscriptionPayFeeParam = true", () => {
    let sendInscriptionID = "dd1d3dfce672ccdeabf0b4d96de95045760e465ab359171132fb3dbff232ab09i1";
    let error;
    try {
    const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
      UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);
    } catch (e) {
      error = e;
    }
    assert.equal(error?.toString(), "Error: Your balance is insufficient for covering the network fees.");
  });

  it("inscriptionId is not empty & sendAmount > 0  - should return 1 selected UTXO value is not enough to pay fee (inscription) - isUseInscriptionPayFeeParam = true", () => {
    let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
    let sendAmount = 100;
    let error;
    try {
    const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
      UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);
    } catch (e) {
      error = e;
    }
    assert.equal(error?.toString(), "Error: Don't support send BTC while sending inscription");
  });

  it("inscriptionId is empty && sendAmount = 0 - should return 1 selected UTXO value is not enough to pay fee (inscription) - isUseInscriptionPayFeeParam = true", () => {
    let sendInscriptionID = "";
    let sendAmount = 0;

    let error;
    try {
    const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
      UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);
    } catch (e) {
      error = e;
    }
    assert.equal(error?.toString(), "Error: Payment info is empty");
  });


  // later verison (use multiple input coins to create tx)
//  it("should return 1 selected UTXO - isUseInscriptionPayFeeParam = true", () => {
//     let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";

//     const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
//       UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

//     let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
//     actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

//     let actualInscriptionInfos = inscriptions[actualTxIDKey];
//     let actualInscriptionID = actualInscriptionInfos[0].id;

//     assert.equal(selectedUTXOs.length, 1);
//     assert.equal(actualInscriptionID, sendInscriptionID);
//     assert.equal(isUseInscriptionPayFee, true);
//     assert.equal(valueOutInscription, 5274 - fee);
//     assert.equal(valueOutInscription >= MinSatInscription, true);
//     assert.equal(changeAmount, 0);
//   });

//     it("insciption offset = 0 : should return 2 selected UTXOs (insciption & medium UTXO) - isUseInscriptionPayFeeParam = false", () => {
//       let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
//       let isUseInscriptionPayFeeParam = false;

//       const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
//         UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

//       let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
//       actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

//       let actualInscriptionInfos = inscriptions[actualTxIDKey];
//       let actualInscriptionID = actualInscriptionInfos[0].id;

//       assert.equal(selectedUTXOs.length, 2);
//       assert.equal(actualInscriptionID, sendInscriptionID);

//       assert.equal(selectedUTXOs[1].value, 2000);
//       assert.equal(fee, 1332);
//       assert.equal(isUseInscriptionPayFee, false);
//       assert.equal(valueOutInscription, 5274);
//       assert.equal(changeAmount, 2000 - 1332);
//     });

//     it("insciption offset != 0 : MUST return 2 selected UTXOs (insciption & medium UTXO to pay fee) - isUseInscriptionPayFeeParam = default", () => {
//       let sendInscriptionID = "dd1d3dfce672ccdeabf0b4d96de95045760e465ab359171132fb3dbff232ab09i1";
//       let isUseInscriptionPayFeeParam = false;

//       const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
//         UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

//       let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
//       actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

//       let actualInscriptionInfos = inscriptions[actualTxIDKey];
//       let actualInscriptionID = actualInscriptionInfos[0].id;

//       assert.equal(selectedUTXOs.length, 2);
//       assert.equal(actualInscriptionID, sendInscriptionID);
//       assert.equal(selectedUTXOs[1].value, 2000);
//       assert.equal(fee, 1332);
//       assert.equal(isUseInscriptionPayFee, false);
//       assert.equal(valueOutInscription, 1234);
//       assert.equal(changeAmount, 2000 - 1332);
//     });

//     it("insciption value is not enough to pay fee : should return 2 selected UTXOs (insciption & biggest UTXO) - isUseInscriptionPayFeeParam default", () => {
//       let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
//       let isUseInscriptionPayFeeParam = true;
//       let feeRatePerByte = 48;

//       const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
//         UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

//       let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
//       actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

//       let actualInscriptionInfos = inscriptions[actualTxIDKey];
//       let actualInscriptionID = actualInscriptionInfos[0].id;

//       assert.equal(selectedUTXOs.length, 2);
//       assert.equal(actualInscriptionID, sendInscriptionID);

//       assert.equal(selectedUTXOs[1].value, 10000);
//       assert.equal(fee, 10000);
//       assert.equal(isUseInscriptionPayFee, false);
//       assert.equal(valueOutInscription, 5274);
//       assert.equal(changeAmount, 10000 - fee);
//     });

//     it("insciption offset 0 - send amount > 0: should return 2 selected UTXOs (insciption &  medium  UTXO) - isUseInscriptionPayFeeParam default", () => {
//       let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
//       let isUseInscriptionPayFeeParam = true;
//       let feeRatePerByte = 6;
//       let sendAmount = 100;

//       const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
//         UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

//       let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
//       actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

//       let actualInscriptionInfos = inscriptions[actualTxIDKey];
//       let actualInscriptionID = actualInscriptionInfos[0].id;

//       assert.equal(selectedUTXOs.length, 2);
//       assert.equal(actualInscriptionID, sendInscriptionID);

//       assert.equal(selectedUTXOs[1].value, 2000);
//       assert.equal(fee, 1590);
//       assert.equal(isUseInscriptionPayFee, false);
//       assert.equal(valueOutInscription, 5274);
//       assert.equal(changeAmount, 2000 - fee - sendAmount);
//     });

//     it("insciption offset 0 - send amount > 0: should return 3 selected UTXOs (insciption &  multiple UTXO) - isUseInscriptionPayFeeParam default", () => {
//       let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
//       let isUseInscriptionPayFeeParam = true;
//       let feeRatePerByte = 6;
//       let sendAmount = 9000;

//       const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
//         UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

//       let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
//       actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

//       let actualInscriptionInfos = inscriptions[actualTxIDKey];
//       let actualInscriptionID = actualInscriptionInfos[0].id;

//       assert.equal(selectedUTXOs.length, 3);
//       assert.equal(actualInscriptionID, sendInscriptionID);

//       assert.equal(selectedUTXOs[1].value, 10000);
//       assert.equal(selectedUTXOs[2].value, 2000);
//       assert.equal(fee, 1998);
//       assert.equal(isUseInscriptionPayFee, false);
//       assert.equal(valueOutInscription, 5274);
//       assert.equal(changeAmount, 12000 - fee - sendAmount);
//     });



    // it("create tx should return 1 selected UTXO - isUseInscriptionPayFeeParam = true", () => {
    //   let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";

    //   // const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
    //   //   UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

  // it("send BTC - should return 1 selected UTXO - isUseInscriptionPayFeeParam = true", () => {
  //   let sendInscriptionID = "";
  //   let sendAmount = 966;

  //   // const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
  //   //   UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

  //   const { txID, txHex, fee: feeRes } = createTx(senderPrivateKey, UTXOs, inscriptions, sendInscriptionID, receiverAddress, sendAmount, 6, true);
  //   console.log(txID, txHex, feeRes);



    //  generateAddress(senderPrivateKey);
});