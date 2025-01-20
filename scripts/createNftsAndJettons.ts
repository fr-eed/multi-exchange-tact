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

    if (!await provider.isContractDeployed(router.address)) {

        throw "Router not deployed"
    }
    let deployer = provider.sender();
    let offeredItems: Dictionary<number, SwapItem> = Dictionary.empty();
    let requestedItems: Dictionary<number, SwapItem> = Dictionary.empty();


    async function createNftItem(receiver_address: Address, nft_id: number): Promise<OpenedContract<NftItem>> {
        const nftItem = provider.open(await NftItem.fromInit(
            deployer.address!,
            BigInt(nft_id)
        ));

        if (await provider.isContractDeployed(nftItem.address)) {
            return nftItem;
        }

        // deploy
        const deployResult = await nftItem.send(
            deployer,
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Transfer',
                query_id: 1n,
                new_owner: receiver_address,
                response_destination: deployer.address,
                custom_payload: beginCell().storeStringTail("test").endCell(),
                forward_amount: 0n,
                forward_payload: beginCell().endCell().asSlice(),
            } as Transfer
        );

        // wait until deployed
        await provider.waitForDeploy(nftItem.address, 50);


        return nftItem;
    }

    async function createJettonAndMint(receiver_address: Address, id: number, amount: bigint): Promise<OpenedContract<TestJetton>> {
        const jettonItem = provider.open(await TestJetton.fromInit(
            deployer.address!,
            beginCell().storeInt(BigInt(id), 32).endCell(),
            100000n+BigInt(id) // 100k 
        ));


        // deploy
        const deployResult = await jettonItem.send(
            deployer,
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );

        await provider.waitForDeploy(jettonItem.address, 50);


        // mint jetton to receiver

        const mintResult = await jettonItem.send(
            deployer,
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Mint',
                receiver: receiver_address,
                amount: amount
            }
        )


 

        const jettonWalletAddress = await jettonItem.getGetWalletAddress(
            receiver_address
        );

        const jettonWallet = provider.open(await JettonDefaultWallet.fromAddress(
            jettonWalletAddress
        ));

        await provider.waitForDeploy(jettonWallet.address, 50);



        return jettonItem;
    }

    const jetton0Amount = 10000n;

    const rid = Math.floor(Math.random() * 1000)

    const jetton0 = await createJettonAndMint(deployer.address!, rid+0, jetton0Amount)

    const jetton = provider.open(await TestJetton.fromAddress(jetton0.address));

    const jettonWalletAddress = await jetton.getGetWalletAddress(
        provider.sender().address!
    )

    const nft0 = await createNftItem(deployer.address!, rid+0);
    const nft1 = await createNftItem((await ui.inputAddress("second wallet address to claim nft: ")), rid+1);

    // log nft0(owned by who)
    console.log("owner owns:");
    console.log("nft0")
    console.log(nft0.address.toString());

    console.log("jetton0")
    console.log(jetton0.address.toString());

    console.log("other party owns");
    console.log("nft1")
    console.log(nft1.toString());


    offeredItems.set(0, {
        $$type: 'SwapItem',
        amount: 1n, // nft amount always 1
        type: 0n, // nft
        address: nft0.address,
    }
    );

    offeredItems.set(1, {
        $$type: 'SwapItem',
        amount: jetton0Amount, //
        type: 1n, // jetton
        address: jetton0.address,
    }
    );

    requestedItems.set(0, {
        $$type: 'SwapItem',
        amount: 1n, // nft amount always 1
        type: 0n, // nft
        address: nft1.address,
    },
    );

    function logItems(items_map : Dictionary<number, SwapItem>) {
        for (let j = 0; j < items_map.size; j++) {
            let item = items_map.get(j);
            console.log("Item address: ", item?.address);
            console.log("Item type: ", item?.type == 0n ? "NFT" : "Jetton");
            console.log("Item amount: ", item?.amount);
            console.log("\n");
        }
    }

    console.log("offeredItems")
    logItems(offeredItems);

    console.log("requestedItems")
    logItems(requestedItems);
    return;
}