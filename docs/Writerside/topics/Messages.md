# Messages

## MultiSwapData

Message `MultiSwapData` is used to store data about the contract state.

* `offered_items`: map of items that the contract offers to trade. The key is `uint8` - index of the item, the value is `SwapItem` - the item itself.
* `requested_items`: map of items that the contract wants to obtain. The key is `uint8` - index of the item, the value is `SwapItem` - the item itself.
* `query_id`: `uint32` - the query id.
* `state`: `Int` - current state of the contract.
* `expiration_time_seconds`: `uint32` - the time when the contract will expire.
* `is_expired`: `Bool` - whether the contract is expired.
* `is_initiator`: `Bool` - whether the contract is the initiator of the trade.

Note: offered_items and requested_items should be a map of ints starting from 0 in sorted order.

```tact
message MultiSwapData{
    offered_items: map<Int as uint8, SwapItem>; // List of up to 4 offered items with type and amount
    requested_items: map<Int as uint8, SwapItem>; // List of up to 4 requested items with type and amount
    query_id: Int as uint32;
    state: Int;

    expiration_time_seconds: Int as uint32;
    is_expired: Bool;
    is_initiator: Bool;

}

```


## SwapItem

Struct `SwapItem` is used to store information about an item that is being traded.

* `type`: `uint3` - type of the item. Can be `0` for NFT or `1` for Jetton.
* `amount`: `coins` - the amount of the item. For NFT always 1.
* `address`: `Address` - the address of the item. For NFT - `address of specific NFT`. For Jetton `address of Jetton` (not Jetton wallet!)

```tact
const SWAP_ITEM_TYPE_NFT: Int = 0;
const SWAP_ITEM_TYPE_JETTON: Int = 1;


struct SwapItem {
    type: Int as uint3;
    amount: Int as coins;
    address: Address;
}
```



## MultiSwapRouterData

Message `MultiSwapRouterData` is used to store parameters of the MultiSwapRouter contract.

* `max_items_per_side`: `uint8` - maximum number of items of any type that can be traded. Defaults to 4.
* `fixed_fee_in_ton`: `coins` - fixed fee in Toncoin that is applied to both seller and buyer.
* `swap_fee_basis_points`: `uint16` - fee in basis points (1/100 of 1%) that is applied to both seller and buyer in swap tokens.
* `swap_ttl_seconds`: `uint32` - time-to-live for the swap in seconds.
```tact

message MultiSwapRouterData {
    max_items_per_side: Int as uint8; // Max count of both NFTs and Jettons per offer side. Defaults to 4
    fixed_fee_in_ton: Int as coins; // Fixed fee to be applied for seller and then buyer
    swap_fee_basis_points: Int as uint16; // Fee to be applied for seller and then buyer in swap tokens (in 1/100 of 1 percent)
    swap_ttl_seconds: Int as uint32; // TTL (time-to-live) for swap in seconds
}
```