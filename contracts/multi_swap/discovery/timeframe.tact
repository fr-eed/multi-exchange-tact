import "./offer_query";


contract TimeframeDiscovery with OfferQuery{

    // init params
    // used as id. updates every N days (speciified in router contract)
    timeframe: Int as uint32;
    router_address: Address;
    // init params


    // number of current offers in this contract
    num_of_offers: Int as uint32 = 0;
    // map of all offers that are inited
    offer_map: map<Int as uint32, Address>;


    init(
        router_address: Address,
        timeframe: Int
    ){
        require(sender() == router_address, "not from router");
        self.timeframe = timeframe;
        self.router_address = router_address;
    }


}