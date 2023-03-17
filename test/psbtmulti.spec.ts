import {
    createPSBTToSell,
    createPSBTToBuy,
    UTXO, network,
    convertPrivateKeyFromStr,
    convertPrivateKey,
    reqListForSaleInscription,
    reqBuyInscription, DummyUTXOValue, broadcastTx,
    BuyReqInfo, reqBuyMultiInscriptions
} from "../src/index";
import { Psbt } from "bitcoinjs-lib";
import { assert } from "chai";
import BigNumber from 'bignumber.js';
require("dotenv").config({ path: __dirname + "/.env" });
console.log(__dirname + "../test/.env");


// for real
// let sellerUTXOs = [
//     // inscription UTXOs
//     // real
//     {
//         tx_hash: "48acb493580784a4c4fc43e14fae475fc334fba813558015fc781e06a06b9cdd",
//         tx_output_n: 0,
//         value: new BigNumber(4118), // normal
//     },
//     {
//         tx_hash: "e7df697d79503a9e9b1e090fc0918703ed0aedecf7c063143ee9c359417f5ac7",
//         tx_output_n: 0,
//         value: new BigNumber(1000),
//     },
// ];

// let sellerInsciptions = {
//     "48acb493580784a4c4fc43e14fae475fc334fba813558015fc781e06a06b9cdd:0": [
//         {
//             id: "b4e20295fa3c738490cf1d8a542a9a1354affa649f601866b12c092a956de1c3i0",
//             offset: new BigNumber(1000),
//             sat: 1277661004849427
//         }
//     ],
// }

// let buyerUTXOs = [
//     {
//         tx_hash: "541372eeed02266920038467388a8ea0d132923f37e3b710a8e6d4ff7ac8836e",
//         tx_output_n: 1,
//         value: new BigNumber(11800), // normal
//     },
// ];

// let buyerInscriptions = {
//     // "4963e4ec3bf2599c542259ad5cc393ceef6a1dfea1aa0df2c3533a27d173aeee:0": [
//     //     {
//     //         id: "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0",
//     //         offset: 1000,
//     //         sat: 486840414210370
//     //     }
//     // ]
// }


