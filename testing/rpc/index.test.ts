import {
  transactionSign,
  generateMnemonic,
  keyDerive,
} from "@zondax/filecoin-signing-tools/js";

import FilecoinRPC from "@zondax/filecoin-signing-tools/rpc";

import fs from "fs";
import path from "path";
import * as cbor from "@ipld/dag-cbor";
import { getFee, logger } from "./utils";

jest.setTimeout(300 * 1000);

const URL = process.env["NODE_URL"];
const TOKEN = process.env["NODE_TOKEN"];
const SEED = process.env["SEED"];

const WASM_ACTOR = "../../fil-erc20-actor.wasm";
const INIT_ACTOR_ADDRESS = "f01";
const INIT_ACTOR_INSTALL_METHOD = 3;
const INIT_ACTOR_CREATE_METHOD = 2;

let Seed;
let Keys;
let ActorCid;
let InstanceAddress;

beforeAll(() => {
  Seed = SEED || generateMnemonic();
  logger.trace(`Seed: [${Seed}]`);

  Keys = keyDerive(Seed, "m/44'/461'/0/0/1", "");
  logger.trace(`Address: ${Keys.address}`);

  logger.trace(
    `Key file to add address on lotus devnet node: ${Buffer.from(
      `{"Type":"secp256k1","PrivateKey":"${Keys.private_base64}"}`
    ).toString("hex")}`
  );
});

test("Install actor", async () => {
  logger.info(`Installing actor [${path.join(__dirname, WASM_ACTOR)}]`);

  const code = fs.readFileSync(path.join(__dirname, WASM_ACTOR));
  logger.trace("Code loaded");

  const params = cbor.encode([new Uint8Array(code.buffer)]);
  logger.trace("Params encoded");

  const filRPC = new FilecoinRPC({ url: URL, token: TOKEN });
  const nonce = (await filRPC.getNonce(Keys.address)).result;
  logger.trace(`Nonce: ${nonce}`);

  let tx = {
    From: Keys.address,
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

  const signedTx = transactionSign(tx, Keys.private_base64);

  let sentTx;
  try {
    sentTx = await filRPC.sendSignedMessage({
      Message: tx,
      Signature: signedTx.Signature,
    });
    logger.trace(`Sent tx response: ${JSON.stringify(sentTx)}`);
  } catch (err) {
    console.log(err.response);
    throw new Error("failed");
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
    ActorCid = cid;
  }
});

test("Create Actor", async () => {
  ActorCid = "bafk2bzacebc4i3jul2vgavroqf43q4t4htgm2n4o6aayu4wckz2uhxcqiikku";
  expect(ActorCid).toBeDefined();

  logger.info(`Instantiating Actor [${ActorCid.toString()}]`);

  const params = cbor.encode([
    ActorCid,
    Buffer.from(
      cbor.encode(["Zondax Coin", "ZDX", 18, 1000000, "100"])
    ).toString("base64"),
  ]);
  logger.trace("Params encoded");

  const filRPC = new FilecoinRPC({ url: URL, token: TOKEN });
  const nonce = (await filRPC.getNonce(Keys.address)).result;
  logger.trace(`Nonce: ${nonce}`);

  let tx = {
    From: Keys.address,
    To: INIT_ACTOR_ADDRESS,
    Value: "0",
    Method: INIT_ACTOR_CREATE_METHOD,
    Params: Buffer.from(params).toString("base64"),
    Nonce: nonce,
    GasFeeCap: "0",
    GasPremium: "0",
    GasLimit: 0,
  };

  tx = await getFee(filRPC, tx);
  if (!tx) return;

  const signedTx = transactionSign(tx, Keys.private_base64);

  const sentTx = await filRPC.sendSignedMessage({
    Message: tx,
    Signature: signedTx.Signature,
  });
  logger.trace(`Sent tx response: ${JSON.stringify(sentTx)}`);

  expect(sentTx.result).toBeDefined();
  expect(sentTx.result.Receipt).toBeDefined();
  expect(sentTx.result.Receipt.ExitCode).toBe(0);

  if (sentTx.result.Receipt.ExitCode == 0) {
    let idAddr, robustAddr;
    if (sentTx.result.ReturnDec) {
      idAddr = sentTx.result.ReturnDec.IDAddress;
      robustAddr = sentTx.result.ReturnDec.RobustAddress;
    } else {
      const respBuffer = Buffer.from(sentTx.result.Receipt.Return, "base64");

      let arrayBuffer = new ArrayBuffer(respBuffer.length);
      let typedArray = new Uint8Array(arrayBuffer);
      for (let i = 0; i < respBuffer.length; ++i) {
        typedArray[i] = respBuffer[i];
      }

      [idAddr, robustAddr] = cbor.decode(typedArray);
    }

    expect(idAddr).toBeDefined();
    expect(robustAddr).toBeDefined();

    logger.info(`ID Address: ${idAddr.toString()}`);
    logger.info(`Robust address: ${robustAddr.toString()}`);

    InstanceAddress = idAddr.toString();
  }
});
