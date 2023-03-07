import { networks } from "bitcoinjs-lib";
declare const BlockStreamURL = "https://blockstream.info/api";
declare const MinSats = 1000;
declare const network: networks.Network;
declare const DummyUTXOValue = 1000;
declare const InputSize = 68;
declare const OutputSize = 43;
export { BlockStreamURL, MinSats, network, DummyUTXOValue, InputSize, OutputSize };
