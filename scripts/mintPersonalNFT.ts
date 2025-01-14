import { Address, beginCell, Dictionary, OpenedContract, toNano } from '@ton/core';
import { NetworkProvider } from '@ton/blueprint';
import { NftItem, Transfer } from '../build/Nft/tact_NftItem';

const custom_payload = beginCell().storeStringTail("nft_data").endCell();

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    let deployer = provider.sender();

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
                custom_payload: custom_payload,
                forward_amount: 0n,
                forward_payload: beginCell().endCell().asSlice(),
            } as Transfer
        );

        // wait until deployed
        await provider.waitForDeploy(nftItem.address, 50);


        return nftItem;

    }

    let nftNumber = Number( ui.input("Enter nft number: "));


    const nft0 = await createNftItem(deployer.address!, nftNumber);
    console.log("nft address: ");
    console.log(nft0.address.toString());
}