var wif = require('wif');

const convertPrivateKey = (bytes: Buffer) => {
    var key = wif.encode(128, bytes, true)
    console.log("Key: ", key)
}

export {
    convertPrivateKey
}