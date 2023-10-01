import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from 'ton-core';

export type FeesCell = {
    marketplace_fee_address: Address;
    marketplace_fee: number | bigint;
    royalty_address: Address;
    royalty_amount: number | bigint;
};

export type MsgToCollectionForDucksDeploy = {
    op: number | bigint;
    query_id: number | bigint;
    item_index: number | bigint;
    amount: number | bigint;
    nft_content: Cell;
};

export type CustomStorageCell = {
    eggs_master_addr: Address;
    ducks_collection_addr: Address;
    message_to_collection_for_ducks_nft_deploy: MsgToCollectionForDucksDeploy;
};

export type CustomSaleContractConfig = {
    is_complete: number | bigint;
    created_at: number | bigint;
    marketplace_address: Address;
    nft_address: Address;
    nft_owner_address: Address;
    full_price: number | bigint;
    fees_cell: FeesCell;
    can_deploy_by_external: number | bigint;
    custom_storage_cell: CustomStorageCell;
};

export function customSaleContractConfigToCell(config: CustomSaleContractConfig): Cell {

    return (
        beginCell()
            .storeUint(config.is_complete, 1)
            .storeUint(config.created_at, 32)
            .storeAddress(config.marketplace_address)
            .storeAddress(config.nft_address)
            .storeAddress(config.nft_owner_address)
            .storeCoins(config.full_price)
            .storeRef(
                beginCell()
                    .storeAddress(config.fees_cell.marketplace_fee_address)
                    .storeCoins(config.fees_cell.marketplace_fee)
                    .storeAddress(config.fees_cell.royalty_address)
                    .storeCoins(config.fees_cell.royalty_amount)
                .endCell()
            )
            .storeUint(config.can_deploy_by_external, 1)
            .storeRef(
                beginCell()
                    .storeAddress(config.custom_storage_cell.eggs_master_addr)
                    .storeAddress(config.custom_storage_cell.ducks_collection_addr)
                    .storeRef(
                        beginCell()
                            .storeUint(config.custom_storage_cell.message_to_collection_for_ducks_nft_deploy.op, 32)
                            .storeUint(config.custom_storage_cell.message_to_collection_for_ducks_nft_deploy.query_id, 64)
                            .storeUint(config.custom_storage_cell.message_to_collection_for_ducks_nft_deploy.item_index, 64)
                            .storeCoins(config.custom_storage_cell.message_to_collection_for_ducks_nft_deploy.amount)
                            .storeRef(config.custom_storage_cell.message_to_collection_for_ducks_nft_deploy.nft_content)
                        .endCell()
                    )
                .endCell()
            )
        .endCell());
}

export class CustomSaleContract implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new CustomSaleContract(address);
    }

    static createFromConfig(config: CustomSaleContractConfig, code: Cell, workchain = 0) {
        const data = customSaleContractConfigToCell(config);
        const init = { code, data };
        return new CustomSaleContract(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(1, 32).storeUint(0, 64).endCell(),
        });
    }
}
