import { BaseState } from "@zondax/fvm-as-sdk/assembly/utils/state";
import {
  Value,
  Obj,
  Integer,
  Str,
} from "@zondax/assemblyscript-cbor/assembly/types";
import { Get } from "@zondax/fvm-as-sdk/assembly/helpers";
import { USR_ILLEGAL_ARGUMENT } from "@zondax/fvm-as-sdk/assembly/env";
import { CBOREncoder } from "@zondax/assemblyscript-cbor/assembly";
import { genericAbort, caller } from "@zondax/fvm-as-sdk/assembly/wrappers";
import { Erc20Token } from "./models";
import { getAllowKey } from "./utils";

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

    this.token.Balances.set(caller().toString(), totalSupply);
  }

  // This function should only indicate how to serialize the store into CBOR
  protected encode(): ArrayBuffer {
    const encoder = new CBOREncoder();
    encoder.addObject(6);

    encoder.addKey("name");
    encoder.addString(this.token.Name);

    encoder.addKey("symbol");
    encoder.addString(this.token.Symbol);

    encoder.addKey("decimals");
    encoder.addUint8(this.token.Decimals);

    encoder.addKey("total_supply");
    encoder.addUint64(this.token.TotalSupply);

    encoder.addKey("balances");
    encoder.addObject(this.token.Balances.size);
    if (this.token.Balances.size > 0) {
      const values = this.token.Balances.values();
      const keys = this.token.Balances.keys();
      for (let i = 0; i < this.token.Balances.size; i++) {
        encoder.addKey(keys[i]);
        encoder.addUint64(values[i]);
      }
    }

    encoder.addKey("allowed");
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
    const balance = this.token.Balances.get(addr);
    if (!balance) return 0;

    return balance;
  }

  getAllowance(ownerAddr: string, spenderAddr: string): u64 {
    const allowance = this.token.Allowed.get(
      getAllowKey(ownerAddr, spenderAddr)
    );

    if (!allowance) return 0;

    return allowance;
  }

  // This function should only indicate how to convert from a generic object model to this state class
  protected parse(rawState: Value): State {
    let name: string;
    let symbol: string;
    let decimals: u8;
    let totalSupply: u64;
    let balances = new Map<string, u64>();
    let allowed = new Map<string, u64>();

    if (rawState.isObj) {
      // Here we cast as object as we know that is what we saved before
      const state = rawState as Obj;

      if (state.has("name")) name = (state.get("name") as Str).valueOf();
      if (state.has("symbol")) symbol = (state.get("symbol") as Str).valueOf();
      if (state.has("decimals"))
        decimals = (state.get("decimal") as Integer).valueOf() as u8;

      if (state.has("total_supply"))
        totalSupply = (state.get("total_supply") as Integer).valueOf() as u64;

      // Get balances
      if (state.has("balances")) {
        let tmp: Map<String, Value> = new Map<String, Value>();
        tmp = (state.get("balances") as Obj).valueOf();

        const keys = tmp.keys();
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const value = tmp.get(key);
          if (value.isUndefined) {
            genericAbort(USR_ILLEGAL_ARGUMENT, "failed to parse balances");
          }
          const addrID = (value as Integer).valueOf();
          balances.set(key.toString(), addrID as u64);
        }
      }

      // Get allowed
      if (state.has("allowed")) {
        let tmp: Map<String, Value> = new Map<String, Value>();
        tmp = (state.get("allowed") as Obj).valueOf();

        const keys = tmp.keys();
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const value = tmp.get(key);
          if (value.isUndefined) {
            genericAbort(USR_ILLEGAL_ARGUMENT, "failed to parse allowed");
          }
          const addrID = (value as Integer).valueOf();
          allowed.set(key.toString(), addrID as u64);
        }
      }
    }

    if (!name) {
      genericAbort(USR_ILLEGAL_ARGUMENT, "undefined state: name");
    }

    if (!symbol) {
      genericAbort(USR_ILLEGAL_ARGUMENT, "undefined state: symbol");
    }

    if (!decimals) {
      genericAbort(USR_ILLEGAL_ARGUMENT, "undefined state: decimals");
    }

    if (!totalSupply) {
      genericAbort(USR_ILLEGAL_ARGUMENT, "undefined state: totalSupply");
    }

    return new State(name, symbol, decimals, totalSupply, balances, allowed);
  }

  static load(): State {
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
