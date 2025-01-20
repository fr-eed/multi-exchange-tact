
message MultiSwapRouterData {
    max_items_per_side: Int as uint8; // Max count of both NFTs and Jettons per offer side. Defaults to 4
    fixed_fee_in_ton: Int as coins; // Fixed fee to be applied for seller and then buyer
    swap_fee_basis_points: Int as uint16; // Fee to be applied for seller and then buyer in swap tokens (in 1/100 of 1 percent)
    swap_ttl_seconds: Int as uint32; // TTL (time-to-live) for swap in seconds
}

message UpdateSwapRouterData {
    max_items_per_side: Int as uint8; // Max count of both NFTs and Jettons per offer side. Defaults to 4
    fixed_fee_in_ton: Int as coins; // Fixed fee to be applied for seller and then buyer
    swap_fee_basis_points: Int as uint16; // Fee to be applied for seller and then buyer in swap tokens (in 1/100 of 1 percent)
    swap_ttl_seconds: Int as uint32; // TTL (time-to-live) for swap in seconds
}

const SWAP_ITEM_TYPE_NFT: Int = 0;
const SWAP_ITEM_TYPE_JETTON: Int = 1;

struct SwapItem {
    type: Int as uint3;
    amount: Int as coins;
    address: Address;
}

message InitMultiSwap{
    offered_items: map<Int as uint8, SwapItem>; // List of up to 4 offered items with type and amount
    requested_items: map<Int as uint8, SwapItem>; // List of up to 4 requested items with type and amount
    query_id: Int as uint32;
    mirror_swap_address: Address?;
}


message MultiSwapData{
    // const
    router_address: Address;
    seller_address: Address;
    query_id: Int as uint32;
    is_initiator: Bool; // only initiator can accept offer

    offered_items: map<Int as uint8, SwapItem>; // List of up to 4 offered items with type and amount
    requested_items: map<Int as uint8, SwapItem>; // List of up to 4 requested items with type and amount

    // set by router
    expiration_time_seconds: Int as uint32;

    // dynamic
    state: Int;
    is_expired: Bool;
}


message MultiSwapDeployment{
    mirror_swap_address: Address?;
    expiration_time_seconds: Int as uint32;
    swap_fee_basis_points: Int as uint16;
}


// This message notifies mirror contract to exchange items
// On success the same notification will be sent back to unlock funds
message MirrorOfferRequest{
    seller_address: Address;
    query_id: Int as uint32;
}

message MirrorOfferResponse{
    seller_address: Address;
}

message SendExcessInternal{
    query_id: Int as uint64;
}



message WithdrawSeller{
    query_id: Int as uint64;
}

message WithdrawBuyer{
    query_id: Int as uint64;
}



/*
Imported
*/

message(0xd53276db) Excesses {
    query_id: Int as uint64;
}

message(0x5fcc3d14) TransferNFT {
    query_id: Int as uint64;
    new_owner: Address;
    response_destination: Address?;
    custom_payload: Cell?;
    forward_amount: Int as coins;
    forward_payload: Slice as remaining;
}


message(0x05138d91) OwnershipAssignedNFT {
    query_id: Int as uint64;
    prev_owner: Address;
    forward_payload: Slice as remaining;
}


message(0x7362d09c) TokenNotificationJetton {
    query_id: Int as uint64;
    amount: Int as coins;
    from: Address;
    forward_payload: Slice as remaining;
}

// ==== TEP89: Jetton Wallet Discovery ====
message(0x2c76b973) ProvideWalletAddressJetton {
    query_id: Int as uint64;
    owner_address: Address;
    include_address: Bool;
}

// take_wallet_address#d1735400 
// query_id:uint64 wallet_address:MsgAddress owner_address:(Maybe ^MsgAddress) = InternalMsgBody;
message(0xd1735400) TakeWalletAddressJetton {
    query_id: Int as uint64;
    wallet_address: Address;
    owner_address: Slice as remaining;
}

message(0xf8a7ea5) TokenTransferJetton {
    query_id: Int as uint64;
    amount: Int as coins;
    sender: Address;
    response_destination: Address?;
    custom_payload: Cell?;
    forward_ton_amount: Int as coins;
    forward_payload: Slice as remaining; 
}