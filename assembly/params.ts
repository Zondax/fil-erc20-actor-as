import { Str, Integer } from "@zondax/assemblyscript-cbor/assembly/types";
import { USR_ILLEGAL_ARGUMENT } from "@zondax/fvm-as-sdk/assembly/env";
import { genericAbort } from "@zondax/fvm-as-sdk/assembly/wrappers";
import { fromRaw } from "./utils";

export class InitParams {
  static paramsLen: u8 = 4;

  public name: string;
  public symbol: string;
  public decimal: u8;
  public totalSupply: u64;
  public ownerID: string;

  constructor(raw: Uint8Array) {
    const paramsArray = fromRaw(raw, InitParams.paramsLen);

    this.name = (paramsArray[0] as Str).valueOf();
    this.symbol = (paramsArray[1] as Str).valueOf();
    this.decimal = (paramsArray[2] as Integer).valueOf() as u8;
    this.totalSupply = (paramsArray[3] as Integer).valueOf() as u64;
    this.ownerID = (paramsArray[4] as Str).valueOf();

    if (
      !this.name ||
      !this.symbol ||
      !this.decimal ||
      !this.totalSupply ||
      !this.ownerID
    )
      genericAbort(USR_ILLEGAL_ARGUMENT, "Method invoked with invalid params");
  }
}

export class BalancesOfParams {
  static paramsLen: u8 = 1;

  public addr: string;

  constructor(raw: Uint8Array) {
    const paramsArray = fromRaw(raw, BalancesOfParams.paramsLen);

    this.addr = (paramsArray[0] as Str).valueOf();

    if (!this.addr)
      genericAbort(USR_ILLEGAL_ARGUMENT, "Method invoked with invalid params");
  }
}

export class TransferParams {
  static paramsLen: u8 = 2;

  public receiverAddr: string;
  public transferAmount: u64;

  constructor(raw: Uint8Array) {
    const paramsArray = fromRaw(raw, TransferParams.paramsLen);

    this.receiverAddr = (paramsArray[0] as Str).valueOf();
    this.transferAmount = (paramsArray[1] as Integer).valueOf() as u64;

    if (!this.receiverAddr || !this.transferAmount)
      genericAbort(USR_ILLEGAL_ARGUMENT, "Method invoked with invalid params");
  }
}

export class AllowanceParams {
  static paramsLen: u8 = 2;

  public ownerAddr: string;
  public spenderAddr: string;

  constructor(raw: Uint8Array) {
    const paramsArray = fromRaw(raw, AllowanceParams.paramsLen);

    this.ownerAddr = (paramsArray[0] as Str).valueOf();
    this.spenderAddr = (paramsArray[1] as Str).valueOf();

    if (!this.ownerAddr || !this.spenderAddr)
      genericAbort(USR_ILLEGAL_ARGUMENT, "Method invoked with invalid params");
  }
}

export class TransferFromParams {
  static paramsLen: u8 = 3;

  public ownerAddr: string;
  public receiverAddr: string;
  public transferAmount: u64;

  constructor(raw: Uint8Array) {
    const paramsArray = fromRaw(raw, TransferFromParams.paramsLen);

    this.ownerAddr = (paramsArray[0] as Str).valueOf();
    this.receiverAddr = (paramsArray[1] as Str).valueOf();
    this.transferAmount = (paramsArray[2] as Integer).valueOf() as u64;

    if (!this.ownerAddr || !this.receiverAddr || !this.transferAmount)
      genericAbort(USR_ILLEGAL_ARGUMENT, "Method invoked with invalid params");
  }
}

export class ApprovalParams {
  static paramsLen: u8 = 2;

  public spenderAddr: string;
  public newAllowance: u64;

  constructor(raw: Uint8Array) {
    const paramsArray = fromRaw(raw, ApprovalParams.paramsLen);

    this.spenderAddr = (paramsArray[0] as Str).valueOf();
    this.newAllowance = (paramsArray[1] as Integer).valueOf() as u64;

    if (!this.spenderAddr || !this.newAllowance)
      genericAbort(USR_ILLEGAL_ARGUMENT, "Method invoked with invalid params");
  }
}