// for unit tests
let sellerUTXOs = [
    // inscription UTXOs
    // real

    // {
    //     tx_hash: "4963e4ec3bf2599c542259ad5cc393ceef6a1dfea1aa0df2c3533a27d173aeee",
    //     tx_output_n: 1,
    //     value: 1078, // normal
    // },
    {
        tx_hash: "1bdb522dc035d83fd4c837e2cef53d12de348aa2602f1ad9bd5102f8e9d200c9",
        tx_output_n: 0,
        value: new BigNumber(1234),
    },
    {
        tx_hash: "300ec1c7401199c356072efa4b38387d38211dad8b0970372772ba5f4164d3f3",
        tx_output_n: 0,
        value: new BigNumber(2345),
    },
    {
        tx_hash: "b475e4fef1a1095c1cc48ebc1f7b502fce62c2f7e403b6bed12b02fe1652028f",
        tx_output_n: 0,
        value: new BigNumber(5678),
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

let sellerInsciptions = {
    "1bdb522dc035d83fd4c837e2cef53d12de348aa2602f1ad9bd5102f8e9d200c9:0": [
        {
            id: "73168fb8c16f6990eaf54122492cd5768a17f3801a32d01712e22869094a94fci0",
            offset: new BigNumber(0),
            sat: 1277661004849427
        }
    ],
    "300ec1c7401199c356072efa4b38387d38211dad8b0970372772ba5f4164d3f3:0": [
        {
            id: "b4e20295fa3c738490cf1d8a542a9a1354affa649f601866b12c092a956de1c3i0",
            offset: new BigNumber(0),
            sat: 1392873619146836
        }
    ],
    "b475e4fef1a1095c1cc48ebc1f7b502fce62c2f7e403b6bed12b02fe1652028f:0": [
        {
            id: "8f93fc0dbe146b84bc2c5275ffb803aedb8cc60c641c794fba06cd125676c47ei0",
            offset: new BigNumber(0),
            sat: 1277661004899817
        }
    ]
}

// for unit tests
let buyerUTXOs = [
    {
        tx_hash: "4963e4ec3bf2599c542259ad5cc393ceef6a1dfea1aa0df2c3533a27d173aeee",
        tx_output_n: 0,
        value: new BigNumber(2000), // normal
    },
    {
        tx_hash: "4963e4ec3bf2599c542259ad5cc393ceef6a1dfea1aa0df2c3533a27d173aeee",
        tx_output_n: 1,
        value: new BigNumber(2000), // normal
    },
    {
        tx_hash: "3edce14398749454d105241212d46aad8a513f41dd38d84ebef452000b28c777",
        tx_output_n: 0,
        value: new BigNumber(10000), // normal
    }
];

let buyerInscriptions = {
    "4963e4ec3bf2599c542259ad5cc393ceef6a1dfea1aa0df2c3533a27d173aeee:0": [
        {
            id: "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0",
            offset: new BigNumber(1000),
            sat: 486840414210370
        }
    ]
}

// TODO: fill the private key
var sellerPrivateKeyWIF = process.env.PRIV_KEY_1 || "";
var sellerPrivateKey = convertPrivateKeyFromStr(sellerPrivateKeyWIF);
let sellerAddress = process.env.ADDRESS_1 || "";

let buyerPrivateKeyWIF = process.env.PRIV_KEY_2 || "";
let buyerAddress = process.env.ADDRESS_2 || "";
let buyerPrivateKey = convertPrivateKeyFromStr(buyerPrivateKeyWIF);

const feeRatePerByte = 6;


describe("Buy multi inscriptions in one PSBT", () => {
    it("happy case", async () => {
        // first, seller create the transaction


        const sellInscriptionIDs: string[] = [
            "b4e20295fa3c738490cf1d8a542a9a1354affa649f601866b12c092a956de1c3i0",
            "8f93fc0dbe146b84bc2c5275ffb803aedb8cc60c641c794fba06cd125676c47ei0",
        ];
        const amountPayToSeller: BigNumber[] = [new BigNumber(1100), new BigNumber(1200)];
        const feePayToCreator: BigNumber[] = [new BigNumber(0), new BigNumber(1001)];

        const creatorAddress = buyerAddress;

        const buyReqInfos: BuyReqInfo[] = [];
        const receiverAddresses = [
            buyerAddress,
            buyerAddress,
        ];


        for (let i = 0; i < sellInscriptionIDs.length; i++) {
            const inscriptionID = sellInscriptionIDs[i];
            console.log("feePayToCreator ", i, feePayToCreator[i]);
            const { base64Psbt, selectedUTXOs: selectedUTXOsSeller, splitTxID, splitUTXOs } = await reqListForSaleInscription({
                sellerPrivateKey: sellerPrivateKey,
                utxos: sellerUTXOs,
                inscriptions: sellerInsciptions,
                sellInscriptionID: inscriptionID,
                receiverBTCAddress: sellerAddress,
                amountPayToSeller: amountPayToSeller[i],
                feePayToCreator: feePayToCreator[i],
                creatorAddress,
                feeRatePerByte: 4,
            });

            console.log("SELL: base64Psbt, selectedUTXOs: selectedUTXOsSeller, splitTxID, splitUTXOs : ", base64Psbt, selectedUTXOsSeller, splitTxID, splitUTXOs);

            console.log("Add buyReqInfos: ", buyReqInfos);
            buyReqInfos.push({
                sellerSignedPsbtB64: base64Psbt,
                price: amountPayToSeller[i].plus(feePayToCreator[i]),
                receiverInscriptionAddress: receiverAddresses[i],
            });
        }

        console.log("Param buyReqInfos: ", buyReqInfos);

        // create tx buy

        const res = reqBuyMultiInscriptions({ buyReqInfos, buyerPrivateKey, utxos: buyerUTXOs, inscriptions: buyerInscriptions, feeRatePerByte });
        console.log("res: ", res);



        // console.log("PBST no fee for creator: ", base64Psbt);

        // assert.equal(splitTxID, "");
        // assert.equal(splitUTXOs.length, 0);
        // assert.equal(selectedUTXOsSeller.length, 1);

        // const psbt = Psbt.fromBase64(base64Psbt);
        // assert.equal(psbt.txInputs.length, 1);
        // assert.equal(psbt.txOutputs.length, 1);

        // assert.equal(psbt.data.inputs[0].witnessUtxo?.value, 1234);
        // assert.equal(psbt.txInputs[0].index, 0);

        // assert.equal(psbt.txOutputs[0].value, amountPayToSeller.toNumber());
        // assert.equal(psbt.txOutputs[0].address, sellerAddress);
    });
});