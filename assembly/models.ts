export class Erc20Token {
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
    this.Name = name;
    this.Symbol = symbol;
    this.Decimals = decimals;
    this.TotalSupply = totalSupply;
    this.Balances = balances;
    this.Allowed = allowed;
  }
}
