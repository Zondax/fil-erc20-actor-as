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
import { CID } from "multiformats/cid";

jest.setTimeout(300 * 1000);

const URL = process.env["NODE_URL"];
const TOKEN = process.env["NODE_TOKEN"];
const SEED = process.env["SEED"];
const SEED2 = process.env["SEED2"];
const ADDRESS_ID_1 = process.env["ADDRESS_ID_1"];
const ADDRESS_ID_2 = process.env["ADDRESS_ID_2"];

const WASM_ACTOR = "../../fil-erc20-actor.wasm";
const INIT_ACTOR_ADDRESS = "f01";
const INIT_ACTOR_INSTALL_METHOD = 3;
const INIT_ACTOR_CREATE_METHOD = 2;

let Keys;
let Keys2;
let ActorCid;
let InstanceAddress;

beforeAll(() => {
  logger.trace(`Seed: [${SEED}]`);

  Keys = keyDerive(SEED, "m/44'/461'/0/0/1", "");
  Keys2 = keyDerive(SEED2, "m/44'/461'/0/0/0", "");
  logger.trace(`Address: ${Keys.address}`);

  logger.trace(
    `Key file to add address on lotus devnet node: ${Buffer.from(
      `{"Type":"secp256k1","PrivateKey":"${Keys.private_base64}"}`
    ).toString("hex")}`
  );
});

////////////////////
////////////////////
////////////////////
////////////////////

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

  const respBuffer = Buffer.from(sentTx.result.Receipt.Return, "base64");

  let arrayBuffer = new ArrayBuffer(respBuffer.length);
  let typedArray = new Uint8Array(arrayBuffer);
  for (let i = 0; i < respBuffer.length; ++i) {
    typedArray[i] = respBuffer[i];
  }

  const [cid, isInstalled] = cbor.decode<[CID, boolean]>(typedArray);

  expect(cid).toBeDefined();
  expect(isInstalled).toBeDefined();

  logger.info(`CID: ${cid.toString()}`);
  logger.info(`Is installed: ${isInstalled}`);
  ActorCid = cid;
});

