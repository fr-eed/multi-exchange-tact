import "./message.tact";
import "./fees.tact";


@name(muldiv)
native mulDiv(a: Int, b: Int, c: Int): Int;



contract MultiSwap {

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

    state: Int;


    mirror_swap_address: Address?;  // Mirror contract address to exchange items with. Initiator will get it from mirror
    buyer_address: Address?; // Mirror contract will notify this address

    // init params that define hash of the contract
    is_initiator: Bool; // Only initiator can get offers
    router_address: Address;
    seller_address: Address;
    offered_items: map<Int as uint8, SwapItem>;
    requested_items: map<Int as uint8, SwapItem>;
    query_id: Int as uint32;
    // init params

    
    //current_items_balances: map<Int as uint8, Int as coins>;

    unverified_item_balances: map<Address, Int as coins>;

    jetton_wallets: map<Address, Address>; // key: jetton, value: jetton wallet of current contract
    
    validated_items: map<Int as uint8, Bool>;


    // Expired contract can't get any new offers.
    expiration_time_seconds: Int as uint32=0;
    swap_fee_basis_points: Int as uint16=0; // for example 100 = 1%


    // Initialization function
    init(router_address: Address, 
        seller_address: Address,
        query_id: Int,
        is_initiator: Bool,
        offered_items: map<Int as uint8, SwapItem>,
        requested_items: map<Int as uint8, SwapItem>
        ) {
        require(sender() == router_address, "not from router");
        self.router_address = router_address;

        self.seller_address = seller_address;

        self.query_id = query_id;
        self.is_initiator = is_initiator;
        self.requested_items = requested_items;
        self.offered_items = offered_items;

        self.state=self.StateDeployment;
    }

    get fun isFundsUnlocked(): Bool {
        return self.state == self.StateSwapped;
    }

    get fun isExpired(): Bool {
        return self.expiration_time_seconds != 0 && now() > self.expiration_time_seconds;
    }


    // deploys
    receive(msg: MultiSwapDeployment){
        require(self.state == self.StateDeployment, "Wrong state");
        
        self.expiration_time_seconds = msg.expiration_time_seconds;
        self.swap_fee_basis_points = msg.swap_fee_basis_points;

        // non-initiator always responds to someone else
        if(!self.is_initiator){
            self.mirror_swap_address = msg.mirror_swap_address;
        }

        self.state = self.StateAwaitingFunds;

        self.parseJettonWallets();

    }

    fun parseJettonWallets(){
        // send ProvideWalletAddressJetton to each jetton
        foreach (key, value in self.offered_items){
            if(value.type == SWAP_ITEM_TYPE_JETTON){
                send(SendParameters{
                    to: value.address,
                    value: JETTON_WALLET_LOOKUP_FEE,
                    bounce:false,
                    mode: 0,
                    body: ProvideWalletAddressJetton{
                        query_id: 1,
                        owner_address: myAddress(),
                        include_address: true
                    }.toCell()
                });
            }
        }
    }

    receive(msg: TakeWalletAddressJetton){
        let ctx = context();
        // validate that we do have such wallet
        foreach (key, value in self.offered_items){
            if(value.address == ctx.sender){
                self.jetton_wallets.set(value.address, msg.wallet_address);
                return;
            }
        }

    }



    get fun allItemsReceived (): Bool{
        // go for each offered item and check if their amount was received
        foreach (key, value in self.offered_items){

            let wallet_address: Address? = null;

            if(value.type == SWAP_ITEM_TYPE_JETTON){
                // either null or address. If null means we're still waiting for message
                wallet_address = self.jetton_wallets.get(value.address);
                
            }else if(value.type==SWAP_ITEM_TYPE_NFT){
                wallet_address = value.address;// NFT wallet is the NFT address
            }


            if(wallet_address == null){
                return false;
            }

            let balance = self.unverified_item_balances.get(wallet_address!!);

            // still waiting for any message
            if (balance == null){
                return false
            }

            // balance is not enough yet
            if (balance!!<value.amount){
                return false
            }
        }

        return true;
    }

    fun afterReceiveItem(){
        
        // only in await funds state items can be exchanged
        if(self.state != self.StateAwaitingFunds){
            return;
        }

        if(!self.allItemsReceived()){
            return;
        }

        
        // all items received -> ready to swap
        self.state = self.StateReadyToSwap;

        if(!self.is_initiator){
            self.state=self.StateSwapLock;
            // then send request to mirror
            // This request confirms that we are ready to swap
            send(SendParameters{
                to: self.mirror_swap_address!!,
                value: ton("0.03"),
                bounce: true,
                mode: 0,
                body: MirrorOfferRequest{
                    seller_address: self.seller_address,
                    query_id: self.query_id
                }.toCell()
            });
        }
    }
    
    // receives funds 
    // NFT 
    receive(msg: OwnershipAssignedNFT){
        // too soon or too late
        let ctx = context();

        // Nft can only be assigned once
        self.unverified_item_balances.set(ctx.sender, 1);
        
        self.afterReceiveItem();
    }


    receive(msg: TokenNotificationJetton){
        let ctx = context();
        // We don't know if this is legit yet and to which jetton it's connected
        let unverified_wallet_address = ctx.sender;
        
        let current_balance = self.unverified_item_balances.get(unverified_wallet_address);
        let updated_balance = (current_balance !=   null) ? current_balance!! : 0;
        // Update the balance
        self.unverified_item_balances.set(unverified_wallet_address, updated_balance + msg.amount);

        self.afterReceiveItem();
    }

    

    bounced(msg: bounced<MirrorOfferRequest>){
        // buyer declined.
        self.state = self.StateFailed;

        
        send(SendParameters{
            to: myAddress(),
            value: ton("0.02"),
            bounce: false,
            mode: 0,
            body: WithdrawSeller{
                query_id: self.query_id
            }.toCell()
        })
    }

    receive(msg: MirrorOfferRequest){
        
        require(self.state == self.StateReadyToSwap, "Not ready to swap");
        
        require(!self.isExpired(), "Offer expired");
        // only initiator can get offers
        require(self.is_initiator, "Only initiator can get offers");

   
        let ctx = context();
        // verify contract is our sibling
        let realMirrorAddress = self.multiSwapAddress(
            msg.seller_address, 
            msg.query_id, 
            false, // mirror should not be initiator
            self.requested_items, // our requested items -> their offered
            self.offered_items // our offered items -> their requested
        );

        require(ctx.sender == realMirrorAddress, "Not from real mirror contract");


        self.state = self.StateSwapped;
        self.buyer_address = msg.seller_address; // mirror seller -> our buyer
        self.mirror_swap_address = realMirrorAddress;   

        // send offer to mirror

        send(SendParameters{
            to: self.mirror_swap_address!!,
            value: ton("0.03"),
            bounce: false,
            mode: 0,
            body: MirrorOfferResponse{
                seller_address: self.seller_address
            }.toCell()
        });

        // release assets
        send(SendParameters{
            to: myAddress(),
            value: ton("0.02"),
            bounce: false,
            mode: 0,
            body: WithdrawBuyer{
                query_id: self.query_id
            }.toCell()
        })

    }


    receive(msg: MirrorOfferResponse){
        // security check
        require(self.is_initiator==false, "Only non-initiator can confirm offer");
        require(self.mirror_swap_address == context().sender, "Not from mirror contract");

        // 
        require(self.state == self.StateSwapLock, "Wrong state");

        self.buyer_address = msg.seller_address; // mirror seller -> our buyer

        self.state = self.StateSwapped;

        send(SendParameters{
            to: myAddress(),
            value: ton("0.03"),
            bounce: false,
            mode: 0,
            body: WithdrawBuyer{
                query_id: self.query_id
            }.toCell()
        })
    }

    receive(msg: WithdrawBuyer) {
        require(self.state == self.StateSwapped, "Wrong state");
        self.sendAllItemsTo(self.buyer_address!!, self.swap_fee_basis_points);

        send(SendParameters{
            to: myAddress(),
            value: ton("0.01"),
            bounce: true,
            mode: SendIgnoreErrors,
            body: SendExcessInternal{
                query_id: msg.query_id
            }.toCell()
        });
    }
    


    fun sendAllItemsTo(address: Address, fee_basis_points: Int){

        // go for each item in offered
       
        foreach (key, value in self.offered_items){
            if(value.type == SWAP_ITEM_TYPE_NFT){
                let raw_balance = self.unverified_item_balances.get(value.address);
                let current_balance= raw_balance!=null ? raw_balance!! : 0;

                if(current_balance > 0){
                    send(SendParameters{
                        to: value.address,
                        value: NFT_TRANSFER_FEE,
                        bounce: false,
                        mode: 0,
                        body: TransferNFT{
                            query_id: 0,
                            new_owner: address,
                            response_destination: self.seller_address, //cashback
                            custom_payload: null,
                            forward_amount: 0,
                            forward_payload: emptySlice()
                        }.toCell()
                    });
                }

                //self.unverified_item_balances.set(value.address, 0);
            }
            else if(value.type == SWAP_ITEM_TYPE_JETTON){

                let wallet_address = self.jetton_wallets.get(value.address)!!;

                let raw_balance = self.unverified_item_balances.get(wallet_address);
                let current_balance= raw_balance!=null ? raw_balance!! : 0;
                
                // take fee
                let fee = mulDiv(current_balance, fee_basis_points, 100*100);
                let balance_left = current_balance-fee;
                
                if(fee>0){
                    send(SendParameters{
                        to: wallet_address,
                        value: JETTON_TRANSFER_FEE,
                        bounce: false,
                        mode: 0,
                        body: TokenTransferJetton{
                            query_id: 0,
                            amount: fee,
                            sender: self.router_address,
                            response_destination: self.seller_address,
                            custom_payload: null,
                            forward_ton_amount: 0,
                            forward_payload: emptySlice()
                        }.toCell()
                    });
                    
                }

                
                if(balance_left>0){
                    send(SendParameters{
                        to: wallet_address,
                        value: JETTON_TRANSFER_FEE,
                        bounce: false,
                        mode: 0,
                        body: TokenTransferJetton{
                            query_id: 0,
                            amount: balance_left,
                            sender: address,
                            response_destination: self.seller_address,
                            custom_payload: null,
                            forward_ton_amount: 0,
                            forward_payload: emptySlice()
                        }.toCell()
                    });
                }

                //self.unverified_item_balances.set(wallet_address, 0);
            }   
        }
        
    }



    receive(msg: WithdrawSeller){ 
        let ctx: Context = context();
        require(ctx.sender == self.seller_address||
            ctx.sender == myAddress()
        , "Unauthorized withdraw attempt");
        // Only possible if isExpired 
        // and state is either StateAwaitingFunds, StateReadyToSwap
        // or just StateFailed

        require(
            (self.state == self.StateFailed) ||
            (
                (self.state != self.StateSwapped) &&
                self.isExpired()
            )
        , "Withdraw not allowed");
        
  
        self.state = self.StateFailed;

        self.sendAllItemsTo(self.seller_address, 0);

        send(SendParameters{
            to: myAddress(),
            value: ton("0.01"),
            bounce: true,
            mode: SendIgnoreErrors,
            body: SendExcessInternal{
                query_id: msg.query_id
            }.toCell()
        });

        return;
    }



    fun multiSwapInit(seller_address: Address, 
        query_id: Int,
        is_initiator: Bool,
        offered_items: map<Int as uint8, SwapItem>,
        requested_items: map<Int as uint8, SwapItem>): StateInit {
        return initOf MultiSwap(self.router_address, seller_address, query_id, is_initiator, offered_items, requested_items);
    }

    get fun multiSwapAddress(
        seller_address: Address, 
        query_id: Int,
        is_initiator: Bool,
        offered_items: map<Int as uint8, SwapItem>,
        requested_items: map<Int as uint8, SwapItem>
    ): Address {
        return contractAddress(self.multiSwapInit(seller_address, query_id, is_initiator, offered_items, requested_items));
    }

    get fun mirrorSwapAddress(): Address?{
        return self.mirror_swap_address;
    }


    get fun data(): MultiSwapData{
        return MultiSwapData{
            router_address: self.router_address,
            seller_address: self.seller_address,
            
            offered_items: self.offered_items,
            requested_items: self.requested_items,
            query_id: self.query_id,
            state: self.state,
            expiration_time_seconds: self.expiration_time_seconds,
            is_expired : self.isExpired(),
            is_initiator: self.is_initiator
        }
    }


    receive(msg: SendExcessInternal){
        require(self.state == self.StateSwapped, "Wrong state");
        let excess = myBalance() - MIN_TONS_FOR_STORAGE - ton("0.01");
        if(excess>0){
            send(SendParameters{
                to: self.seller_address,
                value: excess,
                bounce: true,
                mode: 0,
                body: Excesses { query_id: msg.query_id }.toCell()
            });
        }
    }

    receive(){}
    
}