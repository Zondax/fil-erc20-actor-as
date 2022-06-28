import { BaseState } from "@zondax/fvm-as-sdk/assembly/utils/state";
import {
  Value,
  Obj,
  Integer,
  Str,
  Arr,
} from "@zondax/assemblyscript-cbor/assembly/types";
import { Get } from "@zondax/fvm-as-sdk/assembly/helpers";
import { USR_ILLEGAL_ARGUMENT } from "@zondax/fvm-as-sdk/assembly/env";
import { CBOREncoder } from "@zondax/assemblyscript-cbor/assembly";
import { genericAbort, caller } from "@zondax/fvm-as-sdk/assembly/wrappers";
import { Erc20Token } from "./models";
import { getAllowKey } from ".";

export class State extends BaseState {
  token: Erc20Token;

  constructor(
    name: string,
    symbol: string,
    decimals: u8,
    totalSupply: u64,
    balances: Map<string, u64>,
    allowed: Map<string, u64>
  ) {
    super();

    this.token = new Erc20Token(
      name,
      symbol,
      decimals,
      totalSupply,
      balances,
      allowed
    );
  }

  // This function should only indicate how to serialize the store into CBOR
  protected encode(): ArrayBuffer {
    const encoder = new CBOREncoder();
    encoder.addArray(6);

    encoder.addString(this.token.Name);

    encoder.addString(this.token.Symbol);

    encoder.addUint8(this.token.Decimals);

    encoder.addUint64(this.token.TotalSupply);

    encoder.addObject(this.token.Balances.size);
    if (this.token.Balances.size > 0) {
      const values = this.token.Balances.values();
      const keys = this.token.Balances.keys();
      for (let i = 0; i < this.token.Balances.size; i++) {
        encoder.addKey(keys[i]);
        encoder.addUint64(values[i]);
      }
    }

    encoder.addObject(this.token.Allowed.size);
    if (this.token.Allowed.size > 0) {
      const values = this.token.Allowed.values();
      const keys = this.token.Allowed.keys();
      for (let i = 0; i < this.token.Allowed.size; i++) {
        encoder.addKey(keys[i]);
        encoder.addUint64(values[i]);
      }
    }

    return encoder.serialize();
  }

  getBalanceOf(addr: string): u64 {
    const has = this.token.Balances.has(addr);
    if (has) return this.token.Balances.get(addr);

    return 0;
  }

  getAllowance(ownerAddr: string, spenderAddr: string): u64 {
    const has = this.token.Allowed.has(getAllowKey(ownerAddr, spenderAddr));

    if (has) return this.token.Allowed.get(getAllowKey(ownerAddr, spenderAddr));

    return 0;
  }

  // This function should only indicate how to convert from a generic object model to this state class
  protected parse(rawState: Value): State {
    let balances = new Map<string, u64>();
    let allowed = new Map<string, u64>();

    // Here we cast as array as we know that is what we saved before
    const state = (rawState as Arr).valueOf();

    const name = (state[0] as Str).valueOf();
    const symbol = (state[1] as Str).valueOf();

    const decimals = (state[2] as Integer).valueOf() as u8;

    const totalSupply = (state[3] as Integer).valueOf() as u64;

    // Get balances
    let tmp: Map<String, Value> = new Map<String, Value>();
    tmp = (state[4] as Obj).valueOf();

    let keys = tmp.keys();
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = tmp.get(key);
      if (value.isUndefined) {
        genericAbort(USR_ILLEGAL_ARGUMENT, "failed to parse balances");
      }
      const addrID = (value as Integer).valueOf();
      balances.set(key.toString(), addrID as u64);
    }

    // Get allowed
    tmp = (state[5] as Obj).valueOf();

    keys = tmp.keys();
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const value = tmp.get(key);
      if (value.isUndefined) {
        genericAbort(USR_ILLEGAL_ARGUMENT, "failed to parse allowed");
      }
      const addrID = (value as Integer).valueOf();
      allowed.set(key.toString(), addrID as u64);
    }

    return new State(name, symbol, decimals, totalSupply, balances, allowed);
  }

  static load(): State {
    // Using redundant data to init State, the `load` method on BaseState
    // will return new State with data from what stored on the chain.
    return new State(
      "",
      "",
      0,
      0,
      new Map<string, u64>(),
      new Map<string, u64>()
    ).load() as State;
  }
}
