# Testnet Respond To Offer

### Responding to an Offer with NFT and Jetton Using `respondToOffer`

This guide explains how to respond to an offer by sending back the NFT and Jetton using the provided `npm run start respondToOffer` script. The process involves deploying a response contract, which references the offer contract, and sending the required NFT and Jetton back to complete the transaction. This process is mainly for testing purposes on the testnet.

#### Steps to Respond to an Offer:

1. **Set Up Your Environment**:
   Ensure that you have the necessary environment variables set up, especially for your testnet. You can do this by configuring a `.env-test1` file containing the appropriate values for your network and wallet details. If the file doesn't exist, create it via: 
   ```bash
   cp env.example .env-test1
   ```

2. **Run the Script**:
   Execute the following command to start the process of responding to an offer:
   ```bash
   npm run start-test1
   ```
   This will start the process and prompt you to select `respondToOffer`.

3. **Choose the File**:
   When prompted to choose a file, select the option for responding to an offer:
   ```bash
   ? Choose file to use 
   ? Choose file to use respondToOffer
   ```

4. **Select the Network**:
   Choose `testnet` as the network to respond to the offer on the testnet.
   ```bash
   ? Which network do you want to use? 
   ? Which network do you want to use? testnet
   ```

5. **Select Your Wallet**:
   Choose the wallet type. For test purposes, you can select `Mnemonic` as the wallet type. It will read the wallet information from the `.env-test1` file.
   ```bash
   ? Which wallet are you using? 
   ? Which wallet are you using? Mnemonic
   ```

6. **Connect Your Wallet**:
   After choosing the wallet type, the script will connect to the wallet and display the connected wallet address.
   ```bash
   Connected to wallet at address: EQClpca5sKC1wrveaAmEvenc4fne8ZJwfG-3lknndLQBu-7B
   ```

7. **Enter the Offer Address**:
   The script will prompt you for the address of the offer you wish to respond to. This is the offer contract address that you received when you created the offer.
   ```bash
   ? Offer Address: EQBNPWUCJ6IBDB8k126RBxelZsH47Iot7gE2CYBm4O1yTp6W
   ```

8. **Deploy the Response Contract**:
   The script will deploy the response contract, referencing the offer address. The deployment will display the response contract address, and you will be able to view it on the testnet using `tonscan`.

   Example:
   ```bash
   Sent transaction
   Contract deployed at address EQCT0E1mxqQ481cECKj1b2D7uV49UVwBJyZL4mNbGbSfrx0r
   You can view it at https://testnet.tonscan.org/address/EQCT0E1mxqQ481cECKj1b2D7uV49UVwBJyZL4mNbGbSfrx0r
   ```

9. **Send NFTs and Jettons**:
   Once the response contract is deployed, the script will automatically send the specified NFT and Jettons to the offer address as part of the offer response. It will display the number of NFTs and the amount of Jettons being sent.

   Example:
   ```bash
   Sending NO.0: 1 nft to EQCT0E1mxqQ481cECKj1b2D7uV49UVwBJyZL4mNbGbSfrx0r
   Sent transaction
   Sending NO.1: 10000 jetton to EQCT0E1mxqQ481cECKj1b2D7uV49UVwBJyZL4mNbGbSfrx0r
   Sent transaction
   sent NFTs and Jettons
   ```

10. **Completion**:
    Once the response is successfully processed, you will see a confirmation message that the NFTs and Jettons have been sent to the offer contract address.

    Example:
    ```bash
    Offer Response Deployed:
    EQCT0E1mxqQ481cECKj1b2D7uV49UVwBJyZL4mNbGbSfrx0r
    ```

11. **View the Offer Response**:
    After deploying the response, you can view the offer response contract and other deployed contracts on the testnet via `tonscan`.

    Example:
    ```bash
    You can view it at https://testnet.tonscan.org/address/EQCT0E1mxqQ481cECKj1b2D7uV49UVwBJyZL4mNbGbSfrx0r
    ```