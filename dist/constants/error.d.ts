export declare const ERROR_CODE: {
    INVALID_PARAMS: string;
    NOT_SUPPORT_SEND: string;
    NOT_FOUND_INSCRIPTION: string;
    NOT_ENOUGH_BTC_TO_SEND: string;
    NOT_ENOUGH_BTC_TO_PAY_FEE: string;
    ERR_BROADCAST_TX: string;
    INVALID_SIG: string;
};
export declare const ERROR_MESSAGE: {
    [x: string]: {
        message: string;
        desc: string;
    };
};
declare class SDKError extends Error {
    message: string;
    code: string;
    desc: string;
    constructor(code: string, desc?: string);
    getMessage(): string;
}
export default SDKError;
