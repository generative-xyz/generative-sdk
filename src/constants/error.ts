export const ERROR_CODE = {
    NOT_ENOUGH_COIN: "-1",
};

export const ERROR_MESSAGE = {
    [ERROR_CODE.NOT_ENOUGH_COIN]: {
        message: "Your balance is insufficient.",
        desc: "Your balance is insufficient.",
    },
};

class SDKError extends Error {
    message: string;
    code: string;
    desc: string;
    constructor(code: string, desc?: string) {
        super();
        const _error = ERROR_MESSAGE[code];
        this.message = `${_error} ERROR_CODE${code}` || "";
        this.code = code;
        this.desc = desc || _error?.desc;
    }
}

export default SDKError;