test("Create Actor", async () => {
  expect(ActorCid).toBeDefined();

  logger.info(`Instantiating Actor [${ActorCid.toString()}]`);

  const params = cbor.encode([
    ActorCid,
    Buffer.from(cbor.encode(["ZondaxCoin", "ZDX", 18, 1000000, ADDRESS_ID_1])),
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

////////////////////
////////////////////
////////////////////
////////////////////

test("Invoke method 2 (GetName)", async () => {
  expect(InstanceAddress).toBeDefined();

  logger.info(
    `Invoking method 2 from instance [${InstanceAddress.toString()}]`
  );

  const params = cbor.encode([]);
  logger.trace("Params encoded");

  const { tx, filRPC } = await preInvoke(2, []);
  const signedTx = transactionSign(tx, Keys.private_base64);

  const sentTx = await filRPC.sendSignedMessage({
    Message: tx,
    Signature: signedTx.Signature,
  });
  logger.trace(`Sent tx response: ${JSON.stringify(sentTx)}`);

  postInvoke(sentTx, /Token name: ZondaxCoin/);
});

test("Invoke method 3 (GetSymbol)", async () => {
  expect(InstanceAddress).toBeDefined();

  const { tx, filRPC } = await preInvoke(3, []);

  const signedTx = transactionSign(tx, Keys.private_base64);

  const sentTx = await filRPC.sendSignedMessage({
    Message: tx,
    Signature: signedTx.Signature,
  });
  logger.trace(`Sent tx response: ${JSON.stringify(sentTx)}`);

  postInvoke(sentTx, /Token symbol: ZDX/);
});

test("Invoke method 4 (GetDecimal)", async () => {
  expect(InstanceAddress).toBeDefined();

  const { tx, filRPC } = await preInvoke(4, []);

  const signedTx = transactionSign(tx, Keys.private_base64);

  const sentTx = await filRPC.sendSignedMessage({
    Message: tx,
    Signature: signedTx.Signature,
  });
  logger.trace(`Sent tx response: ${JSON.stringify(sentTx)}`);

  postInvoke(sentTx, /Token decimal: 18/);
});

test("Invoke method 5 (GetTotalSupply)", async () => {
  expect(InstanceAddress).toBeDefined();

  const { tx, filRPC } = await preInvoke(5, []);

  const signedTx = transactionSign(tx, Keys.private_base64);

  const sentTx = await filRPC.sendSignedMessage({
    Message: tx,
    Signature: signedTx.Signature,
  });
  logger.trace(`Sent tx response: ${JSON.stringify(sentTx)}`);

  postInvoke(sentTx, /Token total supply: 1000000/);
});

test("Invoke method 6 (GetBalanceOf)", async () => {
  expect(InstanceAddress).toBeDefined();

  const { tx, filRPC } = await preInvoke(6, ["1006"]);

  const signedTx = transactionSign(tx, Keys.private_base64);

  const sentTx = await filRPC.sendSignedMessage({
    Message: tx,
    Signature: signedTx.Signature,
  });
  logger.trace(`Sent tx response: ${JSON.stringify(sentTx)}`);

  postInvoke(sentTx, /Balance: /);
});

test("Invoke method 7 (Transfer)", async () => {
  expect(InstanceAddress).toBeDefined();

  const { tx, filRPC } = await preInvoke(7, [ADDRESS_ID_2, 500]);

  const signedTx = transactionSign(tx, Keys.private_base64);

  const sentTx = await filRPC.sendSignedMessage({
    Message: tx,
    Signature: signedTx.Signature,
  });
  logger.trace(`Sent tx response: ${JSON.stringify(sentTx)}`);

  postInvoke(
    sentTx,
    new RegExp(`From ${ADDRESS_ID_1} to ${ADDRESS_ID_2} amount 500`)
  );
});

test("Invoke method 10 (Approval)", async () => {
  expect(InstanceAddress).toBeDefined();

  const { tx, filRPC } = await preInvoke(10, [ADDRESS_ID_2, 1000]);

  const signedTx = transactionSign(tx, Keys.private_base64);

  const sentTx = await filRPC.sendSignedMessage({
    Message: tx,
    Signature: signedTx.Signature,
  });
  logger.trace(`Sent tx response: ${JSON.stringify(sentTx)}`);

  postInvoke(
    sentTx,
    new RegExp(`Approval ${ADDRESS_ID_1}${ADDRESS_ID_2} for 1000 ZDX`)
  );
});

test("Invoke method 8 (Allowance)", async () => {
  expect(InstanceAddress).toBeDefined();

  const { tx, filRPC } = await preInvoke(8, [ADDRESS_ID_1, ADDRESS_ID_2]);

  const signedTx = transactionSign(tx, Keys.private_base64);

  const sentTx = await filRPC.sendSignedMessage({
    Message: tx,
    Signature: signedTx.Signature,
  });
  logger.trace(`Sent tx response: ${JSON.stringify(sentTx)}`);

  postInvoke(
    sentTx,
    new RegExp(`Allowance for ${ADDRESS_ID_2} by ${ADDRESS_ID_1}: 1000`)
  );
});

test("Invoke method 9 (TransferFrom)", async () => {
  expect(InstanceAddress).toBeDefined();

  const { tx, filRPC } = await preInvoke(9, [ADDRESS_ID_1, "200", 500], true);

  const signedTx = transactionSign(tx, Keys2.private_base64);

  const sentTx = await filRPC.sendSignedMessage({
    Message: tx,
    Signature: signedTx.Signature,
  });
  logger.trace(`Sent tx response: ${JSON.stringify(sentTx)}`);

  postInvoke(
    sentTx,
    new RegExp(
      `Transfer by ${ADDRESS_ID_2} from ${ADDRESS_ID_1} to 200 of 500 ZDX successfull`
    )
  );
});

////////////////////
////////////////////
////////////////////
////////////////////

const preInvoke = async (methodNum: number, params: any[], add2?: boolean) => {
  logger.info(
    `Invoking method ${methodNum} from instance [${InstanceAddress.toString()}]`
  );

  const cborParams = cbor.encode(params);
  logger.trace("Params encoded");

  const filRPC = new FilecoinRPC({ url: URL, token: TOKEN });
  const nonce = (await filRPC.getNonce(add2 ? Keys2.address : Keys.address))
    .result;
  logger.trace(`Nonce: ${nonce}`);

  let tx = {
    From: add2 ? Keys2.address : Keys.address,
    To: InstanceAddress,
    Value: "0",
    Method: methodNum,
    Params: Buffer.from(cborParams).toString("base64"),
    Nonce: nonce,
    GasFeeCap: "0",
    GasPremium: "0",
    GasLimit: 0,
  };

  tx = await getFee(filRPC, tx);
  expect(tx).toBeDefined();

  return { tx, filRPC };
};

const postInvoke = (sentTx: any, toMatch: RegExp) => {
  expect(sentTx.result).toBeDefined();
  expect(sentTx.result.Receipt).toBeDefined();
  expect(sentTx.result.Receipt.ExitCode).toBe(0);

  const respBuffer = Buffer.from(
    sentTx.result.Receipt.Return,
    "base64"
  ).toString("hex");

  const resp: string = Buffer.from(respBuffer, "hex").toString("ascii");

  logger.info(`Message: ${resp}`);

  expect(typeof resp == "string").toBe(true);
  expect(resp).toMatch(toMatch);
};
