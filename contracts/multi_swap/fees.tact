


const NFT_TRANSFER_FEE: Int= ton("0.06");




const JETTON_TRANSFER_FEE: Int= ton("0.06");
const JETTON_WALLET_LOOKUP_FEE: Int = ton("0.02");


const DISCOVERY_FEE: Int = ton("0.05");


// Fees to be applied:

const ROUTER_OPERATION_FEE: Int= ton("0.02") + DISCOVERY_FEE;

const MIN_TONS_FOR_STORAGE: Int= ton("0.01");
const OPERATION_FEE: Int = ton("0.07");

const FEE_PER_NFT_ITEM: Int = NFT_TRANSFER_FEE+ ton("0.02");
const FEE_PER_JETTON_ITEM: Int = JETTON_TRANSFER_FEE * 2 + JETTON_WALLET_LOOKUP_FEE+ ton("0.01");
// double jetton transfer because of the admin jetton fee