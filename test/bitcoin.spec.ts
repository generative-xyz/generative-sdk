
import { MinSatInscription } from '../src/bitcoin/constants';
import { Inscription } from '../src/bitcoin/types';
import {
  convertPrivateKey,
  createTx,
  broadcastTx,
  UTXO,
  selectUTXOs,
  generateTaprootAddress,
} from '../src/index';

import { assert } from "chai";

// for real tx
// let UTXOs: UTXO[] = [
//   // normal UTXOs
//   // real
//   {
//     tx_hash: "228a956320c18970c71e44ba1185b2a0e810127be0328b8e3668bd4691a069e5",
//     block_height: 777754,
//     tx_input_n: -1,
//     tx_output_n: 1,
//     value: 3000
//   },
//    // real
//   {
//     tx_hash: "66bf54e9d509f936aafd5ed923e7af944a9b2eaeb95e22b4bcff412fd10fab3a",
//     block_height: 777781,
//     tx_input_n: -1,
//     tx_output_n: 0,
//     value: 8335
//   },

//   // inscription UTXOs
//    // real
//   {
//     tx_hash: "9fb225358d6774b3f88b9d8aa1b08f5b976e4f842ec9518f529e36e1b73c1ec9",
//     block_height: 777933,
//     tx_input_n: -1,
//     tx_output_n: 0,
//     value: 4608
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
  "fecd11d6da5404af3574db4d4fd87aa2d4e2a4d4c3d7d6a767474eeea34e55f3:0": [{ id: "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0", offset: 4607 }],
  "dd1d3dfce672ccdeabf0b4d96de95045760e465ab359171132fb3dbff232ab09:0": [{ id: "dd1d3dfce672ccdeabf0b4d96de95045760e465ab359171132fb3dbff232ab09i1", offset: 1200 }]
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
  it("inscriptionId is not empty - should return 1 selected UTXO value is not enough to pay fee (inscription) - isUseInscriptionPayFeeParam = true", () => {
    let sendInscriptionID = "dd1d3dfce672ccdeabf0b4d96de95045760e465ab359171132fb3dbff232ab09i1";

    const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
      UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

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

  // it("should return 1 selected UTXO - isUseInscriptionPayFeeParam = true", () => {
  //   let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";

  //   const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
  //     UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

  //   let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
  //   actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

  //   let actualInscriptionInfos = inscriptions[actualTxIDKey];
  //   let actualInscriptionID = actualInscriptionInfos[0].id;

  //   assert.equal(selectedUTXOs.length, 1);
  //   assert.equal(actualInscriptionID, sendInscriptionID);
  //   assert.equal(isUseInscriptionPayFee, true);
  //   assert.equal(valueOutInscription, 5274 - fee);
  //   assert.equal(valueOutInscription >= MinSatInscription, true);
  //   assert.equal(changeAmount, 0);
  // });

  // it("insciption offset = 0 : should return 2 selected UTXOs (insciption & medium UTXO) - isUseInscriptionPayFeeParam = false", () => {
  //   let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
  //   let isUseInscriptionPayFeeParam = false;

  //   const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
  //     UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

  //   let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
  //   actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

  //   let actualInscriptionInfos = inscriptions[actualTxIDKey];
  //   let actualInscriptionID = actualInscriptionInfos[0].id;

  //   assert.equal(selectedUTXOs.length, 2);
  //   assert.equal(actualInscriptionID, sendInscriptionID);

  //   assert.equal(selectedUTXOs[1].value, 2000);
  //   assert.equal(fee, 1332);
  //   assert.equal(isUseInscriptionPayFee, false);
  //   assert.equal(valueOutInscription, 5274);
  //   assert.equal(changeAmount, 2000 - 1332);
  // });

  // it("insciption offset != 0 : MUST return 2 selected UTXOs (insciption & medium UTXO to pay fee) - isUseInscriptionPayFeeParam = default", () => {
  //   let sendInscriptionID = "dd1d3dfce672ccdeabf0b4d96de95045760e465ab359171132fb3dbff232ab09i1";
  //   let isUseInscriptionPayFeeParam = false;

  //   const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
  //     UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

  //   let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
  //   actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

  //   let actualInscriptionInfos = inscriptions[actualTxIDKey];
  //   let actualInscriptionID = actualInscriptionInfos[0].id;

  //   assert.equal(selectedUTXOs.length, 2);
  //   assert.equal(actualInscriptionID, sendInscriptionID);
  //   assert.equal(selectedUTXOs[1].value, 2000);
  //   assert.equal(fee, 1332);
  //   assert.equal(isUseInscriptionPayFee, false);
  //   assert.equal(valueOutInscription, 1234);
  //   assert.equal(changeAmount, 2000 - 1332);
  // });

  // it("insciption value is not enough to pay fee : should return 2 selected UTXOs (insciption & biggest UTXO) - isUseInscriptionPayFeeParam default", () => {
  //   let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
  //   let isUseInscriptionPayFeeParam = true;
  //   let feeRatePerByte = 48;

  //   const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
  //     UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

  //   let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
  //   actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

  //   let actualInscriptionInfos = inscriptions[actualTxIDKey];
  //   let actualInscriptionID = actualInscriptionInfos[0].id;

  //   assert.equal(selectedUTXOs.length, 2);
  //   assert.equal(actualInscriptionID, sendInscriptionID);

  //   assert.equal(selectedUTXOs[1].value, 10000);
  //   assert.equal(fee, 10000);
  //   assert.equal(isUseInscriptionPayFee, false);
  //   assert.equal(valueOutInscription, 5274);
  //   assert.equal(changeAmount, 10000 - fee);
  // });

  // it("insciption offset 0 - send amount > 0: should return 2 selected UTXOs (insciption &  medium  UTXO) - isUseInscriptionPayFeeParam default", () => {
  //   let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
  //   let isUseInscriptionPayFeeParam = true;
  //   let feeRatePerByte = 6;
  //   let sendAmount = 100;

  //   const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
  //     UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

  //   let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
  //   actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

  //   let actualInscriptionInfos = inscriptions[actualTxIDKey];
  //   let actualInscriptionID = actualInscriptionInfos[0].id;

  //   assert.equal(selectedUTXOs.length, 2);
  //   assert.equal(actualInscriptionID, sendInscriptionID);

  //   assert.equal(selectedUTXOs[1].value, 2000);
  //   assert.equal(fee, 1590);
  //   assert.equal(isUseInscriptionPayFee, false);
  //   assert.equal(valueOutInscription, 5274);
  //   assert.equal(changeAmount, 2000 - fee - sendAmount);
  // });

  // it("insciption offset 0 - send amount > 0: should return 3 selected UTXOs (insciption &  multiple UTXO) - isUseInscriptionPayFeeParam default", () => {
  //   let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
  //   let isUseInscriptionPayFeeParam = true;
  //   let feeRatePerByte = 6;
  //   let sendAmount = 9000;

  //   const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
  //     UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

  //   let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
  //   actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

  //   let actualInscriptionInfos = inscriptions[actualTxIDKey];
  //   let actualInscriptionID = actualInscriptionInfos[0].id;

  //   assert.equal(selectedUTXOs.length, 3);
  //   assert.equal(actualInscriptionID, sendInscriptionID);

  //   assert.equal(selectedUTXOs[1].value, 10000);
  //   assert.equal(selectedUTXOs[2].value, 2000);
  //   assert.equal(fee, 1998);
  //   assert.equal(isUseInscriptionPayFee, false);
  //   assert.equal(valueOutInscription, 5274);
  //   assert.equal(changeAmount, 12000 - fee - sendAmount);
  // });

  // it("create tx should return 1 selected UTXO - isUseInscriptionPayFeeParam = true", () => {
  //   let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";

  //   // const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
  //   //   UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

  //   const { txID, txHex, fee: feeRes } = createTx(senderPrivateKey, UTXOs, inscriptions, sendInscriptionID, receiverAddress, 0, 5, false);
  //   console.log(txID, txHex, feeRes);

  //   //  generateAddress(senderPrivateKey);
  // });
});