import { createPSBTToSell, createPSBTToBuy, UTXO, network, convertPrivateKeyFromStr, convertPrivateKey, reqListForSaleInscription, reqBuyInscription } from "../src/index";
import { Psbt } from "bitcoinjs-lib";
import { assert } from "chai";


// for unit tests
// let sellerUTXOs = [
//     // inscription UTXOs
//     // real

//     {
//         tx_hash: "4963e4ec3bf2599c542259ad5cc393ceef6a1dfea1aa0df2c3533a27d173aeee",
//         tx_output_n: 1,
//         value: 1078, // normal
//     },
//     {
//         tx_hash: "1bdb522dc035d83fd4c837e2cef53d12de348aa2602f1ad9bd5102f8e9d200c9",
//         tx_output_n: 0,
//         value: 1786,
//     },
//     {
//         tx_hash: "300ec1c7401199c356072efa4b38387d38211dad8b0970372772ba5f4164d3f3",
//         tx_output_n: 0,
//         value: 3451,
//     },
//     {
//         tx_hash: "b475e4fef1a1095c1cc48ebc1f7b502fce62c2f7e403b6bed12b02fe1652028f",
//         tx_output_n: 0,
//         value: 4228,
//     },
//     {
//         tx_hash: "da7d8f7d7234d65ce8876475ba75e7ab60f6ea807fc0b248270f640db2d0189f",
//         tx_output_n: 1,
//         value: 1536, // normal
//     },
//     {
//         tx_hash: "357b0288744386a5a62c4bda4640566750feee7c0e15f7888d247d251b8db75c",
//         tx_output_n: 0,
//         value: 4421,
//     }
// ];

// let sellerInsciptions = {
//     "1bdb522dc035d83fd4c837e2cef53d12de348aa2602f1ad9bd5102f8e9d200c9:0": [
//         {
//             id: "73168fb8c16f6990eaf54122492cd5768a17f3801a32d01712e22869094a94fci0",
//             offset: 0,
//             sat: 1277661004849427
//         }
//     ],
//     "300ec1c7401199c356072efa4b38387d38211dad8b0970372772ba5f4164d3f3:0": [
//         {
//             id: "b4e20295fa3c738490cf1d8a542a9a1354affa649f601866b12c092a956de1c3i0",
//             offset: 0,
//             sat: 1392873619146836
//         }
//     ],
//     "357b0288744386a5a62c4bda4640566750feee7c0e15f7888d247d251b8db75c:0": [
//         {
//             id: "759227f04721a0f3d097826fa7b66a34228dd2ed61e89a77d51a50d3cd7ab6dci0",
//             offset: 558,
//             sat: 1311874707106021
//         }
//     ],
//     "b475e4fef1a1095c1cc48ebc1f7b502fce62c2f7e403b6bed12b02fe1652028f:0": [
//         {
//             id: "8f93fc0dbe146b84bc2c5275ffb803aedb8cc60c641c794fba06cd125676c47ei0",
//             offset: 0,
//             sat: 1277661004899817
//         }
//     ]
// }

// // for unit tests
// let buyerUTXOs = [
//     // {
//     //     tx_hash: "4963e4ec3bf2599c542259ad5cc393ceef6a1dfea1aa0df2c3533a27d173aeee",
//     //     tx_output_n: 2,
//     //     value: 1000,
//     // },
//     {
//         tx_hash: "4963e4ec3bf2599c542259ad5cc393ceef6a1dfea1aa0df2c3533a27d173aeee",
//         tx_output_n: 0,
//         value: 1390, // normal
//     },
//     {
//         tx_hash: "3edce14398749454d105241212d46aad8a513f41dd38d84ebef452000b28c777",
//         tx_output_n: 0,
//         value: 20000, // normal
//     }
// ];

// let buyerInscriptions = {
//     "4963e4ec3bf2599c542259ad5cc393ceef6a1dfea1aa0df2c3533a27d173aeee:0": [
//         {
//             id: "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0",
//             offset: 1000,
//             sat: 486840414210370
//         }
//     ]
// }


// for unit tests
let sellerUTXOs = [
    // inscription UTXOs
    // real

    {
        tx_hash: "4963e4ec3bf2599c542259ad5cc393ceef6a1dfea1aa0df2c3533a27d173aeee",
        tx_output_n: 1,
        value: 1078, // normal
    },
    {
        tx_hash: "1bdb522dc035d83fd4c837e2cef53d12de348aa2602f1ad9bd5102f8e9d200c9",
        tx_output_n: 0,
        value: 1786,
    },
    {
        tx_hash: "300ec1c7401199c356072efa4b38387d38211dad8b0970372772ba5f4164d3f3",
        tx_output_n: 0,
        value: 3451,
    },
    {
        tx_hash: "b475e4fef1a1095c1cc48ebc1f7b502fce62c2f7e403b6bed12b02fe1652028f",
        tx_output_n: 0,
        value: 4228,
    },
    {
        tx_hash: "da7d8f7d7234d65ce8876475ba75e7ab60f6ea807fc0b248270f640db2d0189f",
        tx_output_n: 1,
        value: 1536, // normal
    },
    {
        tx_hash: "357b0288744386a5a62c4bda4640566750feee7c0e15f7888d247d251b8db75c",
        tx_output_n: 0,
        value: 4421,
    }
];

