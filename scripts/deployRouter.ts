import { toNano } from '@ton/core';

import { NetworkProvider } from '@ton/blueprint';
import { MultiSwapRouter } from '../wrappers/MultiSwapRouter';

export async function run(provider: NetworkProvider) {
    const router = provider.open(await MultiSwapRouter.fromInit());

    if (await provider.isContractDeployed(router.address)){
        throw "Router already deployed"
    }
    
    await router.send(provider.sender(),
        {
            value: toNano(0.1)
        },
        {
            $$type: 'Deploy',
            queryId: 0n,
        }
    );

    await provider.waitForDeploy(router.address);

    console.log(`Router deployed at address: ${router.address}`);
}
