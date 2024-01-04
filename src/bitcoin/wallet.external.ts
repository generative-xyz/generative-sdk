import { Psbt, Transaction } from "bitcoinjs-lib";
import {
    SignTransactionOptions,
    SignTransactionPayload,
    signTransaction,
    BitcoinNetworkType,
} from "sats-connect";

import { ERROR_CODE } from "../constants/error";
import SDKError from "../constants/error";
import { WalletType } from "./constants";
import { base64ToHex, hexToBase64 } from "./utils";

const preparePayloadSignTx = ({
    base64Psbt,
    indicesToSign,
    address,
    sigHashType = Transaction.SIGHASH_DEFAULT
}: {
    base64Psbt: string,
    indicesToSign: number[],
    address: string,
    sigHashType?: number,
}): SignTransactionPayload => {

    return {
        network: {
            type: BitcoinNetworkType.Mainnet,
            address: "", // TODO:
        },
        message: "Sign Transaction",
        psbtBase64: base64Psbt,
        broadcast: false,
        inputsToSign: [{
            address: address,
            signingIndexes: indicesToSign,
            sigHash: sigHashType,
        }],
    };
};

const finalizeSignedPsbt = ({
    signedRawPsbtB64,
    indicesToSign,
}: {
    signedRawPsbtB64: string,
    indicesToSign: number[],
}): Psbt => {
    const signedPsbt = Psbt.fromBase64(signedRawPsbtB64);

    // finalize inputs
    for (let i = 0; i < signedPsbt.txInputs.length; i++) {
        if (indicesToSign.findIndex(value => value === i) !== -1) {
            signedPsbt.finalizeInput(i);
        }
    }

    return signedPsbt;
};

/**
* handleSignPsbtWithXverse calls Xverse signTransaction and finalizes signed raw psbt. 
* extract to msgTx (if isGetMsgTx is true)
* @param base64Psbt the base64 encoded psbt need to sign
* @param indicesToSign indices of inputs need to sign
* @param address address of signer
* @param sigHashType default is SIGHASH_DEFAULT
* @param isGetMsgTx flag used to extract to msgTx or not
* @param cancelFn callback function for handling cancel signing
* @returns the base64 encode signed Psbt
*/
const handleSignPsbtWithXverse = async ({
    base64Psbt,
    indicesToSign,
    address,
    sigHashType = Transaction.SIGHASH_DEFAULT,
    isGetMsgTx = false,
    cancelFn,
}: {
    base64Psbt: string,
    indicesToSign: number[],
    address: string,
    sigHashType?: number,
    isGetMsgTx?: boolean,
    cancelFn: () => void,
}): Promise<{ base64SignedPsbt: string, msgTx: Transaction, msgTxID: string, msgTxHex: string }> => {
    let base64SignedPsbt = "";
    const payload = preparePayloadSignTx({
        base64Psbt,
        indicesToSign, address,
        sigHashType
    });
    const signPsbtOptions: SignTransactionOptions = {
        payload: payload,
        onFinish: (response: any) => {
            console.log("Sign Xverse response: ", response);
            if (response.psbtBase64 !== null && response.psbtBase64 !== undefined && response.psbtBase64 !== "") {
                // sign successfully
                base64SignedPsbt = response.psbtBase64;

            } else {
                // sign unsuccessfully
                throw new SDKError(ERROR_CODE.SIGN_XVERSE_ERROR, response);
            }
        },
        onCancel: cancelFn,
    };
    await signTransaction(signPsbtOptions);

    if (base64SignedPsbt === "") {
        throw new SDKError(ERROR_CODE.SIGN_XVERSE_ERROR, "Response is empty");
    }

    const finalizedPsbt = finalizeSignedPsbt({ signedRawPsbtB64: base64SignedPsbt, indicesToSign });
    let msgTx: any;
    let msgTxID = "";
    let msgTxHex = "";
    if (isGetMsgTx) {
        msgTx = finalizedPsbt.extractTransaction();
        msgTxHex = msgTx.toHex();
        msgTxID = msgTx.getId();
    }

    return {
        base64SignedPsbt: finalizedPsbt.toBase64(),
        msgTx,
        msgTxHex,
        msgTxID
    };
};


