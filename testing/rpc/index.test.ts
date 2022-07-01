import {
  transactionSign,
  generateMnemonic,
  keyDerive,
} from "@zondax/filecoin-signing-tools/js";

import FilecoinRPC from "@zondax/filecoin-signing-tools/rpc";

import fs from "fs";
import log4js from "log4js";
import path from "path";
import * as cbor from "@ipld/dag-cbor";

jest.setTimeout(300 * 1000);

const URL = process.env["NODE_URL"];
const TOKEN = process.env["NODE_TOKEN"];
const SEED = process.env["SEED"];

const WASM_ACTOR = "../../fil-erc20-actor.wasm";
const INIT_ACTOR_ADDRESS = "f01";
const INIT_ACTOR_INSTALL_METHOD = 3;
const INIT_ACTOR_CREATE_METHOD = 2;

const logger = log4js.getLogger();
logger.level = process.env["LOG_LEVEL"] || "TRACE";

let seed;
let keys;
let actorCid;
let instanceAddress;

beforeAll(() => {
  seed = SEED || generateMnemonic();
  logger.trace(`Seed: [${seed}]`);

  keys = keyDerive(seed, "m/44'/461'/0/0/1", "");
  logger.trace(`Address: ${keys.address}`);

  logger.trace(
    `Key file to add address on lotus devnet node: ${Buffer.from(
      `{"Type":"secp256k1","PrivateKey":"${keys.private_base64}"}`
    ).toString("hex")}`
  );
});

test("Install actor", async () => {
  logger.info(`Installing actor [${path.join(__dirname, WASM_ACTOR)}]`);

  const code = fs.readFileSync(path.join(__dirname, WASM_ACTOR));
  logger.trace("Code loaded");

  const params = cbor.encode([new Uint8Array(code.buffer)]);
  logger.trace("Params encoded");

  console.log(FilecoinRPC)

  const filRPC = new FilecoinRPC({ url: URL, token: TOKEN });
  const nonce = (await filRPC.getNonce(keys.address)).result;
  logger.trace(`Nonce: ${nonce}`);

  let tx = {
    From: keys.address,
    To: INIT_ACTOR_ADDRESS,
    Value: "0",
    Method: INIT_ACTOR_INSTALL_METHOD,
    Params: Buffer.from(params).toString("base64"),
    Nonce: nonce,
    GasFeeCap: "0",
    GasPremium: "0",
    GasLimit: 0,
  };

  tx = await getFee(filRPC, tx);
  if (!tx) return;

  const signedTx = transactionSign(tx, keys.private_base64);

  let sentTx  
  try {
    sentTx = await filRPC.sendSignedMessage({
      Message: tx,
      Signature: signedTx.Signature,
    });
    logger.trace(`Sent tx response: ${JSON.stringify(sentTx)}`);
  } catch (err) {
    console.log(err.response)
    throw new Error("failed")
  }


  expect(sentTx.result).toBeDefined();
  expect(sentTx.result.Receipt).toBeDefined();
  expect(sentTx.result.Receipt.ExitCode).toBe(0);

  if (sentTx.result.Receipt.ExitCode == 0) {
    const respBuffer = Buffer.from(sentTx.result.Receipt.Return, "base64");

    let arrayBuffer = new ArrayBuffer(respBuffer.length);
    let typedArray = new Uint8Array(arrayBuffer);
    for (let i = 0; i < respBuffer.length; ++i) {
      typedArray[i] = respBuffer[i];
    }

    const [cid, isInstalled] = cbor.decode(typedArray);

    expect(cid).toBeDefined();
    expect(isInstalled).toBeDefined();

    logger.info(`CID: ${cid.toString()}`);
    logger.info(`Is installed: ${isInstalled}`);
    actorCid = cid;
  }
});

async function getFee(filRPC, tx) {
  try {
    const fees = await filRPC.getGasEstimation({ ...tx });
    logger.trace(`Fees: ${JSON.stringify(fees)}`);

    expect(fees.error).not.toBeDefined();
    if (fees.error) return;

    expect(fees.result).toBeDefined();
    expect(fees.result.GasFeeCap).toBeDefined();
    expect(fees.result.GasPremium).toBeDefined();
    expect(fees.result.GasLimit).toBeDefined();

    const { GasFeeCap, GasPremium, GasLimit } = fees.result;
    tx = {
      ...tx,
      GasFeeCap,
      GasPremium,
      GasLimit,
    };

    return tx;
  } catch (err) {
    logger.error(`Error fetching fees: ${JSON.stringify(err)}`);
  }
}
