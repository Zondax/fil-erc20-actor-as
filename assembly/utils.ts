import { CBORDecoder } from "@zondax/assemblyscript-cbor/assembly/decoder";
import { Value, Arr } from "@zondax/assemblyscript-cbor/assembly/types";
import {
  USR_ASSERTION_FAILED,
  USR_ILLEGAL_ARGUMENT,
} from "@zondax/fvm-as-sdk/assembly/env";
import { genericAbort } from "@zondax/fvm-as-sdk/assembly/wrappers";

export function stringToUint8Array(s: string): Uint8Array {
  return Uint8Array.wrap(String.UTF8.encode(s));
}

// decode cbor
export function fromRaw(raw: Uint8Array, paramsLen: u8): Array<Value> {
  const decoder = new CBORDecoder(raw.buffer);
  const rawState: Value = decoder.parse();

  if (!rawState.isArr) {
    genericAbort(USR_ILLEGAL_ARGUMENT, "parameters expected to be an array");
  }

  const paramsArray = (rawState as Arr).valueOf();
  if (paramsArray.length !== paramsLen) {
    genericAbort(
      USR_ILLEGAL_ARGUMENT,
      "number of parameters do not match required by method"
    );
  }

  return paramsArray;
}

export function checkBalance(balance: u64, addr: string): void {
  if (balance < 0) {
    genericAbort(
      USR_ASSERTION_FAILED,
      `Balance of sender ${addr} is ${balance}`
    );
  }
  return;
}

export function getAllowKey(ownerAddr: string, spenderAddr: string): string {
  return `${ownerAddr}${spenderAddr}`;
}
