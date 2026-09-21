# MultiSwap TON

Escrow based peer to peer swaps of NFTs and jettons on TON, written in Tact.

A seller puts up a set of items and names the set they want back. Both sides fund their own contract, the two contracts bond, and the items are released to both parties in one step. Nobody has to send first and hope.

Docs: https://tact-multi-swap-docs.pages.dev

## How a swap works

1. The seller deploys an offer contract through the router, naming the items offered and the items requested.
2. The seller sends those items to the contract, one message per item.
3. The contract seals itself when the last item arrives and moves to `StateReadyToSwap`.
4. The buyer has until the router's TTL to respond. After that the seller can pull everything back with `withdraw_seller`.
5. The buyer deploys a mirrored offer, the same two sets with the sides reversed, pointing at the seller's contract.
6. The buyer funds it.
7. The two contracts bond, verify both sides, and release the items to their new owners. Both contracts close.

Assets sit in escrow the whole time. If the other side never shows up, the items go home.

## Contracts

| Contract | What it does |
|---|---|
| `multi_swap/router.tact` | Deploys offer contracts, owns the parameters: items per side, fixed fee, fee in basis points, TTL |
| `multi_swap/multi_swap.tact` | One swap, one contract. Holds the items, tracks state, bonds with its mirror |
| `multi_swap/discovery/personal.tact` | Finds a given address's offers |
| `multi_swap/discovery/timeframe.tact` | Finds offers created in a time window, three day buckets |
| `multi_swap/fees.tact`, `message.tact` | Fee math and the message protocol |
| `jetton/`, `nft/` | Jetton and NFT contracts used in tests and on testnet |

A swap contract's address is derived from its init parameters, so both sides can compute the mirror's address before it exists.

### States

| State | Meaning |
|---|---|
| `StateDeployment` (0) | Waiting for data from the router |
| `StateAwaitingFunds` (1) | Collecting items. A non initiator sends its offer to the mirror here |
| `StateReadyToSwap` (2) | Sealed, waiting on the mirror to confirm |
| `StateSwapLock` (3) | Funds locked for the duration of the swap, skipped by the initiator |
| `StateSwapped` (4) | Unlocked and delivered, can no longer expire |
| `StateFailed` (-1) | Failed to bond with the mirror |

## Tests

68 cases in `tests/MultiSwap.spec.ts` covering the happy path, expiry and withdrawal, partial funding, wrong items, mismatched mirrors and fee handling.

```
npx blueprint test
```

## Project structure

- `contracts`: the Tact sources and their dependencies
- `wrappers`: typed `Contract` wrappers with [de]serialization and compile helpers
- `tests`: contract tests
- `scripts`: deploy and interaction scripts
- `docs`: Writerside sources for the docs site

## Build and run

```
npx blueprint build
npx blueprint test
npx blueprint run          # deploy or run a script
npx blueprint create Name  # add a contract
```

### Wallets

Copy `env.example` to `.env-mainnet`, `.env-test`, `.env-test1`, `.env-test2` and fill in the wallet addresses and private keys, then:

```
npm run start-test
npm run start-test1
npm run start-test2
npm run start-mainnet
```
