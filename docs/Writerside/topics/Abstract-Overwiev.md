# Abstract Overview of Offers and How They Work

### The Offer Process

1. **Seller Creates the Offer Contract**:
   The process begins when the seller creates an offer contract. This contract specifies the assets they are willing to exchange (such as NFTs and Jettons) and the conditions of the trade.

2. **Seller Sends NFTs and Jettons to the Offer Contract**:
   After creating the offer contract, the seller sends their assets (NFTs and Jettons) to the offer contract. Each asset is sent in a separate message, but can be send in one transaction if TON Wallet allows it.

3. **Sealing the Offer Contract**:
   The offer contract is sealed when the final asset (either NFT or Jetton) arrives at the contract. This action changes the contract’s state to `StateReadyToSwap`, indicating that the offer is complete and ready for the buyer to respond.

4. **Response Time Limit**:
   Once the offer contract is sealed, the contract enters a waiting period as specified by a time limit in the router. During this period, the buyer has the opportunity to respond to the offer. If the time limit is exceeded without a response, the seller can withdraw the funds via the `withdraw_seller` message sent to the offer contract.

5. **The Buyer Creates a Mirrored Offer**:
   To respond to the offer, the buyer creates a mirrored offer where the items requested and offered are reversed. For example, if the seller offers NFT 1 and requests NFT 2, the buyer's offer will request NFT 1 and offer NFT 2. This creates a symmetrical trade where both parties have matched the items they wish to exchange.

6. **Buyer Deploys the Offer**:
   The buyer deploys their offer contract, specifying the items they are offering and the address of the seller’s offer contract. The buyer then sends their part of the deal (NFTs, Jettons, etc.) to the offer contract.

7. **Automatic Bonding and Unlocking of Funds**:
   Once both the seller’s and buyer’s offers are deployed and funded, the contracts bond together. Upon meeting the necessary conditions, the funds are automatically unlocked and sent to each party, completing the trade and closing both contracts.

This system allows secure exchange where assets are held in escrow until both parties fulfill their part of the deal. If any party fails to complete their part of the transaction, the contract ensures that the seller can withdraw their assets, minimizing the risk of fraud or misunderstanding.