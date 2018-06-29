# PIER Stable Token Blockchain API

Server for Ethereum APIs to fallback when web3.js instance is not present in window, plus DApp host.

Methods are visible in Swagger at `/api/v1`.

## Platform Methods

All token and ether values for worker accounts on the platform are measured in nanoTokens (1e-9 of tokens or 1e+9 of wei), except proof of stake that is not used at the moment and is measured in millitokens. This scale covers all possible values
of tokens and Ether and saves a lot of gas by tightly packing the values.

### GET /bc-api/v1/eth/

Ethereum info (network id, block number).

### GET /bc-api/v1/eth/address

Bot address. It is generated automatically on a new machine and must remain constant. It must be enabled
to accept receipts signed by it. It also must have some ether balance to pay for fees (gas) if we 
withdraw balances for workers (e.g. as a curtesy once a week/3 days).

### POST /bc-api/v1/eth/approveWorkAsync

Writes a new receipt to a worker state channel. Calculates worker's balance as the last receipt value minus
anchored state. When amount is `zero` then we return the current balance.

### GET /bc-api/v1/eth/withdraw/{address}

Withdraw current balance for the worker at `address`. Returns transaction hash immediately without waiting when the tx is mined. Balance from `approveWorkAsync` will be updated automically when the tx is mined.

### GET /bc-api/v1/eth/receipt/{address}

Current worker account state. Mostly useful for debugging.

### GET /bc-api/v1/eth/receiptData/{address}

Returns the latest checkout transaction data as hex that could be inserted into MetaMask or any other wallet
to withdraw balances due without interacting with our backend. Tx must be send to `account manager` address below.

**This is the key feature of state channels implementation**: workers could withdraw funds securely at any time
(subject to withdrawal time limit needed for security, i.e. rate limit withdrawals if signer is compromised).


### GET /bc-api/v1/eth/manager

Get the address of account manager. Workers could send `receiptData` to this address with `zero` Ether value.

### GET /bc-api/v1/eth/wallet

Get multisig wallet address that manages the most important operations on the platform.


### GET /bc-api/v1/eth/token

Get PIER token address.


## Token methods

PIER token has 18 decimals, which is a de facto standard. All values related to ERC20 balances are in wei (1e-18).

### GET /bc-api/v1/token/supply

Get total token supply in wei.

### GET /bc-api/v1/token/balance/{address}

Get balance of the `address`.


## State channels in action

Using Swagger & MetaMask to show all required steps

<img src="https://raw.githubusercontent.com/dbrainio/dbrain-blockchain-api/master/docs/state_channels.gif" width="600" />

## License


