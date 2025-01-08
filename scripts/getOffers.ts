import { Address, beginCell, Dictionary, OpenedContract, toNano } from '@ton/core';

import { NetworkProvider } from '@ton/blueprint';
import { InitMultiSwap, MultiSwapRouter, SwapItem } from '../wrappers/MultiSwapRouter';
import { Executor } from '@ton/sandbox';
import { MultiSwap } from '../wrappers/MultiSwap';
import { TestJetton, TokenTransfer } from '../wrappers/Jetton';
import { NftItem, Transfer } from '../wrappers/Nft';
import { JettonWallet } from '@ton/ton';
import { JettonDefaultWallet } from '../build/Jetton/tact_JettonDefaultWallet';
import { TimeframeDiscovery } from '../wrappers/TimeframeDiscovery';

const statemap = Object.freeze({
    StateDeployment: 0,
    StateAwaitingFunds: 1,
    StateReadyToSwap: 2,
    StateSwapLock: 3,
    StateSwapped: 4,
    StateFailed: -1
});

const stateKeys = Object.keys(statemap);
const stateValues = Object.values(statemap);

function getStateString(state: number) {
    const index = stateValues.indexOf(state as any);
    return index === -1 ? 'Unknown' : stateKeys[index];
}

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const router = provider.open(await MultiSwapRouter.fromInit());
    
    if (!await provider.isContractDeployed(router.address)){
        throw "Router not deployed"
    }

    const numberOfLastOffersToParse = BigInt(await ui.input("Enter number of last offers to parse: "));

    let timeframeDiscovery = provider.open(await TimeframeDiscovery.fromInit(
                    router.address,
                    await router.getCurrentTimeframe()
                ));
    
    let timeFramePeriod = await router.getTimeFramePeriod();
    //    // validate contract deployed
    if (!await provider.isContractDeployed(timeframeDiscovery.address)){
        throw "TimeframeDiscovery not deployed"
    }

    let numOfOffers = await timeframeDiscovery.getNumberOfOffers();

    let offers = await timeframeDiscovery.getRecentOffers(numOfOffers - 1n, numberOfLastOffersToParse); // last id and limit

    
    for (let i = numOfOffers-1n; i >= numOfOffers - numberOfLastOffersToParse; i--) {
        if(i<0){
            break;
        }
         let offerAddress = offers.get(Number(i))!;
         console.log("=================\n\nItem id: ", i);

         console.log("Offer address: ", offerAddress.toString());

         let offer = provider.open(await MultiSwap.fromAddress(offerAddress));

         if (!await provider.isContractDeployed(offer.address)){
            throw "Offer not deployed"
         }

         let data = await offer.getData();

         console.log("Is initiator: ", data.is_initiator);

         console.log("State: ", getStateString(Number(data.state)));

         // expiration_time_seconds
         console.log("Expiration time: ", data.expiration_time_seconds);

         // is expired
         console.log("Is expired: ", data.is_expired);

         // go for each item in offered
         function logItems(items_map: Dictionary<number, SwapItem>) {
            for (let j = 0; j < items_map.size; j++) {
                let item = items_map.get(j);
                console.log("Item address: ", item?.address);
                console.log("Item type: ", item?.type==0n ? "NFT" : "Jetton");
                console.log("Item amount: ", item?.amount);
                console.log("\n");
            }
         }
         console.log("Items offered:")
         logItems(data.offered_items);

         console.log("Items requested:")
         logItems(data.requested_items);

         console.log("\n\n=================");

         // sleep 2 seconds not to trigger rate limit
         await new Promise(resolve => setTimeout(resolve, 2000));

    }

}
