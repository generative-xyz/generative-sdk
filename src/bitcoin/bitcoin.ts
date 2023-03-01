// const varuint = require("bip174/src/lib/converter/varint');
const varuint = require("bitcoinjs-lib");
const witnessStackToScriptWitness = (witness: any) => {
    let buffer = Buffer.allocUnsafe(0);
    function writeSlice(slice: any) {
        buffer = Buffer.concat([buffer, Buffer.from(slice)]);
    }
    function writeVarInt(i: any) {
        const currentLen = buffer.length;
        const varintLen = varuint.encodingLength(i);
        buffer = Buffer.concat([buffer, Buffer.allocUnsafe(varintLen)]);
        varuint.encode(i, buffer, currentLen);
    }
    function writeVarSlice(slice: any) {
        writeVarInt(slice.length);
        writeSlice(slice);
    }
    function writeVector(vector: any) {
        writeVarInt(vector.length);
        vector.forEach(writeVarSlice);
    }
    writeVector(witness);
    return buffer;
};

export {
    witnessStackToScriptWitness
};