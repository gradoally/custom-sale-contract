import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type DucksCollectionOwnerProxyConfig = {
    nft_item_code: Cell,
    eggs_collection_addr: Address
};

export function ducksCollectionOwnerProxyConfigToCell(config: DucksCollectionOwnerProxyConfig): Cell {
    return beginCell().storeRef(config.nft_item_code).storeAddress(config.eggs_collection_addr).endCell();
}

export class DucksCollectionOwnerProxy implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new DucksCollectionOwnerProxy(address);
    }

    static createFromConfig(config: DucksCollectionOwnerProxyConfig, code: Cell, workchain = 0) {
        const data = ducksCollectionOwnerProxyConfigToCell(config);
        const init = { code, data };
        return new DucksCollectionOwnerProxy(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
