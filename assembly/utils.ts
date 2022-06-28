import { CBORDecoder } from "@zondax/assemblyscript-cbor/assembly/decoder";
import { Value, Arr } from "@zondax/assemblyscript-cbor/assembly/types";
import {
  USR_ASSERTION_FAILED,
  USR_ILLEGAL_ARGUMENT,
} from "@zondax/fvm-as-sdk/assembly/env";
import { genericAbort } from "@zondax/fvm-as-sdk/assembly/wrappers";

// Helper method to convert string to Uint8Array
export function stringToArray(s: string): Uint8Array {
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
