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

    console.log("jetton wallet", jettonWalletAddress);

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


    const minValue = await router.getCalculateMinValue(
        offeredItems
    );

    let queryId = 0n;
    let sellerSwap: OpenedContract<MultiSwap>;



    sellerSwap = provider.open(await MultiSwap.fromInit(
        router.address,
        provider.sender().address!,
        queryId,
        true, // initiator
        offeredItems,
        requestedItems
    ));

    // if not deployed
    if (!await provider.isContractDeployed(sellerSwap.address)) {
        const deployResult = await router.send(
            provider.sender(),
            { value: minValue },
            {
                $$type: 'InitMultiSwap',
                offered_items: offeredItems,
                requested_items: requestedItems,
                query_id: queryId // check befor edeploy if exists
            } as InitMultiSwap
        );
    }


    await provider.waitForDeploy(sellerSwap.address, 50)

    console.log("Offer Deployed:")
    console.log(sellerSwap.address.toString())


    console.log("sending NFTs and Jettons")

    // this messages can be send in one transaction via Ton Connect
    for (const [key, value] of offeredItems) {
        console.log(`Sending NO.${key}: ${value.amount} ${value.type == 0n ? "nft" : "jetton" } to ${sellerSwap.address.toString()}`)

        if (value.type == 0n) {

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


            while(true){
                
                if((await nftItem.getGetNftData()).owner_address.toString()==sellerSwap.address.toString()){
                    break;
                }

                await new Promise(r => setTimeout(r, 3000));
            }



        } else {
            const jetton = provider.open(await TestJetton.fromAddress(value.address));

            const jettonWalletAddress = await jetton.getGetWalletAddress(
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
                    sender: sellerSwap.address,
                    response_destination: provider.sender().address,
                    custom_payload: null,
                    forward_ton_amount: toNano('0.02'),
                    forward_payload: beginCell().endCell().asSlice(),
                } as TokenTransfer
            );
        }

    }


    console.log("sent NFTs and Jettons")
}
