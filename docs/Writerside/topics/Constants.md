# Constants


## Swap States
```TS
// Waiting for extra data from router
const StateDeployment: Int = 0;

// Contract waits for all the funds to be collected and then waits to be swapped by mirror contract
// In case if contract is not an initiatior, it will send offer to mirror
const StateAwaitingFunds: Int = 1;

// Contract will wait for mirror contract to confirm swap
const StateReadyToSwap: Int = 2;

// Used to lock funds for the duration of the swap.
// This stage is skipped if contract is initiator
const StateSwapLock: Int = 3;

// After funds are unlocked, they can be delivered to buyer.
// At this state contrant can't expire
const StateSwapped: Int = 4;

// Failed to bond with mirror
const StateFailed: Int = -1;
```

## Swap Item Types
```TS
const SWAP_ITEM_TYPE_NFT: Int = 0;
const SWAP_ITEM_TYPE_JETTON: Int = 1;
```