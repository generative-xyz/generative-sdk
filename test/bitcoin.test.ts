
import { Inscription } from '../src/bitcoin/types';
import { 
  convertPrivateKey, 
  createTxFromTaprootAddress,
  broadcastTx, 
  UTXO 
} from '../src/index';

// TODO: 
var senderPrivateKey = Buffer.from([  
])

let senderAddress = "bc1prvw0jnlq7zhvy3jxuley9qjxm8kpz2wgwrd2e7nce455am6glpxqavdcc9";

let uxtos: UTXO[] = [
  {
    tx_hash: "228a956320c18970c71e44ba1185b2a0e810127be0328b8e3668bd4691a069e5",
    block_height: 777754,
    tx_input_n: -1,
    tx_output_n: 1,
    value: 3000
  },
  {
    tx_hash: "228a956320c18970c71e44ba1185b2a0e810127be0328b8e3668bd4691a069e5",
    block_height: 777754,
    tx_input_n: -1,
    tx_output_n: 0,
    value: 6274
  },
]
let inscriptions: { [key: string]: Inscription[] } = {
  "228a956320c18970c71e44ba1185b2a0e810127be0328b8e3668bd4691a069e5:0": [{id: "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0", offset:0}]
  // "cc8dcdf8f598c4a6ea19a86f9526baf1d64fa21c51f0a6dc9908fd176ada20e6:1": "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0"
};
// const keys = Object.keys(inscriptions)
let sendInscriptionID = "a22ed5f4e741519e91f51280d2af4377b72f29c52f693955f370d6a1025c35aei0";
let receiverAddress = "bc1prvw0jnlq7zhvy3jxuley9qjxm8kpz2wgwrd2e7nce455am6glpxqavdcc9"; // same as sender

// let txHex = "02000000000102e620da6a17fd0899dca6f0511ca24fd6f1ba26956fa819eaa6c498f5f8cd8dcc0000000000ffffffffc38d13457e1a894c2cb791dc8247e6a824a2f20befca145635461304c60ad2680000000000ffffffff0282180000000000002251201b1cf94fe0f0aec24646e7f2428246d9ec1129c870daacfa78cd694eef48f84cb80b0000000000002251201b1cf94fe0f0aec24646e7f2428246d9ec1129c870daacfa78cd694eef48f84c0140d2b46dd42f725fd55241d15f5ca313cce937ae7881cba1533a33ab73d307e09a6deea3e90bf47fde8be1fc4f8a02114c2bacecd8bf7388e2baa013acadedeea901400adf6440cdb43b8175596e269a93cc708617e9ca1653ad0b4b26ec665352a78ffeadb95e3305143cd3bf693a80de33da0be49d3525f9f2392d5664cb76a3663200000000";


const TestSendInscriptionFromTaprootAddress = async() => {
  let txHex = createTxFromTaprootAddress(senderPrivateKey, senderAddress, uxtos, inscriptions, sendInscriptionID, receiverAddress, 0);

  let txID = await broadcastTx(txHex);
  console.log(txID);
}

TestSendInscriptionFromTaprootAddress()

