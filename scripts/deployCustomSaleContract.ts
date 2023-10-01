import { toNano } from 'ton-core';
import { CustomSaleContract } from '../wrappers/CustomSaleContract';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    
    const customSaleContract = provider.open(CustomSaleContract.createFromConfig({}, await compile('CustomSaleContract')));

    await customSaleContract.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(customSaleContract.address);

    // run methods on `customSaleContract`
}