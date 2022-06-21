import { isConstructorCaller } from "@zondax/fvm-as-sdk/assembly/helpers";
import { caller } from "@zondax/fvm-as-sdk/assembly/wrappers";
import {  State } from "./state";
import { ConstructorReq, Erc20Token } from "./types";

// @ts-ignore
@constructor
function init(params: Erc20Token): void {
  if (!isConstructorCaller()) return;

  const state = new State(params);
  state.save();

  return;
}
