# PIER Stable Token contracts

PIER Stable Token contracts packed into isomorphic NPM package to be used from Node.js backend and DApps in a browser.

## Quick Start guide

> npm install


## Deploy config

Soltsice has storage factory that creates a schemaless storage on (currently) Ropsten, Rinkeby and Mainnet. 
During deploy we calculate hash of a contract bytecode and use it as a key to store the deployed address.
If the bytecode is not changed we just use an already deployed instance, otherwise we deploy a new instance 
and store its new address (the utils.ts has boilerplate code for each contract).

The logic is probably the same as in Truffle, but Truffle still produces invalid ABIs on overwrites (need to delete
artifacts before compiling) and tests from Truffle are very slow compared to `jest --watch` when we do not need to recompile
solidity. Our own storage gives complete control and flexibility vs the Truffle black box.
