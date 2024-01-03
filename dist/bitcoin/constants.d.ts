import BigNumber from "bignumber.js";
declare const BlockStreamURL = "https://blockstream.info/api";
declare const MinSats = 546;
declare const MinValueInsc = 1000;
declare const DummyUTXOValue = 1000;
declare const InputSize = 68;
declare const OutputSize = 43;
declare const BNZero: BigNumber;
declare const WalletType: {
    Xverse: number;
    Hiro: number;
    Unisat: number;
};
export { BlockStreamURL, MinSats, MinValueInsc, DummyUTXOValue, InputSize, OutputSize, BNZero, WalletType, };
