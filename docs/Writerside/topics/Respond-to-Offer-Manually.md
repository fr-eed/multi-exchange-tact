# Respond to Offer Manually Using TS interface
---

This guide explains how to respond to an offer manually by interacting with the contract interface using TypeScript. The process involves verifying the contract state, deploying the response contract, and sending the requested assets to the seller’s offer contract.

### Steps to Respond to an Offer

1. **Find Router Address**:
   The first step is to find the current router address. In the current version of the contract, only one router can exist, but this may change in the future.
   ```ts
   const router = provider.open(await MultiSwapRouter.fromInit());
   
   if (!await provider.isContractDeployed(router.address)){
       throw "Router not deployed";
   }
   ```

2. **Enter Offer Address**:
   You'll need the address of the seller's offer contract. Ask the user to input the offer address, then fetch the offer contract.
   ```ts
   const offerAddress = await ui.inputAddress("Offer Address:");
   const sellerSwap = provider.open(await MultiSwap.fromAddress(offerAddress));

   if (!await provider.isContractDeployed(sellerSwap.address)){
       throw "Seller swap not deployed at address";
   }
   ```

3. **Check Contract State**:
   Fetch the current state of the offer contract to ensure it is waiting for a buyer. The contract should be in `StateReadyToSwap` (state 2). And not be expired at the time of the offer.
   
   To be extra safe one could check the `sellerData.expiration_time_seconds` and limit users from sending transactions in last 10 minutes
   ```ts
   let sellerData = await sellerSwap.getData();
   let offeredItems = sellerData.offered_items;
   let requestedItems = sellerData.requested_items;
   let state = sellerData.state;

   if (state !== 2n) {
       throw "Contract is not waiting to bond";
   }
   
   if (sellerData.is_expired){
        throw "Contract is expired"
   }
   ```

4. **Calculate Minimum Value**:
   Use the router to calculate the minimum value required to initiate the response.
   ```ts
   const minValue = await router.getCalculateMinValue(requestedItems);
   ```

5. **Find Query ID**:
   Loop through potential `queryId` values to find a valid one for the response contract, ensuring it doesn't interfere with any existing contracts.
    
   ! Do not forget to swap the requestedItems with offeredItems because sellers offered is buyers requested
   ```ts
   let queryId = 0n;
   let buyerSwap: OpenedContract<MultiSwap>;

   while (true) {
       buyerSwap = provider.open(await MultiSwap.fromInit(
           router.address,
           provider.sender().address!,
           queryId,
           false, // responder (not initiator)
           requestedItems,
           offeredItems
       ));

       if (!await provider.isContractDeployed(buyerSwap.address)){
           break;
       }

       queryId = queryId + 1n;
   }
   ```

6. **Deploy the Response Contract**:
   If the response contract is not already deployed, send the necessary initialization transaction to deploy the response contract.
   
! Do not forget to swap the requestedItems with offeredItems because sellers offered is buyers requested
```ts
   const deployResult = await router.send(
       provider.sender(),
       { value: minValue },
       {
           $$type: 'InitMultiSwap',
           offered_items: requestedItems, // Now offered as we are responding
           requested_items: offeredItems,
           query_id: queryId,
           mirror_swap_address: sellerSwap.address
       } as InitMultiSwap
   );

   await provider.waitForDeploy(buyerSwap.address, 50);
   console.log("Offer Response Deployed:");
   console.log(buyerSwap.address.toString());
   ```

7. **Send Requested NFTs and Jettons**:
   The next step is to send the requested NFTs and Jettons to the buyer’s contract. This should be done in a transaction, possibly with TonConnect if supporting multi-message transactions.
   
   Usually NFTs and Jettons take 0.07 ton to be transferred and also to trigger the swap contract
   Do not forget to specify response_destination in order to get some funds back
   `forward_amount` should be set to `0.02 ton`

```ts
   console.log("Sending NFTs and Jettons");

   for (const [key, value] of requestedItems) {
       console.log(`Sending NO.${key}: ${value.amount} ${value.type === 0n ? "nft" : "jetton"} to ${buyerSwap.address.toString()}`);

       if (value.type === 0n) {  // NFT case
           const nftItem = provider.open(await NftItem.fromAddress(value.address));

           const deployResult = await nftItem.send(
               provider.sender(),
               {
                   value: toNano('0.07'),
               },
               {
                   $$type: 'Transfer',
                   query_id: 0n,
                   new_owner: buyerSwap.address,
                   response_destination: provider.sender().address,
                   custom_payload: null,
                   forward_amount: toNano('0.02'),
                   forward_payload: beginCell().endCell().asSlice(),
               } as Transfer
           );

           // Wait until the NFT is transferred
           while (true) {
               const nftData = await nftItem.getGetNftData();
               if (nftData.owner_address === buyerSwap.address) {
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
                   sender: buyerSwap.address,
                   response_destination: provider.sender().address!,
                   custom_payload: null,
                   forward_ton_amount: toNano('0.02'),
                   forward_payload: beginCell().endCell().asSlice(),
               } as TokenTransfer
           );
       }
   }

   console.log("Sent NFTs and Jettons");
   ```

8. **Confirm the Transaction**:
   After sending the assets, confirm the transaction is complete. The contract should now be waiting to finalize the swap.
   ```ts
   let buyerData = await buyerSwap.getData();
   let state = buyerData.state;

   if (state !== 4n) { // StateSwapped: 4
       throw "Contract did not swap correctly";
   }
   ```

9. **Failed Scenario**:
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

This guide covers the process of responding to an offer manually using the TypeScript contract interface. After sending the requested NFTs and Jettons, the buyer’s response contract is deployed, and the swap contract is now waiting for confirmation.