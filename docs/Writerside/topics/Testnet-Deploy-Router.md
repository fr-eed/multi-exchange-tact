# Testnet Deploy router

### Deploying router using `deployRouter`

This guide explains how to respond to an offer by sending back the NFT and Jetton using the provided `npm run start respondToOffer` script. The process involves deploying a response contract, which references the offer contract, and sending the required NFT and Jetton back to complete the transaction. This process is mainly for testing purposes on the testnet.

#### Steps to Respond to an Offer:

1. **Set Up Your Environment**:
   Ensure that you have the necessary environment variables set up, especially for your testnet. You can do this by configuring a `.env-test` file containing the appropriate values for your network and wallet details. If the file doesn't exist, create it via:
   ```bash
   cp env.example .env-test
   ```

2. **Run the Script**:
   Execute the following command to start the process of responding to an offer:
   ```bash
   npm run start-test
   ```
   This will start the process and prompt you to select `deployRouter`.

3. **Choose the File**:
   When prompted to choose a file, select the option for responding to deployRouter:
   ```bash
   ? Choose file to use 
   ? Choose file to use deployRouter
   ```

4. **Select the Network**:
   Choose `testnet` as we're on the testnet.
   ```bash
   ? Which network do you want to use? 
   ? Which network do you want to use? testnet
   ```

5. **Select Your Wallet**:
   Choose the wallet type. For test purposes, you can select `Mnemonic` as the wallet type. It will read the wallet information from the `.env-test` file.
   ```bash
   ? Which wallet are you using? 
   ? Which wallet are you using? Mnemonic
   ```

6. **Connect Your Wallet**:
   After choosing the wallet type, the script will connect to the wallet and display the connected wallet address.
   ```bash
   Connected to wallet at address: EQClpca5sKC1wrveaAmEvenc4fne8ZJwfG-3lknndLQBu-7B
   ```
   
7. **Wait For Router Deployment**:
   This step might take some time, but when it's complete you'll receive a message:
   ```bash
   Router deployed at address: EQClpca5sKC1wrveaAmEvenc4fne8ZJwfG-3lknndLQBu-7B
   ```