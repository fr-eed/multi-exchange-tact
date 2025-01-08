# Router


### 1. Deploying the Router

To deploy the MultiSwap Router, we start by sending a deployment transaction to the blockchain. This action opens a new instance of the router and initiates the process of adding it to the network.

```javascript
// Deploying the router
const router = provider.open(await MultiSwapRouter.fromInit());

// Sending the deployment transaction with a value of 0.1 TON
await router.send(provider.sender(), 
    {
        value: toNano(0.1) // Sending 0.1 TON for deployment
    }, 
    {
        $$type: 'Deploy', 
        queryId: 0n, // Deployment query ID
    }
);

// Waiting for the router to be deployed and confirming its address
await provider.waitForDeploy(router.address);
```

Once the router is deployed, the first user who initiates this deployment becomes the **owner** of the router. The owner has the authority to modify the router’s settings.

### 2. Changing Router Settings

As the owner, you have the ability to update the router's settings using the `UpdateSwapRouterData` message format. The following settings can be configured:

- **`max_items_per_side`**: The maximum number of NFTs and Jettons allowed on each side of a swap offer (default is 4).
- **`fixed_fee_in_ton`**: A fixed fee in TON to be applied to both the seller and the buyer.
- **`swap_fee_basis_points`**: The swap fee, defined in basis points (1/100th of a percent), to be applied to both the seller and the buyer.
- **`swap_ttl_seconds`**: The time-to-live (TTL) for the swap in seconds.

Here is the structure you’ll use to update these settings:

```javascript
message UpdateSwapRouterData {
    max_items_per_side: Int as uint8; // Maximum NFTs and Jettons per offer side, default 4
    fixed_fee_in_ton: Int as coins; // Fixed fee for both seller and buyer
    swap_fee_basis_points: Int as uint16; // Fee percentage in swap tokens (1/100th of 1%)
    swap_ttl_seconds: Int as uint32; // Time-to-live for the swap in seconds
}
```

### 3. Summary

- **Owner Role**: The first user to deploy the router automatically becomes the owner and gains the ability to modify the router's settings.
- **Configurable Settings**: The owner can change parameters such as the maximum number of items per side, the fixed fee, the swap fee percentage, and the TTL for swaps.

By following these steps, you can efficiently deploy a MultiSwap Router and tailor its settings to your needs.
