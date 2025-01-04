import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { beginCell, Cell, Dictionary, fromNano, Slice, toNano } from '@ton/core';

import '@ton/test-utils';
import { randomBytes } from 'crypto';
import { InitMultiSwap, MultiSwapRouter, SwapItem } from '../wrappers/MultiSwapRouter';
import { MultiSwap } from '../wrappers/MultiSwap';
import { NftItem, Transfer } from '../wrappers/Nft';
import { TestJetton, TokenTransfer as TokenTransferJetton, Mint as MintJetton, TokenTransfer } from '../wrappers/Jetton';
import { JettonDefaultWallet } from '../build/Jetton/tact_JettonDefaultWallet';


describe('MiniPay Contract', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;

    beforeAll(async () => {
        // deploy router
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        const router = await getRouterContract();
        const deployResult = await router.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            {
                $$type: 'Deploy',
                queryId: 0n,
            }
        );
        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: router.address,
            deploy: true,
            success: true,
        });

    });

    async function getRouterContract() {
        return blockchain.openContract(await MultiSwapRouter.fromInit());
    }

    beforeEach(async () => {

    });




    it('should deploy router contract', async () => {

    });

    describe("Nft exchange", () => {
        let offeredItems: Dictionary<number, SwapItem> = Dictionary.empty();
        let requestedItems: Dictionary<number, SwapItem> = Dictionary.empty();

        let seller: SandboxContract<TreasuryContract>;
        let buyer: SandboxContract<TreasuryContract>;

        let router: SandboxContract<MultiSwapRouter>;

        const queryId = BigInt(0);

        let nftItem0: SandboxContract<NftItem>;
        let nftItem1: SandboxContract<NftItem>;
        let nftItem2: SandboxContract<NftItem>;

        it('should prepare wallets', async () => {
            router = await getRouterContract();
            seller = await blockchain.treasury('seller-nft', { balance: toNano('3') });
            buyer = await blockchain.treasury('buyer-nft', { balance: toNano('3') });

        });

        it('should deploy nfts and assign them to wallets', async () => {

            async function createNftItem(receiver: SandboxContract<TreasuryContract>, nft_id: number): Promise<SandboxContract<NftItem>> {
                const nftItem = blockchain.openContract(await NftItem.fromInit(
                    deployer.address,
                    BigInt(nft_id)
                ));

                // deploy
                const deployResult = await nftItem.send(
                    deployer.getSender(),
                    {
                        value: toNano('0.05'),
                    },
                    {
                        $$type: 'Transfer',
                        query_id: 1n,
                        new_owner: receiver.address,
                        response_destination: deployer.address,
                        custom_payload: beginCell().storeStringTail("test").endCell(),
                        forward_amount: 0n,
                        forward_payload: beginCell().endCell().asSlice(),
                    } as Transfer

                );
                expect(deployResult.transactions).not.toHaveTransaction({
                    success: false,

                });
                // verify nftItem is assigned to buyer

                let data = await nftItem.getGetNftData();

                expect(data.owner_address.toString()).toBe(receiver.address.toString());

                return nftItem;
            }

            nftItem0 = await createNftItem(buyer, 0);
            nftItem1 = await createNftItem(buyer, 1);
            nftItem2 = await createNftItem(seller, 2);
        });

        // create swap
        it('setup swap setup', async () => {
            requestedItems.set(0, {
                $$type: 'SwapItem',
                amount: 1n,
                type: BigInt(0), // nft
                address: nftItem0.address,
            },
            );

            requestedItems.set(1, {
                $$type: 'SwapItem',
                amount: 1n,
                type: BigInt(0), // nft
                address: nftItem1.address,
            });

            offeredItems.set(0,
                {
                    $$type: 'SwapItem',
                    amount: 1n,
                    type: BigInt(0), // nft
                    address: nftItem2.address,
                }
            );
        });


        it('should create swap', async () => {


            const minValue = await router.getCalculateMinValue(
                offeredItems
            );
            console.log(fromNano(minValue));

            const deployResult = await router.send(
                seller.getSender(),
                { value: minValue },
                {
                    $$type: 'InitMultiSwap',
                    offered_items: offeredItems,
                    requested_items: requestedItems,
                    query_id: queryId
                } as InitMultiSwap

            );

            expect(deployResult.transactions).not.toHaveTransaction({
                success: false,
            })


        });

        it("should send nfts to swap contract", async () => {
            const sellerSwap = blockchain.openContract(await MultiSwap.fromInit(
                router.address,
                seller.address,
                queryId,
                true, // initiator
                offeredItems,
                requestedItems
            ));
            // send nfts to that address


            const deployResult = await nftItem2.send(
                seller.getSender(),
                {
                    value: toNano('0.07'),
                },
                {
                    $$type: 'Transfer',
                    query_id: 1n,
                    new_owner: sellerSwap.address,
                    response_destination: deployer.address,
                    custom_payload: null,
                    forward_amount: toNano('0.02'),
                    forward_payload: beginCell().endCell().asSlice(),
                } as Transfer

            );

            expect(deployResult.transactions).not.toHaveTransaction({
                success: false,
            })

            // seller swap should have received nfts

            let data = await sellerSwap.getAllItemsReceived();

            expect(data).toBe(true);


        });


        // respond
        it('should create response swap', async () => {
            const sellerSwap = blockchain.openContract(await MultiSwap.fromInit(
                router.address,
                seller.address,
                queryId,
                true, // initiator
                offeredItems,
                requestedItems
            ));

            const minValue = await router.getCalculateMinValue(
                requestedItems
            );


            const deployResult = await router.send(
                buyer.getSender(),
                { value: minValue },
                {
                    $$type: 'InitMultiSwap',
                    offered_items: requestedItems, // seller request -> our offer
                    requested_items: offeredItems,
                    query_id: queryId,
                    mirror_swap_address: sellerSwap.address
                } as InitMultiSwap

            );

            expect(deployResult.transactions).not.toHaveTransaction({
                success: false,
            })
        });

        // now send 2 nfts to swap
        it('should send nfts to swap contract', async () => {
            const buyerSwap = blockchain.openContract(await MultiSwap.fromInit(
                router.address,
                buyer.address,
                queryId,
                false, // initiator
                requestedItems,
                offeredItems
            ));
            // send nfts to that address

            let data = await buyerSwap.getAllItemsReceived()
            expect(data).toBe(false);

            const transferResult = await nftItem0.send(
                buyer.getSender(),
                {
                    value: toNano('0.07'),
                },
                {
                    $$type: 'Transfer',
                    query_id: 1n,
                    new_owner: buyerSwap.address,
                    response_destination: deployer.address,
                    custom_payload: null,
                    forward_amount: toNano('0.02'),
                    forward_payload: beginCell().endCell().asSlice(),
                } as Transfer

            );

            expect(transferResult.transactions).not.toHaveTransaction({
                success: false,
            })

            data = await buyerSwap.getAllItemsReceived()
            expect(data).toBe(false);

            // send second nft
            const transferResult2 = await nftItem1.send(
                buyer.getSender(),
                {
                    value: toNano('0.07'),
                },
                {
                    $$type: 'Transfer',
                    query_id: 1n,
                    new_owner: buyerSwap.address,
                    response_destination: deployer.address,
                    custom_payload: null,
                    forward_amount: toNano('0.03'),
                    forward_payload: beginCell().endCell().asSlice(),
                } as Transfer

            );

            expect(transferResult2.transactions).not.toHaveTransaction({
                success: false,
            })

            // buyer swap should have received nfts

            data = await buyerSwap.getAllItemsReceived();
            expect(data).toBe(true);
        });
        
        it('should unlock funds', async () => {
            const buyerSwap = blockchain.openContract(await MultiSwap.fromInit(
                router.address,
                buyer.address,
                queryId,
                false, // initiator
                requestedItems,
                offeredItems
            ));

            const sellerSwap = blockchain.openContract(await MultiSwap.fromInit(
                router.address,
                seller.address,
                queryId,
                true, // initiator
                offeredItems,
                requestedItems
            ));

            //automatically
            const dataBuyer = await buyerSwap.getIsFundsUnlocked();
            const dataSeller = await sellerSwap.getIsFundsUnlocked();


            expect(dataSeller).toBe(true);
            expect(dataBuyer).toBe(true);
        })
    });


    describe("Jetton-NFT swap", () => {
        let offeredItems: Dictionary<number, SwapItem> = Dictionary.empty();
        let requestedItems: Dictionary<number, SwapItem> = Dictionary.empty();

        let seller: SandboxContract<TreasuryContract>;
        let buyer: SandboxContract<TreasuryContract>;

        let router: SandboxContract<MultiSwapRouter>;

        const queryId = BigInt(0);

        let nftItem0: SandboxContract<NftItem>;
        let nftItem1: SandboxContract<NftItem>;
        let nftItem2: SandboxContract<NftItem>;

        let jetton0: SandboxContract<TestJetton>;
        let jetton1: SandboxContract<TestJetton>;

        let jetton0Amount = 15000n;
        let jetton1Amount = 10000n;

        it('should prepare wallets', async () => {
            router = await getRouterContract();
            seller = await blockchain.treasury('seller-nft-jetton', { balance: toNano('3') });
            buyer = await blockchain.treasury('buyer-nft-jetton', { balance: toNano('3') });

        });

        it('should deploy nfts and assign them to wallets', async () => {

            async function createNftItem(receiver: SandboxContract<TreasuryContract>, nft_id: number): Promise<SandboxContract<NftItem>> {
                const nftItem = blockchain.openContract(await NftItem.fromInit(
                    deployer.address,
                    BigInt(nft_id)
                ));

                // deploy
                const deployResult = await nftItem.send(
                    deployer.getSender(),
                    {
                        value: toNano('0.05'),
                    },
                    {
                        $$type: 'Transfer',
                        query_id: 1n,
                        new_owner: receiver.address,
                        response_destination: deployer.address,
                        custom_payload: beginCell().storeStringTail("test").endCell(),
                        forward_amount: 0n,
                        forward_payload: beginCell().endCell().asSlice(),
                    } as Transfer

                );
                expect(deployResult.transactions).not.toHaveTransaction({
                    success: false,

                });
                // verify nftItem is assigned to buyer

                let data = await nftItem.getGetNftData();

                expect(data.owner_address.toString()).toBe(receiver.address.toString());

                return nftItem;
            }

            nftItem0 = await createNftItem(buyer, 3);
            nftItem1 = await createNftItem(buyer, 4);
            nftItem2 = await createNftItem(seller, 5);
        });

        it("should deploy jettons and mint them", async () => {

            async function createJettonAndMint(receiver: SandboxContract<TreasuryContract>, id: number, amount: bigint): Promise<SandboxContract<TestJetton>> {
                const jettonItem = blockchain.openContract(await TestJetton.fromInit(
                    deployer.address,
                    beginCell().storeInt(id, 32).endCell(),
                    100000n // 100k 
                ));

                // deploy
                const deployResult = await jettonItem.send(
                    deployer.getSender(),
                    {
                        value: toNano('0.05'),
                    },
                    {
                        $$type: 'Deploy',
                        queryId: 0n,
                    }
                );
                expect(deployResult.transactions).not.toHaveTransaction({
                    success: false,

                });

                // mint jetton to receiver

                const mintResult = await jettonItem.send(
                    deployer.getSender(),
                    {
                        value: toNano('0.05'),
                    },
                    {
                        $$type: 'Mint',
                        receiver: receiver.address,
                        amount: amount
                    }
                )
                expect(mintResult.transactions).not.toHaveTransaction({
                    success: false,
                });

                // check if receiver has the balance

                const jettonWalletAddress = await jettonItem.getGetWalletAddress(
                    receiver.address
                );

                const jettonWallet = blockchain.openContract(await JettonDefaultWallet.fromAddress(
                    jettonWalletAddress
                ));

                const data = await jettonWallet.getGetWalletData()


                expect(data.balance).toBe(amount);

                return jettonItem;
            }

            jetton0 = await createJettonAndMint(seller, 0, jetton0Amount);
            jetton1 = await createJettonAndMint(buyer, 1, jetton1Amount);

            console.log(jetton0.address);
        });

        // create swap
        it('setup swap setup', async () => {


            offeredItems.set(0,
                {
                    $$type: 'SwapItem',
                    amount: 1n,
                    type: BigInt(0), // nft
                    address: nftItem2.address,
                }
            );

            offeredItems.set(1,
                {
                    $$type: 'SwapItem',
                    amount: jetton0Amount,
                    type: BigInt(1), // jetton
                    address: jetton0.address,
                }
            );

            requestedItems.set(0, {
                $$type: 'SwapItem',
                amount: 1n,
                type: BigInt(0), // nft
                address: nftItem0.address,
            },
            );

            requestedItems.set(1, {
                $$type: 'SwapItem',
                amount: 1n,
                type: BigInt(0), // nft
                address: nftItem1.address,
            });

            requestedItems.set(2, {
                $$type: 'SwapItem',
                amount: jetton1Amount,
                type: BigInt(1), // jetton
                address: jetton1.address,
            });
        });


        it('should create swap', async () => {

            const minValue = await router.getCalculateMinValue(
                offeredItems
            );

            const deployResult = await router.send(
                seller.getSender(),
                { value: minValue },
                {
                    $$type: 'InitMultiSwap',
                    offered_items: offeredItems,
                    requested_items: requestedItems,
                    query_id: queryId
                } as InitMultiSwap
            );


            expect(deployResult.transactions).not.toHaveTransaction({
                success: false,
            })


        });
   
        

        it("should send nfts to swap contract", async () => {
            const sellerSwap = blockchain.openContract(await MultiSwap.fromInit(
                router.address,
                seller.address,
                queryId,
                true, // initiator
                offeredItems,
                requestedItems
            ));
            // send nfts to that address

            const deployResult = await nftItem2.send(
                seller.getSender(),
                {
                    value: toNano('0.07'),
                },
                {
                    $$type: 'Transfer',
                    query_id: 1n,
                    new_owner: sellerSwap.address,
                    response_destination: deployer.address,
                    custom_payload: null,
                    forward_amount: toNano('0.02'),
                    forward_payload: beginCell().endCell().asSlice(),
                } as Transfer

            );

            expect(deployResult.transactions).not.toHaveTransaction({
                success: false,
            })

            // seller swap should have received nfts

            let data = await sellerSwap.getAllItemsReceived();

            // we still need to wait for jetton transfer
            expect(data).toBe(false);

        });

     

        it("should send jetton to swap contract (seller)", async () => {
            const sellerSwap = blockchain.openContract(await MultiSwap.fromInit(
                router.address,
                seller.address,
                queryId,
                true, // initiator
                offeredItems,
                requestedItems
            ));

            const jettonWalletAddress = await jetton0.getGetWalletAddress(
                seller.address
            );

            const jettonWallet = blockchain.openContract(await JettonDefaultWallet.fromAddress(
                jettonWalletAddress
            ));

            const transferResult = await jettonWallet.send(
                seller.getSender(),
                {
                    value: toNano('0.07'),
                },
                {
                    $$type: 'TokenTransfer',
                    query_id: 1n,
                    amount: jetton0Amount,
                    sender: sellerSwap.address,
                    
                    response_destination: deployer.address,
                    custom_payload: null,
                    forward_ton_amount: toNano('0.02'),
                    forward_payload: beginCell().endCell().asSlice(),
                } as TokenTransfer

            );

            expect(transferResult.transactions).not.toHaveTransaction({
                success: false,
            })

            let data = await sellerSwap.getAllItemsReceived();

            // now everything is sent
            expect(data).toBe(true);
            
        });


        // respond
        it('should create response swap', async () => {
            const sellerSwap = blockchain.openContract(await MultiSwap.fromInit(
                router.address,
                seller.address,
                queryId,
                true, // initiator
                offeredItems,
                requestedItems
            ));

            const minValue = await router.getCalculateMinValue(
                requestedItems
            );

            console.log(requestedItems.keys().length," items cost:", fromNano(minValue));


            const deployResult = await router.send(
                buyer.getSender(),
                { value: minValue },
                {
                    $$type: 'InitMultiSwap',
                    offered_items: requestedItems, // seller request -> our offer
                    requested_items: offeredItems,
                    query_id: queryId,
                    mirror_swap_address: sellerSwap.address
                } as InitMultiSwap

            );

            expect(deployResult.transactions).not.toHaveTransaction({
                success: false,
            })
        });
    
        // now send 2 nfts to swap
        it('should send nfts to swap contract', async () => {
            const buyerSwap = blockchain.openContract(await MultiSwap.fromInit(
                router.address,
                buyer.address,
                queryId,
                false, // initiator
                requestedItems,
                offeredItems
            ));
            // send nfts to that address

            let data = await buyerSwap.getAllItemsReceived()
            expect(data).toBe(false);

            const transferResult = await nftItem0.send(
                buyer.getSender(),
                {
                    value: toNano('0.07'),
                },
                {
                    $$type: 'Transfer',
                    query_id: 1n,
                    new_owner: buyerSwap.address,
                    response_destination: deployer.address,
                    custom_payload: null,
                    forward_amount: toNano('0.02'),
                    forward_payload: beginCell().endCell().asSlice(),
                } as Transfer

            );

            expect(transferResult.transactions).not.toHaveTransaction({
                success: false,
            })

            data = await buyerSwap.getAllItemsReceived()
            expect(data).toBe(false);

            // send second nft
            const transferResult2 = await nftItem1.send(
                buyer.getSender(),
                {
                    value: toNano('0.07'),
                },
                {
                    $$type: 'Transfer',
                    query_id: 1n,
                    new_owner: buyerSwap.address,
                    response_destination: buyer.address,
                    custom_payload: null,
                    forward_amount: toNano('0.03'),
                    forward_payload: beginCell().endCell().asSlice(),
                } as Transfer

            );

            expect(transferResult2.transactions).not.toHaveTransaction({
                success: false,
            })

            // buyer swap should have received nfts

            data = await buyerSwap.getAllItemsReceived();
            expect(data).toBe(false);
        });


        it("should send jetton to swap contract (buyer)", async () => {
            const buyerSwap = blockchain.openContract(await MultiSwap.fromInit(
                router.address,
                buyer.address,
                queryId,
                false, // initiator
                requestedItems,
                offeredItems
            ));

            const jettonWalletAddress = await jetton1.getGetWalletAddress(
                buyer.address
            );

            const jettonWallet = blockchain.openContract(await JettonDefaultWallet.fromAddress(
                jettonWalletAddress
            ));

            const transferResult = await jettonWallet.send(
                buyer.getSender(),
                {
                    value: toNano('0.07'),
                },
                {
                    $$type: 'TokenTransfer',
                    query_id: 2n,
                    amount: jetton1Amount,
                    sender: buyerSwap.address,
                    
                    response_destination: buyer.address,
                    custom_payload: null,
                    forward_ton_amount: toNano('0.02'),
                    forward_payload: beginCell().endCell().asSlice(),
                } as TokenTransfer

            );

            expect(transferResult.transactions).not.toHaveTransaction({
                success: false,
            })

            let data = await buyerSwap.getAllItemsReceived();

            // now everything is sent
            expect(data).toBe(true);
            
        });


        
        it('should unlock funds', async () => {
            const buyerSwap = blockchain.openContract(await MultiSwap.fromInit(
                router.address,
                buyer.address,
                queryId,
                false, // initiator
                requestedItems,
                offeredItems
            ));

            const sellerSwap = blockchain.openContract(await MultiSwap.fromInit(
                router.address,
                seller.address,
                queryId,
                true, // initiator
                offeredItems,
                requestedItems
            ));

            //automatically
            const dataBuyer = await buyerSwap.getIsFundsUnlocked();
            const dataSeller = await sellerSwap.getIsFundsUnlocked();


            expect(dataSeller).toBe(true);
            expect(dataBuyer).toBe(true);
        })
    });

});