# Create Offer Manually Using TS interface
This guide explains how to create an offer manually by interacting with the contract interface using TypeScript. The process involves defining the items being offered and requested (NFTs and Jettons), deploying the offer contract, and sending the assets to the offer contract.

### Steps to Create an Offer


1. **Find Router address**:
    First of all we should find current router address. In current version of contract only one router can exist
    But this might change in the future.
```ts
    const router = provider.open(await MultiSwapRouter.fromInit());
    
    if (!await provider.isContractDeployed(router.address)){
        throw "Router not deployed"
    }
```


2. **Define Offered and Requested Items**:
   To create an offer, you first need to define the items being offered and requested. This involves specifying the type (NFT or Jetton), the amount, and the address of the assets involved.

   ```ts
   let offeredItems: Dictionary<number, SwapItem> = Dictionary.empty();
   let requestedItems: Dictionary<number, SwapItem> = Dictionary.empty();
   offeredItems.set(0, {
       $$type: 'SwapItem',
       amount: 1n,  // NFT amount (always 1)
       type: 0n,    // Type 0 for NFT
       address: nft0.address,
   });

   offeredItems.set(1, {
       $$type: 'SwapItem',
       amount: jetton0Amount, // Jetton amount
       type: 1n,             // Type 1 for Jetton
       address: jetton0.address,
   });

   requestedItems.set(0, {
       $$type: 'SwapItem',
       amount: 1n,  // NFT amount (always 1)
       type: 0n,    // Type 0 for NFT
       address: nft1.address,
   });
   ```

3. **Calculate the Minimum Value**:
   Use the router to calculate the minimum value required to initiate the offer.

   ```ts
   const minValue = await router.getCalculateMinValue(offeredItems);
   ```

4. **Find required queryId**:
   In next step we should find new queryId so our new offer won't interfere with possibly deployed offer before
   For that we can loop over each query id to find not deployed offer contract.
   In most cases it would be 0n

   ```ts
    let queryId = 0n;
    let sellerSwap: OpenedContract<MultiSwap>;
    

    while(true){

        sellerSwap = provider.open(await MultiSwap.fromInit(
            router.address,
            provider.sender().address!,
            queryId,
            true, // initiator is seller
            offeredItems
            requestedItems,
        ));
       
        // if not deployed
        if(!await provider.isContractDeployed(sellerSwap.address)){
            break;
        }
        
        queryId = queryId + 1n;

    }
   ```

5. **Deploy the Offer Contract**:
   If the contract is not already deployed, send the necessary initialization transaction to deploy the offer contract.

   ```ts
   
   const deployResult = await router.send(
       provider.sender(),
       { value: minValue },
       {
           $$type: 'InitMultiSwap',
           offered_items: offeredItems,
           requested_items: requestedItems,
           query_id: queryId,
       } as InitMultiSwap
   );
   
   ```

6. **Wait for Deployment**:
   After sending the deployment transaction, wait for the offer contract to be successfully deployed.

   ```ts
   await provider.waitForDeploy(sellerSwap.address, 50);
   console.log("Offer Deployed:");
   console.log(sellerSwap.address.toString());
   ```

7. **Send NFTs and Jettons to the Offer Contract**:
   The next step is to send the offered NFTs and Jettons to the offer contract. This is done in one or more transactions, depending on the asset type.
   If TonConnect supports sending multiple messages in one transaction this could be done that way.
    
    Usually NFTs and Jettons take 0.07 ton to be transferred and also to trigger the swap contract
    Do not forget to specify response_destination in order to get some funds back
    `forward_amount` should be set to `0.02 ton`
   ```ts
   console.log("sending NFTs and Jettons");

   for (const [key, value] of offeredItems) {
       console.log(`Sending NO.${key}: ${value.amount} ${value.type == 0n ? "nft" : "jetton" } to ${sellerSwap.address.toString()}`);

       if (value.type == 0n) {  // NFT case
           const nftItem = provider.open(await NftItem.fromAddress(value.address));

           const deployResult = await nftItem.send(
               provider.sender(),
               {
                   value: toNano('0.07'),
               },
               {
                   $$type: 'Transfer',
                   query_id: 0n,
                   new_owner: sellerSwap.address,
                   response_destination: provider.sender().address,
                   custom_payload: null,
                   forward_amount: toNano('0.02'),
                   forward_payload: beginCell().endCell().asSlice(),
               } as Transfer
           );

           // Wait until the NFT is transferred (only because we're sending in 2 tx)
           while(true){
               if ((await nftItem.getGetNftData()).owner_address.toString() == sellerSwap.address.toString()) {
                   break;
               }
               await new Promise(r => setTimeout(r, 3000));
           }
       } else {  // Jetton case
           const jetton = provider.open(await TestJetton.fromAddress(value.address));

           const jettonWalletAddress = await jetton.getGetWalletAddress(provider.sender().address!);

           const jettonWallet = provider.open(await JettonDefaultWallet.fromAddress(jettonWalletAddress));

           const transferResult = await jettonWallet.send(
               provider.sender(),
               {
                   value: toNano('0.07'),
               },
               {
                   $$type: 'TokenTransfer',
                   query_id: 0n,
                   amount: value.amount,
                   sender: sellerSwap.address,
                   response_destination: provider.sender().address,
                   custom_payload: null,
                   forward_ton_amount: toNano('0.02'),
                   forward_payload: beginCell().endCell().asSlice(),
               } as TokenTransfer
           );
       }
   }
   ```

7. **Confirm the Transaction**:
   After sending the NFTs and Jettons to the offer contract, the transaction is complete. The contract is now ready to be used, and you can confirm the assets have been successfully sent.
    
   Refer to [constants](Constants.md) to know at which state contract is in.
   
   In our case healthy response should be 2, that would mean that all Jettons and NFTs have been received and contract is now waiting to bond with buyer.
    
   
   Note: it make take some time for contract to receive Jettons and NFTs
   
   
   ```ts
    let sellerData = await sellerSwap.getData();

    let state = sellerData.state;

    if(state!=2n){ //  StateReadyToSwap: Int = 2;
        throw "Contract is not waiting to bond"
    }
   ```

8. **Failed Scenario**:
  In case if seller won't be able to find a buyer or for some reason won't be able to provide all the assets, contract will expire in `expiration_time_seconds` timestamp

  This is only possible on StateFailed or when contract has expired on state `StateAwaitingFunds(1)` | `StateReadyToSwap(2)`
  To retrieve lost assets, seller should message contract with `"withdraw_seller"` comment:
   ```ts
    await sellerSwap.send(
        provider.sender(),
        {
            value: toNano('0.03'),
        },
        "withdraw_seller"
    );
    
   ```
  

This guide covers the process of creating an offer manually using the TypeScript contract interface. Once the offer is created and assets are sent, the offer contract is deployed and the assets are locked in escrow, waiting for the buyer's response.