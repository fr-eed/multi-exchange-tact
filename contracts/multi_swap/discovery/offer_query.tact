trait OfferQuery {

    // number of current offers in this contract
    num_of_offers: Int;
    
    // map of all offers that are inited
    offer_map: map<Int as uint32, Address>;

    router_address: Address;



    get fun numberOfOffers(): Int {
        return self.num_of_offers;
    }

    get fun recentOffers(last_offer_id: Int, limit: Int): map<Int as uint32, Address> {
        
        let output: map<Int as uint32, Address> = emptyMap();

        let i = 0;

        while (i < limit) {
            let offer_id = last_offer_id - i;
            if (offer_id >= 0) {
                output.set(offer_id, self.offer_map.get(offer_id));
            }

            i+=1;
        }

        return output;
    }    


    receive (msg: AnnounceOffer) {
        require(sender() == self.router_address, "not from router");
    
        self.offer_map.set(self.num_of_offers, msg.offer_address);
        self.num_of_offers = self.num_of_offers + 1;

        if (msg.response_destination != null) {
            send(SendParameters{
                to: msg.response_destination!!,
                value: 0,
                bounce: false,
                mode: SendRemainingValue | SendIgnoreErrors,
            });
        }
    }
    
}


message AnnounceOffer {
    offer_address: Address;
    response_destination: Address?;
    query_id: Int? as uint32;
}