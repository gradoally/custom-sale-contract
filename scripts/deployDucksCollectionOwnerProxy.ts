import { toNano } from 'ton-core';
import { DucksCollectionOwnerProxy } from '../wrappers/DucksCollectionOwnerProxy';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const ducksCollectionOwnerProxy = provider.open(DucksCollectionOwnerProxy.createFromConfig({}, await compile('DucksCollectionOwnerProxy')));

    await ducksCollectionOwnerProxy.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(ducksCollectionOwnerProxy.address);

    // run methods on `ducksCollectionOwnerProxy`
}