let sellerInsciptions = {
    "1bdb522dc035d83fd4c837e2cef53d12de348aa2602f1ad9bd5102f8e9d200c9:0": [
        {
            id: "73168fb8c16f6990eaf54122492cd5768a17f3801a32d01712e22869094a94fci0",
            offset: 0,
            sat: 1277661004849427
        }
    ],
    "300ec1c7401199c356072efa4b38387d38211dad8b0970372772ba5f4164d3f3:0": [
        {
            id: "b4e20295fa3c738490cf1d8a542a9a1354affa649f601866b12c092a956de1c3i0",
            offset: 0,
            sat: 1392873619146836
        }
    ],
    "357b0288744386a5a62c4bda4640566750feee7c0e15f7888d247d251b8db75c:0": [
        {
            id: "759227f04721a0f3d097826fa7b66a34228dd2ed61e89a77d51a50d3cd7ab6dci0",
            offset: 558,
            sat: 1311874707106021
        }
    ],
    "b475e4fef1a1095c1cc48ebc1f7b502fce62c2f7e403b6bed12b02fe1652028f:0": [
        {
            id: "8f93fc0dbe146b84bc2c5275ffb803aedb8cc60c641c794fba06cd125676c47ei0",
            offset: 0,
            sat: 1277661004899817
        }
    ]
}

// for unit tests
let buyerUTXOs = [
    // {
    //     tx_hash: "4963e4ec3bf2599c542259ad5cc393ceef6a1dfea1aa0df2c3533a27d173aeee",
    //     tx_output_n: 2,
    //     value: 1000,
    // },
    {
        tx_hash: "4963e4ec3bf2599c542259ad5cc393ceef6a1dfea1aa0df2c3533a27d173aeee",
        tx_output_n: 0,
        value: 1390, // normal
    },
    {
        tx_hash: "3edce14398749454d105241212d46aad8a513f41dd38d84ebef452000b28c777",
        tx_output_n: 0,
        value: 20000, // normal
    }
];

let buyerInscriptions = {
    "4963e4ec3bf2599c542259ad5cc393ceef6a1dfea1aa0df2c3533a27d173aeee:0": [
        {
            id: "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0",
            offset: 1000,
            sat: 486840414210370
        }
    ]
}

// TODO: fill the private key
var sellerPrivateKey = Buffer.from([]);
let sellerAddress = "bc1prvw0jnlq7zhvy3jxuley9qjxm8kpz2wgwrd2e7nce455am6glpxqavdcc9";

let buyerPrivateKeyWIF = "";
let buyerAddress = "bc1pj2t2szx6rqzcyv63t3xepgdnhuj2zd3kfggrqmd9qwlg3vsx37fqywwhyx";
let buyerPrivateKey = convertPrivateKeyFromStr(buyerPrivateKeyWIF);

const feeRatePerByte = 6;


describe("Buy and Sell inscription with PSBT", () => {
    it("feePayToCreator > 0: seller split UTXO first", async () => {
        // first, seller create the transaction
        const amountPayToSeller = 1100;
        const feePayToCreator = 1000;

        const sellInscriptionID = "73168fb8c16f6990eaf54122492cd5768a17f3801a32d01712e22869094a94fci0";
        const creatorAddress = "bc1ppswwdq6crzrktla4y0urfmcqe8n7wttsvxdx39k4ruvd008x8rvqmnwpk9";

        const { base64Psbt, selectedUTXOs: selectedUTXOsSeller } = await reqListForSaleInscription({
            sellerPrivateKey: sellerPrivateKey,
            utxos: sellerUTXOs,
            inscriptions: sellerInsciptions,
            sellInscriptionID,
            receiverBTCAddress: sellerAddress,
            amountPayToSeller,
            feePayToCreator,
            creatorAddress,
            feeRatePerByte: 4,
        });
        console.log(base64Psbt);
        console.log(selectedUTXOsSeller);
        // assert.equal(selectedUTXOsSeller.length, 2);


        // next, buyer create the transaction


        const { txID, txHex, fee, selectedUTXOs: selectedUTXOsBuyer } = await reqBuyInscription({
            sellerSignedPsbtB64: base64Psbt,
            buyerPrivateKey: buyerPrivateKey,
            receiverInscriptionAddress: buyerAddress,
            price: amountPayToSeller + feePayToCreator,
            utxos: buyerUTXOs,
            inscriptions: buyerInscriptions,
            feeRatePerByte,
        });

        console.log("Final TxID TX hex: ", txID, txHex, fee);

    });


});


