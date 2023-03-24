import { Psbt, Transaction } from "bitcoinjs-lib";
import {
    SignTransactionOptions,
    SignTransactionPayload,
    callWalletPopup,
    getAddress,
    signTransaction,
} from "sats-connect";

import { ERROR_CODE } from "../constants/error";
import SDKError from "../constants/error";

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
            type: "Mainnet",
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
* @param sellerPrivateKey buffer private key of the seller
* @param utxos list of utxos (include non-inscription and inscription utxos)
* @param inscriptions list of inscription infos of the seller
* @param sellInscriptionID id of inscription to sell
* @param receiverBTCAddress the seller's address to receive BTC
* @param amountPayToSeller BTC amount to pay to seller
* @param feePayToCreator BTC fee to pay to creator
* @param isGetMsgTx address of creator
* amountPayToSeller + feePayToCreator = price that is showed on UI
* @returns the base64 encode Psbt
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
        base64SignedPsbt,
        msgTx,
        msgTxHex,
        msgTxID
    };
};

export {
    handleSignPsbtWithXverse
};