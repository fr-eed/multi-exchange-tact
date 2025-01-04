import { Address, beginCell, Dictionary, OpenedContract, toNano } from '@ton/core';

import { NetworkProvider } from '@ton/blueprint';
import { InitMultiSwap, MultiSwapRouter, SwapItem } from '../wrappers/MultiSwapRouter';
import { Executor } from '@ton/sandbox';
import { MultiSwap } from '../wrappers/MultiSwap';
import { TestJetton, TokenTransfer } from '../wrappers/Jetton';
import { NftItem, Transfer } from '../wrappers/Nft';
import { JettonWallet } from '@ton/ton';
import { JettonDefaultWallet } from '../build/Jetton/tact_JettonDefaultWallet';

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const router = provider.open(await MultiSwapRouter.fromInit());
    
    if (!await provider.isContractDeployed(router.address)){
        throw "Router not deployed"
    }

    const offerAddress = await ui.inputAddress("Offer Address:");

    const sellerSwap = provider.open(await MultiSwap.fromAddress(offerAddress));

    if(!await provider.isContractDeployed(sellerSwap.address)){
        throw "Seller swap no deployed on address"
    }

    let sellerData = await sellerSwap.getData();

    let offeredItems = sellerData.offered_items;
    let requestedItems = sellerData.requested_items;

    let state = sellerData.state;
    /*
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

    */

    if(state!=2n){
        throw "Contract is not waiting to bond"
    }


    const minValue = await router.getCalculateMinValue(
        offeredItems
    );

    let queryId = 0n;
    let buyerSwap: OpenedContract<MultiSwap>;
    

    while(true){

        buyerSwap = provider.open(await MultiSwap.fromInit(
            router.address,
            provider.sender().address!,
            queryId,
            false, // responder (not initator)
            // requested items are now offered because we're ressponding
            requestedItems,
            offeredItems
        ));
       
        // if not deployed
        if(!await provider.isContractDeployed(buyerSwap.address)){
            break;
        }
        
        queryId = queryId + 1n;

    }


    const deployResult = await router.send(
        provider.sender(),
        { value: minValue },
        {
            $$type: 'InitMultiSwap',
            offered_items: requestedItems, // requestted are now offered because we're responding
            requested_items: offeredItems,
            query_id: queryId, // check before edeploy if exists
            mirror_swap_address: sellerSwap.address
        } as InitMultiSwap
    );
    

    await provider.waitForDeploy(buyerSwap.address, 50)

    console.log("Offer Response Deployed:")
    console.log(buyerSwap.address.toString())


    console.log("sending NFTs and Jettons")

    for(const [key, value] of requestedItems){
        console.log(`Sending NO.${key}: ${value.amount} ${value.type == 0n ? "nft" : "jetton" } to ${buyerSwap.address.toString()}`)

        if(value.type == 0n){

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

            // await til nft will be gone

            while(true){
                const nftData =await nftItem.getGetNftData()
                if(nftData.owner_address==buyerSwap.address){
                    break;
                }
            }

            
        }else{
            const jetton =  provider.open(await TestJetton.fromAddress(value.address));

            const jettonWalletAddress =await jetton.getGetWalletAddress(
                provider.sender().address!
            )

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

  
    console.log("sent NFTs and Jettons")
}
