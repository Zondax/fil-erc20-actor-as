// @filecoinfile
import {AllowanceParams, ApprovalParams, BalancesOfParams, InitParams, TransferFromParams, TransferParams} from "./params";
import {  State } from "./state";
import { stringToArray } from "./utils";
import { ParamsRawResult } from '@zondax/fvm-as-sdk/assembly/env/types'
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
function init(rawParams: ParamsRawResult): void {
    const params = new InitParams(rawParams.raw)
    const state = new State(params.name, params.symbol, params.decimal, params.totalSupply, new Map<string, u64>(), new Map<string, u64>());

    state.token.Balances.set(params.ownerAddr, params.totalSupply);

    state.save();
    return;
}

// @ts-ignore
@export_method(2)
// `GetName` return token Name of erc20 token
function GetName(rawParams: ParamsRawResult): Uint8Array {
    const state = State.load()

    const msg = `Token name: ${state.token.Name}`
    return stringToArray(msg)
}

// @ts-ignore
@export_method(3)
// `GetSymbol` return token Name of erc20 token
function GetSymbol(rawParams: ParamsRawResult): Uint8Array {
    const state = State.load()

    const msg = `Token symbol: ${state.token.Symbol}`
    return stringToArray(msg)
}

// @ts-ignore
@export_method(4)
// `GetDecimal` return token decimal of erc20 token
function GetDecimal(rawParams: ParamsRawResult): Uint8Array {
    const state = State.load()

    const msg = `Token decimal: ${state.token.Decimals}`
    return stringToArray(msg)
}

// @ts-ignore
@export_method(5)
// `GetTotalSupply` return token TotalSupply of erc20 token
function GetTotalSupply(rawParams: ParamsRawResult): Uint8Array {
    const state = State.load()

    const msg = `Token total supply: ${state.token.TotalSupply} ${state.token.Symbol}`
    return stringToArray(msg)
}

// @ts-ignore
@export_method(6)
// `GetBalanceOf` return balance of wallet address
// `userAddr` - the ID of user.
function GetBalanceOf(rawParams: ParamsRawResult): Uint8Array {
    const params = new BalancesOfParams(rawParams.raw)
    const state = State.load()

    const balance = state.getBalanceOf(params.userAddr)
    const msg = `Balance: ${balance} ${state.token.Symbol}`
    return stringToArray(msg)
}

// @ts-ignore
@export_method(7)
// Transfer token from current caller to a specified address.
// `receiverAddr` - the ID of receiver.
// `transferAmount` - the transfer amount.
function Transfer(rawParams: ParamsRawResult): Uint8Array {
    const params = new TransferParams(rawParams.raw)
    const state = State.load()
    const senderAddr = caller().toString()

    if(params.transferAmount <= 0) {
        genericAbort(USR_ASSERTION_FAILED, "Transfer amount should be greater than zero")
    }

    const balanceOfSender = state.getBalanceOf(senderAddr)
    checkBalance(balanceOfSender, senderAddr)

    if(balanceOfSender < params.transferAmount) {
        genericAbort(USR_ASSERTION_FAILED, `transfer amount should be less than or equal to balance of sender (${senderAddr})`)
    }

    const balanceOfReciever = state.getBalanceOf(params.receiverAddr)
    const newBalanceSender = balanceOfSender - params.transferAmount
    const newBalanceReceiver = balanceOfReciever + params.transferAmount

    state.token.Balances.set(senderAddr, newBalanceSender)
    state.token.Balances.set(params.receiverAddr, newBalanceReceiver)

    state.save()
    const msg = `From ${senderAddr} to ${params.receiverAddr} amount ${params.transferAmount} ${state.token.Symbol}`
    return stringToArray(msg)
}

// @ts-ignore
@export_method(8)
// Allowance checks the amount of tokens that an owner Allowed a spender to transfer in behalf of the owner to another receiver.
// `ownerAddr` - the ID of owner.
// `spenderAddr` - the ID of spender
function Allowance(rawParams: ParamsRawResult): Uint8Array {
    const params = new AllowanceParams(rawParams.raw)
    const state = State.load()

    const allowance = state.getAllowance(params.ownerAddr, params.spenderAddr)
    const msg = `Allowance for ${params.spenderAddr} by ${params.ownerAddr}: ${allowance}`
    return stringToArray(msg)
}

// @ts-ignore
@export_method(9)
// TransferFrom transfer tokens from token owner to receiver.
// `ownerAddr` - the ID of token owner.
// `receiverAddr` - the ID of receiver.
// `transferAmount` - the transfer amount.
function TransferFrom(rawParams: ParamsRawResult): Uint8Array {
    const params = new TransferFromParams(rawParams.raw)
    const state = State.load()
    const spenderAddr = caller().toString()

    if (params.transferAmount <= 0) {
        genericAbort(USR_ASSERTION_FAILED, "Transfer amount should be greater than zero")
    }

    const balanceOfTokenOwner= state.getBalanceOf(params.ownerAddr)
    const balanceOfReceiver= state.getBalanceOf(params.receiverAddr)
    
    const approvedAmount= state.getAllowance(params.ownerAddr, spenderAddr)
    
    checkBalance(balanceOfTokenOwner, params.ownerAddr)
    checkBalance(balanceOfReceiver, params.receiverAddr)
    
    if (approvedAmount <= 0) {
        genericAbort(USR_ASSERTION_FAILED, "Approved amount should be greater than zero")
    }
    
    if(params.transferAmount > balanceOfTokenOwner) {
        genericAbort(USR_ASSERTION_FAILED, `transfer amount should be less than balance of token owner (${params.ownerAddr})`)
    }
    
    if(params.transferAmount > approvedAmount) {
        genericAbort(USR_ASSERTION_FAILED, `transfer amount should be less than approved spending amount of ${spenderAddr}`)
    }
    
    const newOwnerBalance = balanceOfTokenOwner - params.transferAmount
    const newReceiverBalance = balanceOfReceiver + params.transferAmount
    const newSpenderAllowance = approvedAmount - params.transferAmount
    
    state.token.Balances.set(params.ownerAddr, newOwnerBalance)
    state.token.Balances.set(params.receiverAddr, newReceiverBalance)
    state.token.Allowed.set(getAllowKey(params.ownerAddr, spenderAddr), newSpenderAllowance)
    
    state.save()

    const msg = `Transfer by ${spenderAddr} from ${params.ownerAddr} to ${params.receiverAddr} of ${params.transferAmount} ${state.token.Symbol} successfull`
    return stringToArray(msg)
}

// @ts-ignore
@export_method(10)
// Approval approves the passed-in identity to spend/burn a maximum amount of tokens on behalf of the function caller.
// `spenderAddr` - the ID of approved user.
// `newAllowance` - the maximum approved amount.
function Approval(rawParams: ParamsRawResult):  Uint8Array {
    const params = new ApprovalParams(rawParams.raw)
    const state = State.load()
    if(params.newAllowance <= 0) {
        genericAbort(USR_ASSERTION_FAILED, `allow value must bigger than zero`)
    }
    const callerAddr = caller().toString()

    const allowance= state.getAllowance(callerAddr, params.spenderAddr)

    const newAllowance = allowance + params.newAllowance
    state.token.Allowed.set(getAllowKey(callerAddr, params.spenderAddr), newAllowance)  
    state.save()

    const msg = `Approval ${getAllowKey(callerAddr, params.spenderAddr)} for ${newAllowance} ${state.token.Symbol}`
    return stringToArray(msg)
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
