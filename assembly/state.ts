// @chainfile-state
import { BaseState } from "@zondax/fvm-as-sdk/assembly/utils/state";
import { getAllowKey } from ".";

// @ts-ignore
@state
// This class represents the actor state.
// The BaseState is an abstract class. It has IPLD logic to read and write data to storage
// Any state class only needs to extend it, and implement encode, parse and load functions
// @ts-ignore
export class State extends BaseState {
  Name: string;
  Symbol: string;
  Decimals: u8;
  TotalSupply: u64;

  Balances: Map<string, u64>;
  Allowed: Map<string, u64>; //owner-spender

  constructor(
    name: string,
    symbol: string,
    decimals: u8,
    totalSupply: u64,
    balances: Map<string, u64>,
    allowed: Map<string, u64>
  ) {
    super();

    this.Name = name;
    this.Symbol = symbol;
    this.Decimals = decimals;
    this.TotalSupply = totalSupply;

    this.Balances = balances;
    this.Allowed = allowed;
  }

  getBalanceOf(addr: string): u64 {
    const has = this.Balances.has(addr);
    if (has) return this.Balances.get(addr);

    return 0;
  }

  getAllowance(ownerAddr: string, spenderAddr: string): u64 {
    const has = this.Allowed.has(getAllowKey(ownerAddr, spenderAddr));

    if (has) return this.Allowed.get(getAllowKey(ownerAddr, spenderAddr));

    return 0;
  }
}
