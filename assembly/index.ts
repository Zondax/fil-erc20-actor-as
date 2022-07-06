import {  State } from "./state";
import {caller, genericAbort} from "@zondax/fvm-as-sdk/assembly/wrappers";
import {USR_ASSERTION_FAILED} from "@zondax/fvm-as-sdk/assembly/env";

/*
enum Methods {
  GetName = 2,
  GetSymbol,
  GetDecimal,
  GetTotalSupply,
  GetBalanceOf,
  Transfer,
  Allowance,
  TransferFrom,
  Approval,
}
*/

// @ts-ignore
@constructor
// Function executed on create actor
// `name` - The name of the token
// `symbol` - The symbol of the token
// `decimal` - The decimal for the token to define divisibility
// `totalSupply` - The total supply of the token
// `ownderId` - The owner for all tokens to belong to on init
function init(name: string, symbol: string, decimal: u8, totalSupply: u64, ownerAddr: string): void {
    // @ts-ignore
    const state = new State(name, symbol, decimal, totalSupply, new Map<string, u64>(), new Map<string, u64>());

    state.Balances.set(ownerAddr, totalSupply);

    // @ts-ignore
    state.save();
    return;
}

// @ts-ignore
@export_method(2)
// `GetName` return Name of erc20
function GetName(): string {
    // @ts-ignore
    const state = State.load() as State

    const msg = `Token name: ${state.Name}`
    return msg
}

// @ts-ignore
@export_method(3)
// `GetSymbol` return Name of erc20
function GetSymbol(): string {
    // @ts-ignore
    const state = State.load() as State

    const msg = `Token symbol: ${state.Symbol}`
    return msg
}

// @ts-ignore
@export_method(4)
// `GetDecimal` return decimal of erc20
function GetDecimal(): string {
    // @ts-ignore
    const state = State.load() as State

    const msg = `Token decimal: ${state.Decimals}`
    return msg
}

// @ts-ignore
@export_method(5)
// `GetTotalSupply` return TotalSupply of erc20
function GetTotalSupply(): string {
    // @ts-ignore
    const state = State.load() as State

    const msg = `Token total supply: ${state.TotalSupply} ${state.Symbol}`
    return msg
}

// @ts-ignore
@export_method(6)
// `GetBalanceOf` return balance of wallet address
// `userAddr` - the ID of user.
function GetBalanceOf(userAddr: string): string {
    // @ts-ignore
    const state = State.load() as State

    const balance = state.getBalanceOf(userAddr)
    const msg = `Balance: ${balance} ${state.Symbol}`
    return msg
}

// @ts-ignore
@export_method(7)
// Transfer from current caller to a specified address.
// `receiverAddr` - the ID of receiver.
// `transferAmount` - the transfer amount.
function Transfer(receiverAddr: string, transferAmount: u64): string {
    // @ts-ignore
    const state = State.load() as State
    const senderAddr = caller().toString()

    if (transferAmount <= 0) {
        genericAbort(USR_ASSERTION_FAILED, "Transfer amount should be greater than zero")
    }

    const balanceOfSender = state.getBalanceOf(senderAddr)
    checkBalance(balanceOfSender, senderAddr)

    if(balanceOfSender < transferAmount) {
        genericAbort(USR_ASSERTION_FAILED, `transfer amount should be less than or equal to balance of sender (${senderAddr})`)
    }

    const balanceOfReciever = state.getBalanceOf(receiverAddr)
    const newBalanceSender = balanceOfSender - transferAmount
    const newBalanceReceiver = balanceOfReciever + transferAmount

    state.Balances.set(senderAddr, newBalanceSender)
    state.Balances.set(receiverAddr, newBalanceReceiver)

    state.save()
    const msg = `From ${senderAddr} to ${receiverAddr} amount ${transferAmount} ${state.Symbol}`
    return msg
}

