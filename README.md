# multiswap-ton"

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts.

## How to use

### Build

`npx blueprint build` or `yarn blueprint build`

### Test

`npx blueprint test` or `yarn blueprint test`

### Deploy or run another script

`npx blueprint run` or `yarn blueprint run`

### Add a new contract

`npx blueprint create ContractName` or `yarn blueprint create ContractName`


### create envirements to setup wallets

### create environments to setup wallets

copy `env.example` to `.env-mainnet`, `.env-test`, `.env-test1`, `.env-test2`, etc. and fill in your wallet addresses and private keys.

`npm run start-test`, `npm run start-test1`, `npm run start-test2`, or `npm run start-mainnet`