const handleSignPsbtWithUnisat = async ({
    base64Psbt,
    indicesToSign,
    isGetMsgTx = false,
    toSignInputs
}: {
    base64Psbt: string,
    indicesToSign: number[],
    address: string,
    sigHashType?: number,
    isGetMsgTx?: boolean,
    toSignInputs: any[]
}): Promise<{ base64SignedPsbt: string, msgTx: Transaction, msgTxID: string, msgTxHex: string }> => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const window = (global?.window) as any;
    const unisat = window?.unisat;

    if (!unisat) {
        throw new SDKError(ERROR_CODE.SIGN_UNISAT_ERROR, "Install wallet.");
    }

    console.log("handleSignPsbtWithUnisat 000: ", {
        base64Psbt,
        hexPsbt: base64ToHex(base64Psbt),
    });

    const hexSignedPsbt = await unisat.signPsbt(
        base64ToHex(base64Psbt),
        {
            autoFinalized: isGetMsgTx,
            toSignInputs: toSignInputs
        }
    );

    console.log("handleSignPsbtWithUnisat 111: ");


    const base64SignedPsbt = hexToBase64(hexSignedPsbt);

    console.log("handleSignPsbtWithUnisat 222: ", {
        hexSignedPsbt,
        base64SignedPsbt,
    });

    if (base64SignedPsbt === "") {
        throw new SDKError(ERROR_CODE.SIGN_UNISAT_ERROR, "Response is empty");
    }

    // send inscription
    if (isGetMsgTx) {
        const psbt = Psbt.fromHex(hexSignedPsbt);
        const msgTx = psbt.extractTransaction();
        return {
            base64SignedPsbt: base64SignedPsbt,
            msgTx: msgTx,
            msgTxHex: msgTx.toHex(),
            msgTxID: msgTx.getId()
        };
    }

    const finalizedPsbt = finalizeSignedPsbt({ signedRawPsbtB64: base64SignedPsbt, indicesToSign });
    let msgTx: any;
    let msgTxID = "";
    let msgTxHex = "";
    if (isGetMsgTx) {
        msgTx = finalizedPsbt.extractTransaction();
        msgTxHex = msgTx.toHex();
        msgTxID = msgTx.getId();
    }

    return {
        base64SignedPsbt: finalizedPsbt.toBase64(),
        msgTx,
        msgTxHex,
        msgTxID
    };
};


/**
* handleSignPsbtWithXverse calls Xverse signTransaction and finalizes signed raw psbt. 
* extract to msgTx (if isGetMsgTx is true)
* @param base64Psbt the base64 encoded psbt need to sign
* @param indicesToSign indices of inputs need to sign
* @param address address of signer
* @param sigHashType default is SIGHASH_DEFAULT
* @param isGetMsgTx flag used to extract to msgTx or not
* @param cancelFn callback function for handling cancel signing
* @returns the base64 encode signed Psbt
*/
const handleSignPsbtWithSpecificWallet = async ({
    base64Psbt, // convert to psbtHex: decodeBase64 => Byte => hex = psbtHex
    indicesToSign,
    address,
    sigHashType = Transaction.SIGHASH_DEFAULT,
    isGetMsgTx = false, // autoFinalized haft sign
    walletType = WalletType.Xverse,
    cancelFn,
}: {
    base64Psbt: string,
    indicesToSign: number[],
    address: string,
    sigHashType?: number,
    isGetMsgTx?: boolean,
    walletType?: number,
    cancelFn: () => void,
    // publicKey: string // pubKey.toString("hex");

}): Promise<{ base64SignedPsbt: string, msgTx: Transaction, msgTxID: string, msgTxHex: string }> => {
    switch (walletType) {
        case WalletType.Xverse: {
            return handleSignPsbtWithXverse({
                base64Psbt,
                indicesToSign,
                address,
                sigHashType,
                isGetMsgTx,
                cancelFn,
            });
        }
        case WalletType.Unisat: {
            const toSignInputs = indicesToSign.map(item => {
                return {
                    index: item,
                    address: address,
                    sighashTypes: [sigHashType],
                    disableTweakSigner: false // TODO
                };
            });
            return handleSignPsbtWithUnisat({
                base64Psbt,
                indicesToSign,
                address,
                sigHashType,
                isGetMsgTx,
                toSignInputs
            });
        }
        default: {
            throw new SDKError(ERROR_CODE.WALLET_NOT_SUPPORT);
        }
    }
};


export {
    handleSignPsbtWithSpecificWallet
};