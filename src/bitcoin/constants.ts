import {
    networks,
} from "bitcoinjs-lib";

const BlockStreamURL = "https://blockstream.info/api";
const MinSats = 1000;
const network = networks.bitcoin; // mainnet
const DummyUTXOValue = 1000;

export {
    BlockStreamURL,
    MinSats,
    network,
    DummyUTXOValue,
};