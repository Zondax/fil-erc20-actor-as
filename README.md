# ERC20 AssemblyScript Actor for FVM
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![GithubActions](https://github.com/Zondax/fil-erc20-actor-as/actions/workflows/main.yaml/badge.svg)](https://github.com/Zondax/fil-erc20-actor-as/blob/master/.github/workflows/main.yaml)

---

![zondax_light](docs/assets/zondax_light.png#gh-light-mode-only)
![zondax_dark](docs/assets/zondax_dark.png#gh-dark-mode-only)

_Please visit our website at [zondax.ch](https://www.zondax.ch)_

---

This is the another smart contract you should check in order to learn how to create your own one. It implements:
- Save a maps, string and integers to storage
- Load that data from storage
- Create a constructor
- Export methods with parameters and return values

In particular, this implements all the methods required by the ERC20 guidelines to create a token. 
So this allows you to have your on token running on FVM. Awesome, right?

This smart contract was built using the FVM SDK for AssemblyScript. Please, go to the [project](https://github.com/Zondax/fvm-as-sdk) in order to know more about it.

## Development

### Install dependencies

You will need to have NodeJS and Cargo (rust) installed.
```
$ make deps
```

### Build WASM actor

It will create a `fil-erc20-actor.wasm` that you cna then upload to your lotus node.
```
$ make build
```

### Tests

In the `testing` folder you will find Rust code that allow to run your wasm actor into a locally run FVM. You will need Cargo (Rust) installed to run it.

It is required to build the wasm actor first.

```
$ make test
```

## Running FNS in Lotus

## Install the actor

```
$ ./lotus chain install-actor fil-erc20-actor.wasm
sending message...
gas limit: 141514300
waiting for message to execute...
Actor Code CID: bafk2bzacebc4i3jul2vgavroqf43q4t4htgm2n4o6aayu4wckz2uhxcqiikku
Installed: true
```
> Note: The Actor Code CID is the value you will pass to create an actor using this actor template.

## Create the actor
The create-actor init method expects parameters to define the ERC20 token

Prameters: [name, symbol, decimal, total_supply, ownderAddr]

Example Parameters (cbor): `["Zondax Coin", "ZDX", 18, 1000000, "100"]` 

Parameters cbor hex: `856B5A6F6E64617820436F696E635A4458121A000F424063313030`

Base64 encoded cbor hex: `hWtab25kYXggQ29pbmNaRFgSGgAPQkBjMTAw`


```
$ ./lotus chain create-actor bafk2bzacebc4i3jul2vgavroqf43q4t4htgm2n4o6aayu4wckz2uhxcqiikku hWtab25kYXggQ29pbmNaRFgSGgAPQkBjMTAw
sending message...
waiting for message to execute...
ID Address: t01007
Robust Address: t2725y4acry62potrbi2ufq5xe3ydptfp3owihdza
Return: gkMA7wdVAv67jgBRx7T3TiFGqFh25N4G+ZX7
```
> Note: The actor creation return 2 addresses the ID Adress may change if there is a reorg. The Robust Address is definitive and should be used preferably in testnet/mainnet.

> Note 2: The addresses are the To address that you will be using to call methods on the actor

## Get your actor status

```
$ ./lotus state get-actor t01007
Address:	t01007
Balance:	0 FIL
Nonce:		0
Code:		bafk2bzacebc4i3jul2vgavroqf43q4t4htgm2n4o6aayu4wckz2uhxcqiikku (<unknown>)
Head:		bafy2bzacedtgkx6dlsb63a7fmje6k3dpskc72dz3clqsfoa6abydkrdptm5pk
```
> Note: The Head is the CID were the actor State is stored.

```
$ ./lotus chain get bafy2bzacedtgkx6dlsb63a7fmje6k3dpskc72dz3clqsfoa6abydkrdptm5pk
[
	"Zondax Coin",
	"ZDX",
	18,
	1000000,
	{
		"100": 1000000
	},
	{}
]
```

## Method Table
List of methods on this actor with number to use when invoking

| Method Name    	| Number 	|
|----------------	|--------	|
| GetName        	| 2      	|
| GetSymbol      	| 3      	|
| GetDecimal     	| 4      	|
| GetTotalSupply 	| 5      	|
| GetBalanceOf   	| 6      	|
| Transfer       	| 7      	|
| Allowance      	| 8      	|
| TransferFrom   	| 9      	|
| Approval       	| 10     	|


## Get token name

Now lets invoke our GetName method (number 2) on our newly created actor

```
$ ./lotus chain invoke t01007 2
sending message...
waiting for message to execute...
VG9rZW4gbmFtZTogWm9uZGF4IENvaW4=
```

The return parameter is base64 encoded hex, once decoded (base64 -> hex -> str) it says "Token name: Zondax Coin".

Similarly you can invoke GetSymbol(3), GetDecimal(4) and GetTotalSupply(5). These methods do not expect any parameters.

## Get balance of a walletId

Now lets invoke our GetBalanceOf method (number 6) on our actor.

GetBalanceOf(6) requires walletAddr to fetch the balance corresponding to it.

> INPUT: `["100"]` (str -> cbor -> base64) = `gWMxMDA=`

```
$ ./lotus chain invoke t01007 6 gWMxMDA=
sending message...
waiting for message to execute...
QmFsYW5jZTogMTAwMDAwMA==
```

> OUTPUT: `QmFsYW5jZTogMTAwMDAwMA==` (base64 -> hex -> str) = `Balance: 1000000`

## Transfer to a wallet address

Now lets invoke our Transfer method (number 7) on our actor.

Transfer(6) requires walletAddr and transferAmount for a successful token transfer.

We will transfer `500 ZDX` to walletAddr `200`.
> INPUT: `["200", 500]` (str -> cbor -> base64) = `gmMyMDAZAfQ=`

```
$ ./lotus chain invoke t01007 7 gmMyMDAZAfQ=
sending message...
waiting for message to execute...
ZnJvbSAxMDAgdG8gMjAwIGFtb3VudCA1MDB9
```

> OUTPUT: `ZnJvbSAxMDAgdG8gMjAwIGFtb3VudCA1MDB9` (base64 -> hex -> str) = `From 100 to 200 amount 500`

## Allowance approval for walletId

Now lets invoke our Approval method (number 10) on our actor.

Approval(10) requires walletAddr and newAllowance as parameter.

Current state of actor:
```
[
	"Zondax Coin",
	"ZDX",
	18,
	1000000,
	{
		"100": 994510,
		"1008": 4990,
		"200": 500
	},
	{}
]
```

We will allow walletAddr `1008` to spend `100 ZDX` from default (100) wallet address's balance.
> INPUT: `["1008", 100]` (str -> cbor -> base64) = `gmQxMDA4GGQ=`

```
$ ./lotus chain invoke t01007 10 gmQxMDA4GGQ=
sending message...
waiting for message to execute...
YXBwcm92YWwgMTAwMTAwOCBmb3IgMTAw
```

> OUTPUT: `YXBwcm92YWwgMTAwMTAwOCBmb3IgMTAw` (base64 -> hex -> str) = `approval 1001008 for 100`

## Get Allowance approved

Now lets invoke our Allowance method (number 8) on our actor.

Allowance(8) requires ownerAddr and spenderAddr as parameter.

Current state of actor:
```
[
	"Zondax Coin",
	"ZDX",
	18,
	1000000,
	{
		"100": 994510,
		"1008": 4990,
		"200": 500
	},
	{
		"1001008": 100
	}
]
```

We will get allowance for address `1008` on owner address `100`.
> INPUT: `["100", "1008"]` (str -> cbor -> base64) = `gmMxMDBkMTAwOA==`

```
$ ./lotus chain invoke t01007 8 gmMxMDBkMTAwOA==
sending message...
waiting for message to execute...
QWxsb3dhbmNlIGZvciAxMDA4IGJ5IDEwMDogMTAw
```

> OUTPUT: `QWxsb3dhbmNlIGZvciAxMDA4IGJ5IDEwMDogMTAw` (base64 -> hex -> str) = `Allowance for 1008 by 100: 100`

## Transfer from allowed wallet address

Now lets invoke our TransferFrom method (number 9) on our actor.

TransferFrom(9) requires owner adress, receiver address and transfer amount as parameter.

Current state of actor:
```
[
	"Zondax Coin",
	"ZDX",
	18,
	1000000,
	{
		"100": 994510,
		"1008": 4990,
		"200": 500
	},
	{
		"1001008": 100
	}
]
```

We will transfer `50 ZDX` from address `100` to address `200` using the allowance for `1008`.
> INPUT: `["100", "200", 50]` (str -> cbor -> base64) = `g2MxMDBjMjAwGDI=`

> NOTE:  `t1lxfcz26hdzvpuzf2pzceluwfuihkzxvqdqt5c3i` is the wallet address for `1008`

```
$ ./lotus chain invoke -from t1lxfcz26hdzvpuzf2pzceluwfuihkzxvqdqt5c3i t01007 9 g2MxMDBjMjAwGDI=
sending message...
waiting for message to execute...
VHJhbnNhY3Rpb24gc3VjY2Vzc2Z1bGw=
```

> OUTPUT: `VHJhbnNhY3Rpb24gc3VjY2Vzc2Z1bGw=` (base64 -> hex -> str) = `Transaction successfull`

Final State
```
[
	"Zondax Coin",
	"ZDX",
	18,
	1000000,
	{
		"100": 994460,
		"1008": 4990,
		"200": 550
	},
	{
		"1001008": 50
	}
]
```

--- 

## Implementations on other SDKs
- [GoLang](https://github.com/ipfs-force-community/go-fvm-sdk/tree/master/examples/erc20)
