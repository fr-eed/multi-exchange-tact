import "./multi_swap.tact";
import "./message.tact";
import "./discovery/personal.tact";
import "@stdlib/deploy";
import "@stdlib/ownable";



contract MultiSwapRouter with Deployable, OwnableTransferable {
    init(){
        self.max_items_per_side = 4;
        self.fixed_fee_in_ton = ton("0.1");
        self.swap_fee_basis_points = 100;
        self.swap_ttl_seconds = 60*60*1;
        self.owner = context().sender;
    }
    owner: Address;

    max_items_per_side: Int as uint8; // Max count of both NFTs and Jettons per offer side. Defaults to 4
    fixed_fee_in_ton: Int as coins; // Fixed fee to be applied for seller and then buyer
    swap_fee_basis_points: Int as uint16; // Fee to be applied for seller and then buyer in swap tokens (in 1/100 of 1 percent)
    swap_ttl_seconds: Int as uint32; // TTL (time-to-live) for swap in seconds

    timeframe_period: Int as uint32 = 3600 * 24 * 3; // 3 days

    receive(msg: UpdateSwapRouterData){
        let ctx: Context = context();
        require(ctx.sender == self.owner, "Not owner");

        self.max_items_per_side = msg.max_items_per_side;
        self.fixed_fee_in_ton = msg.fixed_fee_in_ton;
        self.swap_fee_basis_points = msg.swap_fee_basis_points;
        self.swap_ttl_seconds = msg.swap_ttl_seconds;
    }

    fun validateItems(items: map<Int as uint8, SwapItem>): Bool {
       // map should be less or qeual to max_items_per_side
       // all keys should start from 0 and increment by 1
       let i: Int=0;
        foreach (key, value in items){
            if(key != i){
                return false;
            }
            if(value.type>1){
                // unknown type
                return false
            }
            i = i + 1;
        }
        if (i > self.max_items_per_side || i==0){
            return false;
        } 
        return true;
    
    }

    fun calculateRouterFees(): Int {
        let balance: Int = myBalance();
        
        let storageFee: Int = MIN_TONS_FOR_STORAGE - min(balance, MIN_TONS_FOR_STORAGE);

        return  (storageFee + ROUTER_OPERATION_FEE + self.fixed_fee_in_ton);
    }


    fun calculateSwapFees(offered_items: map<Int as uint8, SwapItem>): Int
    {

        let fee: Int = 0;
        fee += OPERATION_FEE;
        foreach (key, value in offered_items){
            if(
                value.type == SWAP_ITEM_TYPE_NFT
            ){
                fee+=FEE_PER_NFT_ITEM;

            }else{
                fee+=FEE_PER_JETTON_ITEM;
            }

        }  

        return fee;

    }

    get fun calculateMinValue(offered_items: map<Int as uint8, SwapItem>): Int{
        let routerFees = self.calculateRouterFees(); 
        let swapFees = self.calculateSwapFees(offered_items);

        return routerFees + swapFees + ton("0.01");
    }

    
    get fun timeFramePeriod(): Int{
        return self.timeframe_period;
    }

    get fun currentTimeframe(): Int{
        // time with last 3600*24*3 as 0s
        return now()/self.timeframe_period;
    }


    fun announcePersonalOffer(offer_address: Address, seller_address: Address){
        let personalDiscoveryInit = self.personalDiscoveryInit(seller_address);
        send(SendParameters{
            to: contractAddress(personalDiscoveryInit),
            value: ton("0.02"),
            mode: 0,
            bounce: false,
            body: AnnounceOffer{
                offer_address: offer_address,
                response_destination: seller_address
            }.toCell(),
            code: personalDiscoveryInit.code,
            data: personalDiscoveryInit.data
        });
    }

    fun announceTimeframeOffer(offer_address: Address, seller_address: Address){
        let timeframeDiscoveryInit = self.timeframeDiscoveryInit(self.currentTimeframe());
        send(SendParameters{
            to: contractAddress(timeframeDiscoveryInit),
            value: ton("0.02"),
            mode: 0,
            bounce: false,
            body: AnnounceOffer{
                offer_address: offer_address,
                response_destination: seller_address
            }.toCell(),
            code: timeframeDiscoveryInit.code,
            data: timeframeDiscoveryInit.data
        });
    }


    
    receive(msg: InitMultiSwap){
        let ctx: Context = context();
        let msgValue: Int = ctx.value - self.calculateRouterFees();
        
        require(msgValue >= 0, "Value too low for Router operation");

        require(self.validateItems(msg.requested_items), "Invalid requested items");
        require(self.validateItems(msg.offered_items), "Invalid offered items");

        require(msgValue > self.calculateSwapFees(msg.offered_items), "Value too low for MultiSwap operation");
        
        // take fee
        send(SendParameters{
            to: self.owner,
            value: self.fixed_fee_in_ton,
            bounce: false,
            mode: SendIgnoreErrors
        });
        
        
        
   
        let expiration_time = now() + self.swap_ttl_seconds;

        let state_init: StateInit = self.multiSwapInit(
            ctx.sender,
            msg.query_id,
            msg.mirror_swap_address == null, // null means initiator (we're creating new offer)
            msg.offered_items,
            msg.requested_items,
        );

        let offer_address = contractAddress(state_init);

        self.announcePersonalOffer(offer_address, ctx.sender);
        if(msg.mirror_swap_address == null){
            // if initiator, we need to announce in timeframe
           self.announceTimeframeOffer(offer_address, ctx.sender);
        }

        send(SendParameters{
                to: contractAddress(state_init), 
                bounce: false,
                body: MultiSwapDeployment{
                    mirror_swap_address: msg.mirror_swap_address,
                    expiration_time_seconds: expiration_time,
                    swap_fee_basis_points: self.swap_fee_basis_points
                    }.toCell(),
                value: msgValue,
                mode: 0,
                code: state_init.code,
                data: state_init.data
            });
    }


    fun multiSwapInit(seller_address: Address, 
        expiration_time_seconds: Int,
        is_initiator: Bool,
        offered_items: map<Int as uint8, SwapItem>,
        requested_items: map<Int as uint8, SwapItem>): StateInit {
        return initOf MultiSwap(myAddress(), seller_address, expiration_time_seconds, is_initiator, offered_items, requested_items);
    }

    get fun multiSwapAddress(
        seller_address: Address, 
        expiration_time_seconds: Int,
        is_initiator: Bool,
        offered_items: map<Int as uint8, SwapItem>,
        requested_items: map<Int as uint8, SwapItem>
    ): Address {
        return contractAddress(self.multiSwapInit(seller_address, expiration_time_seconds, is_initiator, offered_items, requested_items));
    }

    fun personalDiscoveryInit(
        seller_address: Address,
    ): StateInit{
        return initOf PersonalDiscovery(myAddress(), seller_address);
    }
    get fun personalDiscoveryAddress(
        seller_address: Address, 
    ): Address {
        return contractAddress(self.personalDiscoveryInit(seller_address));
    }
    
    fun timeframeDiscoveryInit(
        timeframe: Int,
    ): StateInit {
        return initOf TimeframeDiscovery(myAddress(), timeframe);
    }
    get fun timeframeDiscoveryAddress(
        timeframe: Int, 
    ): Address {
        return contractAddress(self.timeframeDiscoveryInit(timeframe));
    }
    
    get fun data(): MultiSwapRouterData {
        return MultiSwapRouterData{
            max_items_per_side: self.max_items_per_side,
            fixed_fee_in_ton: self.fixed_fee_in_ton,
            swap_fee_basis_points: self.swap_fee_basis_points,
            swap_ttl_seconds: self.swap_ttl_seconds
        };
    }
}