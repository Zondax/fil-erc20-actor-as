export interface Erc20Token {
  Name: string;
  Symbol: string;
  Decimals: u8;
  TotalSupply: u64;

  Balances: Map<string, u64>;
  Allowed: Map<string, u64>; //owner-spender
}

export interface ConstructorReq {
  Name: string;
  Symbol: string;
  Decimals: u8;
  TotalSupply: u64;
}