// @ts-ignore
@export_method(8)
// Allowance checks the amount ofs that an owner Allowed a spender to transfer in behalf of the owner to another receiver.
// `ownerAddr` - the ID of owner.
// `spenderAddr` - the ID of spender
function Allowance(ownerAddr: string, spenderAddr: string): string {
    // @ts-ignore
    const state = State.load() as State

    const allowance = state.getAllowance(ownerAddr, spenderAddr)
    const msg = `Allowance for ${spenderAddr} by ${ownerAddr}: ${allowance}`
    return msg
}

// @ts-ignore
@export_method(9)
// TransferFrom transfers from owner to receiver.
// `ownerAddr` - the ID of owner.
// `receiverAddr` - the ID of receiver.
// `transferAmount` - the transfer amount.
function TransferFrom(ownerAddr: string, receiverAddr: string, transferAmount: u64): string {
    // @ts-ignore
    const state = State.load() as State
    const spenderAddr = caller().toString()

    if(transferAmount <= 0) {
        genericAbort(USR_ASSERTION_FAILED, "Transfer amount should be greater than zero")
    }

    const balanceOfTokenOwner= state.getBalanceOf(ownerAddr)
    const balanceOfReceiver= state.getBalanceOf(receiverAddr)
    
    const approvedAmount= state.getAllowance(ownerAddr, spenderAddr)
    
    checkBalance(balanceOfTokenOwner, ownerAddr)
    checkBalance(balanceOfReceiver, receiverAddr)
    
    if (approvedAmount <= 0) {
        genericAbort(USR_ASSERTION_FAILED, "Approved amount should be greater than zero")
    }
    
    if (transferAmount > balanceOfTokenOwner) {
        genericAbort(USR_ASSERTION_FAILED, `transfer amount should be less than balance of owner ($ ownerAddr})`)
    }
    
    if (transferAmount > approvedAmount) {
        genericAbort(USR_ASSERTION_FAILED, `transfer amount should be less than approved spending amount of ${spenderAddr}`)
    }
    
    const newOwnerBalance = balanceOfTokenOwner - transferAmount
    const newReceiverBalance = balanceOfReceiver + transferAmount
    const newSpenderAllowance = approvedAmount - transferAmount
    
    state.Balances.set(ownerAddr, newOwnerBalance)
    state.Balances.set(receiverAddr, newReceiverBalance)
    state.Allowed.set(getAllowKey(ownerAddr, spenderAddr), newSpenderAllowance)
    
    state.save()

    const msg = `Transfer by ${spenderAddr} from ${ownerAddr} to ${receiverAddr} of $ transferAmount} ${state.Symbol} successfull`
    return msg
}

// @ts-ignore
@export_method(10)
// Approval approves the passed-in identity to spend/burn a maximum amount ofs on behalf of the function caller.
// `spenderAddr` - the ID of approved user.
// `newAllowance` - the maximum approved amount.
function Approval(spenderAddr: string, newAllowance: u64): string {
    // @ts-ignore
    const state = State.load() as State
    if (newAllowance <= 0) {
        genericAbort(USR_ASSERTION_FAILED, `allow value must bigger than zero`)
    }
    const callerAddr = caller().toString()

    const allowance= state.getAllowance(callerAddr, spenderAddr)

    newAllowance = allowance + newAllowance
    state.Allowed.set(getAllowKey(callerAddr, spenderAddr), newAllowance)  

    state.save()

    const msg = `Approval ${getAllowKey(callerAddr, spenderAddr)} for ${newAllowance} ${state.Symbol}`
    return msg
}

// Helper method to check balance
export function checkBalance(balance: u64, addr: string): void {
  if (balance < 0) {
    genericAbort(
      USR_ASSERTION_FAILED,
      `Balance of sender ${addr} is ${balance}`
    );
  }
  return;
}

// Helper method to get composite key to reference allowed map
export function getAllowKey(ownerAddr: string, spenderAddr: string): string {
  return `${ownerAddr}${spenderAddr}`;
}
