import { Address, Cell, beginCell, toNano } from 'ton-core';
import { CustomSaleContract } from '../wrappers/CustomSaleContract';
import { NftCollection } from '../wrappers/NftCollection';
import { NftItem } from '../wrappers/NftItem';
import '@ton-community/test-utils';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { DucksCollectionOwnerProxy } from '../wrappers/DucksCollectionOwnerProxy';

let egg_master_code:                Cell;
let custom_sale_contract_code:      Cell;
let collection_code:                Cell;
let marketplace_fee_address:        Address;
let royalty_address:                Address;
let nft_owner_address:              Address;

export async function run(provider: NetworkProvider) {

    egg_master_code =               await compile('DucksCollectionOwnerProxy');
    collection_code =               await compile('NftCollection');
    custom_sale_contract_code =     await compile('CustomSaleContract');
    marketplace_fee_address =       Address.parse("EQD4FPq-PRDieyQKkizFTRtSDyucUIqrj0v_zXJmqaDp6_0t");
    royalty_address =               provider.sender().address as Address;
    nft_owner_address =             provider.sender().address as Address;

    const EggsCollection = provider.open(NftCollection.createFromConfig({
        ownerAddress: provider.sender().address as Address,
        nextItemIndex: 0,
        collectionContent: '',
        commonContent: '',
        nftItemCode: await compile('NftItem'),
        royaltyParams: {
            royaltyFactor: 5,
            royaltyBase: 100,
            royaltyAddress: provider.sender().address as Address
        }
    }, collection_code));

    await EggsCollection.sendDeploy(provider.sender(), toNano('0.2'));

    await provider.waitForDeploy(EggsCollection.address);

    const FirstEggNftAddress = await EggsCollection.getNftAddressByIndex(0n);

    const EggsMaster = provider.open(DucksCollectionOwnerProxy.createFromConfig({
        nft_item_code: await compile('NftItem'),
        eggs_collection_addr: EggsCollection.address
    }, egg_master_code));

    const DucksCollection = provider.open(NftCollection.createFromConfig({
        ownerAddress: EggsMaster.address,
        nextItemIndex: 0,
        collectionContent: '',
        commonContent: '',
        nftItemCode: await compile('NftItem'),
        royaltyParams: {
            royaltyFactor: 7,
            royaltyBase: 100,
            royaltyAddress: provider.sender().address as Address
        }
        }, collection_code));

    await DucksCollection.sendDeploy(provider.sender(), toNano('0.21'));

    await provider.waitForDeploy(DucksCollection.address);

    await EggsMaster.sendDeploy(provider.sender(), toNano('0.22'));

    await provider.waitForDeploy(EggsMaster.address);

    const SomeCustomSaleContract = provider.open(CustomSaleContract.createFromConfig({
        is_complete: 0,
        created_at: Math.floor(Date.now() / 1000000),
        marketplace_address: provider.sender().address as Address,
        nft_address: FirstEggNftAddress,
        nft_owner_address: nft_owner_address,
        full_price: toNano('0.5'),
        fees_cell: {
            marketplace_fee_address: marketplace_fee_address,
            marketplace_fee: toNano('0.1'),
            royalty_address: royalty_address,
            royalty_amount: toNano('0.2')
        },
        can_deploy_by_external: 0,
        custom_storage_cell: {
            eggs_master_addr: EggsMaster.address,
            ducks_collection_addr: DucksCollection.address,
            message_to_collection_for_ducks_nft_deploy: {
                op: 1,
                query_id: 0,
                item_index: 0,
                amount: toNano('0.2'),
                nft_content: beginCell().endCell()
            }
        }
        }, custom_sale_contract_code));

    await provider.sender().send({value: toNano('0.23'), to: EggsCollection.address, body: (
        beginCell()
            .storeUint(1, 32)
            .storeUint(0, 64)
            .storeUint(0, 64)
            .storeCoins(toNano('0.1'))
            .storeRef(
                beginCell()
                    .storeAddress(SomeCustomSaleContract.address)
                    .storeRef(beginCell().endCell())
                .endCell())
        .endCell())
    });

    console.log(provider.sender());

    await SomeCustomSaleContract.sendDeploy(provider.sender(), toNano('1'));

    await provider.waitForDeploy(SomeCustomSaleContract.address);

    const FirstDuckNftAddress = await DucksCollection.getNftAddressByIndex(0n)

    console.log('Eggs Collection: ' + EggsCollection.address);
    console.log('Ducks Collection: ' + DucksCollection.address);
    console.log('Some Custom Sale Contract: ' + SomeCustomSaleContract.address);
    console.log('Nft Owner Addr: ' + nft_owner_address);
    console.log('Royalty Addr: ' + royalty_address);
    console.log('Marketplace Fee Addr: ' + marketplace_fee_address);
    console.log('Egg Master Addr: ' + EggsMaster.address);
    console.log('Calculated Egg NFT Addr: ' + FirstEggNftAddress);
    console.log('Calculated Duck NFT Addr: ' + FirstDuckNftAddress);

}