import {
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Dictionary,
    Sender,
    SendMode,
    toNano,
} from 'ton-core';

import { encodeOffChainContent } from '../utils/encodeOffChainContent';
import { CollectionMint, MintValue } from '../utils/collectionHelpers';

export type RoyaltyParams = {
    royaltyFactor: number;
    royaltyBase: number;
    royaltyAddress: Address;
};

export type NftCollectionConfig = {
    ownerAddress: Address;
    nextItemIndex: number | bigint;
    collectionContent: string;
    commonContent: string;
    nftItemCode: Cell;
    royaltyParams: RoyaltyParams;
};

export function buildNftCollectionContentCell(collectionContent: string, commonContent: string): Cell {
    let contentCell = beginCell();

    let encodedCollectionContent = encodeOffChainContent(collectionContent);

    let commonContentCell = beginCell();
    commonContentCell.storeBuffer(Buffer.from(commonContent));

    contentCell.storeRef(encodedCollectionContent);
    contentCell.storeRef(commonContentCell.asCell());

    return contentCell.endCell();
}

export function nftCollectionConfigToCell(config: NftCollectionConfig): Cell {
    return beginCell()
        .storeAddress(config.ownerAddress)
        .storeUint(config.nextItemIndex, 64)
        .storeRef(buildNftCollectionContentCell(config.collectionContent, config.commonContent))
        .storeRef(config.nftItemCode)
        .storeRef(
            beginCell()
                .storeUint(config.royaltyParams.royaltyFactor, 16)
                .storeUint(config.royaltyParams.royaltyBase, 16)
                .storeAddress(config.royaltyParams.royaltyAddress)
            .endCell()
        )
    .endCell();
}

export class NftCollection implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new NftCollection(address);
    }

    static createFromConfig(config: NftCollectionConfig, code: Cell, workchain = 0) {
        const data = nftCollectionConfigToCell(config);
        const init = { code, data };
        return new NftCollection(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMint(
        provider: ContractProvider,
        via: Sender,
        opts: {
            itemIndex: number;
            itemOwnerAddress: Address;
            itemContent: string;
            amount: bigint;
        }
    ) {
        const nftContent = beginCell();
        nftContent.storeBuffer(Buffer.from(opts.itemContent));

        const nftMessage = beginCell();

        nftMessage.storeAddress(opts.itemOwnerAddress);
        nftMessage.storeRef(nftContent);

        await provider.internal(via, {
            value: toNano('0.05') + toNano('0.1'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(1, 32)
                .storeUint(0, 64)
                .storeUint(opts.itemIndex, 64)
                .storeCoins(opts.amount)
                .storeRef(nftMessage)
            .endCell(),
        });
    }

    async sendBatchMint(
        provider: ContractProvider,
        via: Sender,
        opts: {
            sbts: CollectionMint[];
        }
    ) {
        if (opts.sbts.length > 250) {
            throw new Error('More than 250 items');
        }

        const dict = Dictionary.empty(Dictionary.Keys.Uint(64), MintValue);
        for (const sbt of opts.sbts) {
            dict.set(sbt.index, sbt);
        }

        await provider.internal(via, {
            value: toNano('0.1') * BigInt(dict.size) + toNano('0.05'),
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(2, 32).storeUint(0, 64).storeDict(dict).endCell(),
        });
    }

async getNftAddressByIndex(provider: ContractProvider, index: bigint): Promise<Address> {
        const result = await provider.get('get_nft_address_by_index', [{ type: 'int', value: index }]);
        return result.stack.readAddress();
    }
}