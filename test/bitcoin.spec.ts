
import { MinSatInscription } from '../src/bitcoin/constants';
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
    value: 10000
  },
  // inscription UTXOs
  {
    tx_hash: "b44b7b9688ee1203f58de75dce01e954891f4a118cb4adfa9803334fef660e25",
    block_height: 777766,
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
  "b44b7b9688ee1203f58de75dce01e954891f4a118cb4adfa9803334fef660e25:0": [{ id: "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0", offset: 0 }],
  "dd1d3dfce672ccdeabf0b4d96de95045760e465ab359171132fb3dbff232ab09:0": [{ id: "dd1d3dfce672ccdeabf0b4d96de95045760e465ab359171132fb3dbff232ab09i1", offset: 1 }]
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

  it("should return 1 selected UTXO - isUseInscriptionPayFeeParam = true", () => {
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
    assert.equal(valueOutInscription >= MinSatInscription, true);
    assert.equal(changeAmount, 0);
  });

  it("insciption offset = 0 : should return 2 selected UTXOs (insciption & medium UTXO) - isUseInscriptionPayFeeParam = false", () => {
    let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
    let isUseInscriptionPayFeeParam = false;

    const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
      UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

    let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
    actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

    let actualInscriptionInfos = inscriptions[actualTxIDKey];
    let actualInscriptionID = actualInscriptionInfos[0].id;

    assert.equal(selectedUTXOs.length, 2);
    assert.equal(actualInscriptionID, sendInscriptionID);

    assert.equal(selectedUTXOs[1].value, 2000);
    assert.equal(fee, 1332);
    assert.equal(isUseInscriptionPayFee, false);
    assert.equal(valueOutInscription, 5274);
    assert.equal(changeAmount, 2000 - 1332);
  });

  it("insciption offset != 0 : MUST return 2 selected UTXOs (insciption & medium UTXO to pay fee) - isUseInscriptionPayFeeParam = default", () => {
    let sendInscriptionID = "dd1d3dfce672ccdeabf0b4d96de95045760e465ab359171132fb3dbff232ab09i1";
    let isUseInscriptionPayFeeParam = false;

    const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
      UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

    let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
    actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

    let actualInscriptionInfos = inscriptions[actualTxIDKey];
    let actualInscriptionID = actualInscriptionInfos[0].id;

    assert.equal(selectedUTXOs.length, 2);
    assert.equal(actualInscriptionID, sendInscriptionID);
    assert.equal(selectedUTXOs[1].value, 2000);
    assert.equal(fee, 1332);
    assert.equal(isUseInscriptionPayFee, false);
    assert.equal(valueOutInscription, 1234);
    assert.equal(changeAmount, 2000 - 1332);
  });

  it("insciption value is not enough to pay fee : should return 2 selected UTXOs (insciption & biggest UTXO) - isUseInscriptionPayFeeParam default", () => {
    let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
    let isUseInscriptionPayFeeParam = true;
    let feeRatePerByte = 48;

    const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
      UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

    let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
    actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

    let actualInscriptionInfos = inscriptions[actualTxIDKey];
    let actualInscriptionID = actualInscriptionInfos[0].id;

    assert.equal(selectedUTXOs.length, 2);
    assert.equal(actualInscriptionID, sendInscriptionID);

    assert.equal(selectedUTXOs[1].value, 10000);
    assert.equal(fee, 10000);
    assert.equal(isUseInscriptionPayFee, false);
    assert.equal(valueOutInscription, 5274);
    assert.equal(changeAmount, 10000 - fee);
  });

  it("insciption offset 0 - send amount > 0: should return 2 selected UTXOs (insciption &  medium  UTXO) - isUseInscriptionPayFeeParam default", () => {
    let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
    let isUseInscriptionPayFeeParam = true;
    let feeRatePerByte = 6;
    let sendAmount = 100;

    const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
      UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

    let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
    actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

    let actualInscriptionInfos = inscriptions[actualTxIDKey];
    let actualInscriptionID = actualInscriptionInfos[0].id;

    assert.equal(selectedUTXOs.length, 2);
    assert.equal(actualInscriptionID, sendInscriptionID);

    assert.equal(selectedUTXOs[1].value, 2000);
    assert.equal(fee, 1590);
    assert.equal(isUseInscriptionPayFee, false);
    assert.equal(valueOutInscription, 5274);
    assert.equal(changeAmount, 2000 - fee - sendAmount);
  });

  it("insciption offset 0 - send amount > 0: should return 3 selected UTXOs (insciption &  multiple UTXO) - isUseInscriptionPayFeeParam default", () => {
    let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
    let isUseInscriptionPayFeeParam = true;
    let feeRatePerByte = 6;
    let sendAmount = 9000;

    const { selectedUTXOs, isUseInscriptionPayFee, valueOutInscription, changeAmount, fee } = selectUTXOs(
      UTXOs, inscriptions, sendInscriptionID, sendAmount, feeRatePerByte, isUseInscriptionPayFeeParam);

    let actualTxIDKey = selectedUTXOs[0].tx_hash.concat(":");
    actualTxIDKey = actualTxIDKey.concat(selectedUTXOs[0].tx_output_n.toString());

    let actualInscriptionInfos = inscriptions[actualTxIDKey];
    let actualInscriptionID = actualInscriptionInfos[0].id;

    assert.equal(selectedUTXOs.length, 3);
    assert.equal(actualInscriptionID, sendInscriptionID);

    assert.equal(selectedUTXOs[1].value, 10000);
    assert.equal(selectedUTXOs[2].value, 2000);
    assert.equal(fee, 1998);
    assert.equal(isUseInscriptionPayFee, false);
    assert.equal(valueOutInscription, 5274);
    assert.equal(changeAmount, 12000 - fee - sendAmount);
  });
});