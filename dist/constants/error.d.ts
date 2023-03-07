export declare const ERROR_CODE: {
    NOT_ENOUGH_COIN: string;
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
}
export default SDKError;
