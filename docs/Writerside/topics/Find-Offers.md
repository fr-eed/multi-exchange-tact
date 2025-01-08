# Find offers


## Querying the Discovery Contract to Find Transactions

In this article, we'll walk you through querying the **discovery contract** to find transactions related to offers. We'll cover both **TimeframeDiscovery** and **PersonalDiscovery** contracts, explaining how they differ and how to use them to fetch relevant data.

### Step 1: Set Up and Validate Contract Deployment

We begin by opening the **MultiSwapRouter** contract and checking if it is deployed. If the router isn’t deployed, the script will stop with an error message.

```javascript
const router = provider.open(await MultiSwapRouter.fromInit());

if (!await provider.isContractDeployed(router.address)) {
    throw "Router not deployed";
}
```

### Step 2: Query the Discovery Contracts

 #### 2.1 Timeframe Discovery Contract

 The **TimeframeDiscovery** contract is used to retrieve offers related to a specific timeframe, which updates every three days (this might change in the future). Offers in this contract are typically initiated offers, meaning the user is offering something to others.

 To query the **TimeframeDiscovery** contract:

 1. Open the **TimeframeDiscovery** contract using the router’s address and the current timeframe.
 2. Validate if the contract is deployed.

```javascript
let timeframeDiscovery = provider.open(await TimeframeDiscovery.fromInit(
    router.address,
    await router.getCurrentTimeframe()
));

if (!await provider.isContractDeployed(timeframeDiscovery.address)) {
    throw "TimeframeDiscovery not deployed";
}
```

#### 2.2 Personal Discovery Contract

The **PersonalDiscovery** contract is linked to specific wallet addresses and is used to retrieve offers initiated or responded to by that address. This contract provides a more personal view of transactions, including both initiated and responded offers.

To query **PersonalDiscovery**:

1. Ask for the seller's address.
2. Open the **PersonalDiscovery** contract using the router’s address and the seller’s address.
3. Validate if the contract is deployed for the seller.

```javascript
const sellerAddress = await ui.inputAddress("Enter seller address: ");

let personalDiscovery = provider.open(await PersonalDiscovery.fromInit(
    router.address,
    sellerAddress
));

// validate contract deployed
if (!await provider.isContractDeployed(personalDiscovery.address)) {
    throw "PersonalDiscovery not deployed for this address";
}
```

### Step 3: Retrieve and Parse Offers

Now that the discovery contract is set up, we query it to get a list of offers. You can specify the number of the most recent offers you want to fetch.

For **TimeframeDiscovery**, offers will be for the current timeframe. For **PersonalDiscovery**, the offers are specific to a wallet’s activity.

First parameter is id of last transaction we want to query over and second is the limit of transactions.

Parsing many transactions at one might slow down request so it's better to limit it

```javascript
let numberOfLastOffersToParse = 10n;

let numOfOffers = await timeframeDiscovery.getNumberOfOffers(); // or from personalDiscovery

let offers = await timeframeDiscovery.getRecentOffers(numOfOffers - 1n, numberOfLastOffersToParse);
```

### Step 4: Iterate Over Offers

The script will loop through the retrieved offers, fetch details about each one, and log relevant data like:

- **State** of the offer
- **Expiration time**
- **Items offered and requested**

```javascript
for (let i = numOfOffers - 1n; i >= numOfOffers - numberOfLastOffersToParse; i--) {
    if (i < 0) {
        break;
    }
    
    let offerAddress = offers.get(Number(i))!;
    console.log("=================\n\nItem id: ", i);
    console.log("Offer address: ", offerAddress.toString());

    let offer = provider.open(await MultiSwap.fromAddress(offerAddress));

    if (!await provider.isContractDeployed(offer.address)) {
        throw "Offer not deployed";
    }

    let data = await offer.getData();
    
    console.log("Is initiator: ", data.is_initiator);
    console.log("State: ", getStateString(Number(data.state)));
    console.log("Expiration time: ", data.expiration_time_seconds);
    console.log("Is expired: ", data.is_expired);
    
    // Log the items offered and requested
    function logItems(items_map) {
        for (let j = 0; j < items_map.size; j++) {
            let item = items_map.get(j);
            console.log("Item address: ", item?.address);
            console.log("Item type: ", item?.type == 0n ? "NFT" : "Jetton");
            console.log("Item amount: ", item?.amount);
            console.log("\n");
        }
    }
    console.log("Items offered:");
    logItems(data.offered_items);

    console.log("Items requested:");
    logItems(data.requested_items);

    console.log("\n\n=================");

    // Sleep to avoid rate-limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
}
```

### Step 5: Understanding Offer States

The state of each offer provides valuable information about its current condition. The possible states are:

- **StateDeployment (0)**: The offer is being deployed.
- **StateAwaitingFunds (1)**: Waiting for funds to be received.
- **StateReadyToSwap (2)**: The offer is ready to be swapped.
- **StateSwapLock (3)**: The swap is locked.
- **StateSwapped (4)**: The offer has been swapped successfully.
- **StateFailed (-1)**: The offer has failed.

We convert the state into a human-readable string using the `getStateString` function.

```javascript
function getStateString(state: number) {
    const index = stateValues.indexOf(state as any);
    return index === -1 ? 'Unknown' : stateKeys[index];
}
```

### Querying Older Timeframes

To query older timeframes, you can use the `getTimeFramePeriod()` method to get the period of the current timeframe and subtract from it to access past periods.

```javascript
let timeFramePeriod = await router.getTimeFramePeriod();
```

