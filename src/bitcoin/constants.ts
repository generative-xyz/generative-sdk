import {
    networks,
} from "bitcoinjs-lib";

const BlockStreamURL = "https://blockstream.info/api";
const MinSatInscription = 546;  
const network = networks.bitcoin; // mainnet
const DummyUTXOValue = 1000; 

export {
    BlockStreamURL,
    MinSatInscription,
    network,
    DummyUTXOValue,
};