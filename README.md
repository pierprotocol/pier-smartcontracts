# Welcome to ////Pier

We need a way at Etch of paying people wages and bonuses within the blockchain community in crypto without exposing them to volatility risk of paying out in Ether or Bitcoin. A number of existing “stable” tokens are available that mitigate this risk, some like Tether and TrueCoin are backed by USD on deposit, others like MakerDAO, Dai uses Ether to over colatorised to achieve this stability.

We are proposing another solution: a solution where participating blockchain companies stake their own token within a basket of other ERC20 tokens in a smart contract that has the ability to “top up” with more tokens to keep the stability.
Also we think “pegging” our token to a basket of commodities that eventually dictates the cost of food for households is better in the long run for our customers. For this we can target the price of our token to the UN FAO Food Price Index, or the Consumer Price Index.

Also we think “pegging” our token to a basket of commodities that eventually dictates the cost of food for households is better in the long run for our customers. For this we can target the price of our token to the UN FAO Food Price Index, or the Consumer Price Index.

## Introducing the ////Pier token protocol

The ////Pier token protocol is an algorithmic formula set out in a number of smart contracts.

Our goal is to produce an open source decentralised asset that has all the properties of “money” - store of value, unit of account and medium of exchange.

Main Features:

- ERC20
- Fully audible reserve
- Fully audible creation

## Asset Class

We have two: A primary price target asset class, and a stability contract that is made up essentially of a number of ERC20 tokens. 

Price Target: The FAO Food Price Index, or the Consumer Price Index.

The FAO Food Price Index is a measure of the monthly change in international prices of a basket of food commodities: Cereal, Vegetable Oil, Dairy, Meat and Sugar.

Essentially, what we want to achieve is that a user holding ////Pier tokens in August to have the same buying power as they would have had in January to essentially “put food on the table”. 

The ////Pier token protocol stabilises price by monitoring the price of all tokens that is used for colatarisation. This information is found through oracles and api from the exchanges. 

The process of topping up the tokens follows this simple equation:

```
OPERATIONAL RULE
At the end of some predefined interval of time, if the change in token price over the interval is X%, change token supply by X%
```
One goal is to give Blockchain companies the ability to create liquidity from existing own tokens by adding them to the ///Pier protocol that will capitalized the reserve and issue new tokens. Primarily these new tokens are to be used to pay workers through the Etch protocol, or can be sold to the crypto market who would see the benefit of holding a low volatility token.

## What problem does the ////Pier token solve?

We are solving the problem of extreme price volatility in crypto that makes receiving them as payment a gamble in itself - will it go up, down?? Most will coordinate the payment and the end user will liquidate to fiat. This is quite clunky and not suitable long term. 

Also we are solving the problem of limited liquidity for blockchain companies and the fact that most don't have a bank account and are finding converting ETHER raised to Fiat to pay wages / bonuses difficult. 

## Use Cases


- Audience requiring to be paid in crypto that will have the same value today as when “fee/rate” was agreed.
- Audience requiring a safe harbour for crypto gains. 
- Post ICO companies with large token reserves looking for an efficient way to create liquidity and raise further funds

## Smart Contract - Token Issuance

Extra tokens can be created by calling the deployed contract function.  This process requires the issuer to deposit a number of ERC20 tokens in to two wallets:
 
Wallet 1 - Master Contract.
Wallet 2 - Top-Up wallet.

There are eight steps to issuing additional ////Pier tokens:

1. Issuer presents the contract with a new ERC20 token to be used as collateral
2. Approve  / Reject is received from the contract based on a number of underlying criteria to include but not limited to: volume, price feed availability and if token is already on the pre-approved white list
3. If successful, issuer calls the contracts issue function with the number of tokens to be issued 
4. Contract queries the set parameters limit to make sure that the new ERC20 token is within the allowed allocation in % of existing collateral 
5. The issuer is then presented with two quantities of tokens to deposit in two separate wallet - The main issuer wallet, and the “top-up” contract. A fee in ETCH supply token is charged.
6. Once deposited the contract will create and deposit the corresponding number of ////Pier tokens to the issuer wallet address
7. Tokens sent to the contract are held in cold storage as collateral for future redemption.
8. If any any transaction is unsuccessful the whole transaction is reverted

## Token parameters

![Pier Figure 1](https://github.com/pierprotocol/pier-smartcontracts/blob/master/Pier_figure_1.png)
![Pier Figure 2](https://github.com/pierprotocol/pier-smartcontracts/blob/master/Pier_figure_2.png)
![Pier Figure 3 and 4](https://github.com/pierprotocol/pier-smartcontracts/blob/master/Pier_Figure_3_4.png)

## Security

Collateral funds will be deposited in protected multi-signature wallets requiring 3/4 signatures to access. 

## Black Swan Event

The ////Pier token protocol is very much linked to the health of the Ethereum system. If there is any liveness issue with the Ethereum network, say if  blocks cannot be minedor a  51% attack by a bad actor the integrity of the ////Pier could be in jeopardy.	

Also a possible sharp crash in the market or some other failure in the oracle system could have huge implications. This is why we intend to have a a big red button within the contract that is governed by the ////Pier community.

A ratchet system is proposed to sell any underperforming token when distress level is reached. 

## Get Involved!

We are an open community and need technologists, economists, crypto traders, accountants (is every transaction taxable??) lawyers, and artists to work on the specifications and code. Twenty percent of the ////Pier reward token are available to share (kind of founders token shares). If you would like to get involved please join the Telegram channel by signing up here:

[Pier Telegram Channel](https://t.me/joinchat/Gd5CvUakS9f4ZVnGSJuwaQ)
 
Twitter:

////Pier [@pierprotocol](https://twitter.com/pierprotocol)

Euros Evans [@euros](https://twitter.com/euros)

Yuriy Habarov [@yuriy_habarov](https://twitter.com/yuriy_habarov)		 	 	 		




