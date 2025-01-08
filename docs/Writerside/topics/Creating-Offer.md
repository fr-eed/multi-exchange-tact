# Testnet Create Offer

### Creating an Offer with NFT and Jetton Using `createOfferWNft`

This guide explains how to create an offer in a simple way using the provided `npm run start createOfferWNft` script. This process will deploy an NFT and Jetton, create an offer, and prompt you to input the buyer's address. The NFT will be sent to this address, which can be used to close the offer later. This process is mainly for testing purposes on the testnet.

#### Steps to Create an Offer:

1. **Set Up Your Environment**:
   Ensure that you have the necessary environment variables set up, especially for your testnet. You can do this by configuring a `.env-test2` file containing the appropriate values for your network and wallet details. If file doesn't exist, create it via: 
   ```bash
   cp env.example .env-test2
   ```

2. **Run the Script**:
   Execute the following command to run the process of creating the offer:
   ```bash
   npm run start-test2
   ```
   This will start the process and prompt you to select createOfferWNft.

3. **Choose the File**:
   When prompted to choose a file, select the option for creating an offer with NFT and Jetton:
   ```bash
   ? Choose file to use 
   ? Choose file to use createOfferWNfts
   ```

4. **Select the Network**:
   Choose `testnet` as the network to deploy the contracts for testing purposes.
   ```bash
   ? Which network do you want to use? 
   ? Which network do you want to use? testnet
   ```

5. **Select Your Wallet**:
   Choose the wallet type. For test purposes, you can select `Mnemonic` as the wallet type. It will read it from `.env-test2` file
   ```bash
   ? Which wallet are you using? 
   ? Which wallet are you using? Mnemonic
   ```

6. **Connect Your Wallet**:
   After choosing the wallet type, the script will connect to the wallet and display the connected wallet address.
   ```bash
   Connected to wallet at address: EQBHLKOT-um63o7nDxjAUtWw0-dCsxJevSu_ehm-eqZZyHfY
   ```

7. **Deploy the Contracts**:
   The script will then proceed to deploy the necessary contracts for NFT and Jetton. Each contract deployment will be followed by the contract address and a link to view it on the testnet using `tonscan`.
   
   Example:
   ```bash
   Sent transaction
   Contract deployed at address EQAD3d37RB9nvPuAv70PSmDGEW5pZHQv9cJbhs64hV5VrNmC
   You can view it at https://testnet.tonscan.org/address/EQAD3d37RB9nvPuAv70PSmDGEW5pZHQv9cJbhs64hV5VrNmC
   ```

8. **Enter the Buyer’s Address**:
   After deploying the contracts, the script will prompt you for the buyer's address. This is the address that will receive the NFT in order to respond to this test offer later.
   ```bash
   ? second wallet address to claim nft:  0QClpca5sKC1wrveaAmEvenc4fne8ZJwfG-3lknndLQBuwiO
   ```

9. **Deploy Jetton Wallet**:
   The script will deploy the Jetton wallet associated with the offer, displaying the contract address.
   ```bash
   jetton wallet EQAKPBH1-0K3tYTKVon-o7zoWFc39_xwXesTDevwqkPRqmIf
   ```

10. **Send NFTs and Jettons**:
    Once the offer is deployed, the script will automatically send the specified NFT and Jettons to the buyer's address. This includes displaying the number of NFTs and the amount of Jettons being sent, followed by a confirmation of successful transactions.

    Example:
    ```bash
    Sending NO.0: 1 nft to EQBNPWUCJ6IBDB8k126RBxelZsH47Iot7gE2CYBm4O1yTp6W
    Sent transaction
    Sending NO.1: 10000 jetton to EQBNPWUCJ6IBDB8k126RBxelZsH47Iot7gE2CYBm4O1yTp6W
    Sent transaction
    sent NFTs and Jettons
    ```

11. **Completion**:
    Once the process is completed, you will see a message confirming the successful creation of the offer and the transfer of NFTs and Jettons.
    Save this address for later

    Example:
    ```bash
    Offer Deployed:
    EQBNPWUCJ6IBDB8k126RBxelZsH47Iot7gE2CYBm4O1yTp6W
    ```

12. **View the Offer**:
    After deploying the offer, you can view the offer contract and other deployed contracts on the testnet via `tonscan`.

    Example:
    ```bash
    You can view it at https://testnet.tonscan.org/address/EQBNPWUCJ6IBDB8k126RBxelZsH47Iot7gE2CYBm4O1yTp6W
    ```
