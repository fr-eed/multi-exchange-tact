import "./timeframe";


contract PersonalDiscovery with OfferQuery {

    // init params
    // used to pagimate offers of specific user.
    seller_address: Address;
    router_address: Address;
    // init params


    // number of current offers in this contract
    num_of_offers: Int as uint32 = 0;
    // map of all offers that are inited
    offer_map: map<Int as uint32, Address>;
    

    init(
        router_address: Address,
        seller_address: Address,
    ){
        require(sender() == router_address, "not from router");
        self.seller_address = seller_address;
        self.router_address = router_address;
    }

}