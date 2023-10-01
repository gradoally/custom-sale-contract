import { Blockchain, SandboxContract, TreasuryContract, printTransactionFees } from '@ton-community/sandbox';
import { Address, Cell, address, beginCell, storeCurrencyCollection, toNano } from 'ton-core';
import { CustomSaleContract } from '../wrappers/CustomSaleContract';
import { NftCollection } from '../wrappers/NftCollection';
import { NftItem } from '../wrappers/NftItem';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { randomAddress } from '@ton-community/test-utils';
import { randomInt } from 'crypto';
import { escape } from 'querystring';
import { DucksCollectionOwnerProxy } from '../wrappers/DucksCollectionOwnerProxy';

describe('CustomSaleContract', () => {

    let blockchain: Blockchain;
    let deployer:                       SandboxContract<TreasuryContract>;
    let egg_master_code:                Cell;
    let buyer:                          SandboxContract<TreasuryContract>;
    let custom_sale_contract_code:      Cell;
    let EggsCollection:                 SandboxContract<NftCollection>;
    let DucksCollection:                SandboxContract<NftCollection>;
    let SomeCustomSaleContract:         SandboxContract<CustomSaleContract>;
    let EggsMaster:                     SandboxContract<DucksCollectionOwnerProxy>;
    let collectionCode:                 Cell;
    let marketplace_fee_address:        SandboxContract<TreasuryContract>;
    let royalty_address:                SandboxContract<TreasuryContract>;
    let nft_owner_address:              SandboxContract<TreasuryContract>;

    beforeAll(async () => {


    });

    beforeEach(async () => {
        

    });

    it('should send msg to collection of ducks for duck deploy and transfer egg to user', async () => {

        blockchain =                    await Blockchain.create();
        deployer =                      await blockchain.treasury('deployer');
        egg_master_code =               await compile('DucksCollectionOwnerProxy');
        buyer =                         await blockchain.treasury('buyer');
        collectionCode =                await compile('NftCollection');
        custom_sale_contract_code =     await compile('CustomSaleContract');
        marketplace_fee_address =       await blockchain.treasury('marketplace_fee_address');
        royalty_address =               await blockchain.treasury('royalty_address');
        nft_owner_address =             await blockchain.treasury('nft_owner_address');
        
        
        /*
        blockchain.verbosity = {
            print: true,
            blockchainLogs: true,
            vmLogs: 'vm_logs_full',
            debugLogs: false,
        }
        */

        EggsCollection = blockchain.openContract(NftCollection.createFromConfig({
            ownerAddress: deployer.address,
            nextItemIndex: 0,
            collectionContent: '',
            commonContent: '',
            nftItemCode: await compile('NftItem'),
            royaltyParams: {
                royaltyFactor: 5,
                royaltyBase: 100,
                royaltyAddress: deployer.address
            }
        }, collectionCode));

        const EggsNftCollectionDeployResult = await EggsCollection.sendDeploy(deployer.getSender(), toNano('1'));

        const FirstEggNftAddress = await EggsCollection.getNftAddressByIndex(0n);

        await blockchain.setVerbosityForAddress(FirstEggNftAddress, {
            print: true,
            vmLogs: 'vm_logs_full',
            blockchainLogs: true,
            debugLogs: true
        });

        EggsMaster = blockchain.openContract(DucksCollectionOwnerProxy.createFromConfig({
            nft_item_code: await compile('NftItem'),
            eggs_collection_addr: EggsCollection.address
        }, egg_master_code));

        /*
        await blockchain.setVerbosityForAddress(EggsMaster.address, {
            print: true,
            vmLogs: 'vm_logs_full',
            blockchainLogs: true,
            debugLogs: true
        });
        */

        DucksCollection = blockchain.openContract(NftCollection.createFromConfig({
            ownerAddress: EggsMaster.address,
            nextItemIndex: 0,
            collectionContent: '',
            commonContent: '',
            nftItemCode: await compile('NftItem'),
            royaltyParams: {
                royaltyFactor: 7,
                royaltyBase: 100,
                royaltyAddress: deployer.address
            }
            }, collectionCode));

        const DucksNftCollectionDeployResult = await DucksCollection.sendDeploy(deployer.getSender(), toNano('1'));

        const EggsMasterDeployResult = await EggsMaster.sendDeploy(deployer.getSender(), toNano('1'));

        SomeCustomSaleContract = blockchain.openContract(CustomSaleContract.createFromConfig({
            is_complete: 0,
            created_at: Math.floor(Date.now() / 1000000),
            marketplace_address: deployer.address,
            nft_address: FirstEggNftAddress,
            nft_owner_address: nft_owner_address.address,
            full_price: toNano('5'),
            fees_cell: {
                marketplace_fee_address: marketplace_fee_address.address,
                marketplace_fee: toNano('0.1'),
                royalty_address: royalty_address.address,
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
                    amount: toNano('0.1'),
                    nft_content: beginCell().endCell()
                }
            }
            }, custom_sale_contract_code));

        const EggsNftDeploy = await deployer.send({value: toNano('1'), to: EggsCollection.address, body: (
            beginCell()
                .storeUint(1, 32)
                .storeUint(0, 64)
                .storeUint(0, 64)
                .storeCoins(toNano('1'))
                .storeRef(
                    beginCell()
                        .storeAddress(SomeCustomSaleContract.address)
                        .storeRef(beginCell().endCell())
                    .endCell())
            .endCell()) 
        });

        const CustomSaleContractDeployResult = await SomeCustomSaleContract.sendDeploy(deployer.getSender(), toNano('1'));

        const SendBuyResult = await buyer.send({ value: toNano('6'), to: SomeCustomSaleContract.address });

        const FirstDuckNftAddress = await DucksCollection.getNftAddressByIndex(0n)

        console.log('deployer: ' + deployer.address);
        console.log('Buyer: ' + buyer.address);
        console.log('Eggs Collection: ' + EggsCollection.address);
        console.log('Ducks Collection: ' + DucksCollection.address);
        console.log('Some Custom Sale Contract: ' + SomeCustomSaleContract.address);
        console.log('Nft Owner Addr: ' + nft_owner_address.address);
        console.log('Royalty Addr: ' + royalty_address.address);
        console.log('Marketplace Fee Addr: ' + marketplace_fee_address.address);
        console.log('Egg Master Addr: ' + EggsMaster.address)
        console.log('Calculated Egg NFT Addr: ' + FirstEggNftAddress);
        console.log('Calculated Duck NFT Addr: ' + FirstDuckNftAddress);

        expect(EggsNftCollectionDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: EggsCollection.address,
            deploy: true,
            success: true
        });

        expect(EggsNftDeploy.transactions).toHaveTransaction({
            from: deployer.address,
            to: EggsCollection.address,
            success: true
        });

        expect(EggsNftDeploy.transactions).toHaveTransaction({
            from: EggsCollection.address,
            to: FirstEggNftAddress,
            deploy: true,
            success: true
        });

        expect(EggsMasterDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: EggsMaster.address,
            deploy: true,
            success: true
        });

        expect(DucksNftCollectionDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: DucksCollection.address,
            deploy: true,
            success: true
        });

        expect(CustomSaleContractDeployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: SomeCustomSaleContract.address,
            deploy: true,
            success: true
        });

        expect(SendBuyResult.transactions).toHaveTransaction({
            from: buyer.address,
            to: SomeCustomSaleContract.address,
            success: true
        });

        expect(SendBuyResult.transactions).toHaveTransaction({
            from: SomeCustomSaleContract.address,
            to: nft_owner_address.address,
            success: true
        });

        expect(SendBuyResult.transactions).toHaveTransaction({
            from: SomeCustomSaleContract.address,
            to: royalty_address.address,
            success: true
        });

        expect(SendBuyResult.transactions).toHaveTransaction({
            from: SomeCustomSaleContract.address,
            to: marketplace_fee_address.address,
            success: true
        });

        expect(SendBuyResult.transactions).toHaveTransaction({
            from: SomeCustomSaleContract.address,
            to: FirstEggNftAddress,
            success: true

        });

        expect(SendBuyResult.transactions).toHaveTransaction({
            from: FirstEggNftAddress,
            to: EggsMaster.address,
            success: true
        });

        expect(SendBuyResult.transactions).toHaveTransaction({
            from: EggsMaster.address,
            to: DucksCollection.address,
            success: true
        });

        expect(SendBuyResult.transactions).toHaveTransaction({
            from: DucksCollection.address,
            to: FirstDuckNftAddress,
            deploy: true,
            success: true
        });

        printTransactionFees(EggsNftCollectionDeployResult.transactions);
        printTransactionFees(DucksNftCollectionDeployResult.transactions);
        printTransactionFees(EggsMasterDeployResult.transactions);
        printTransactionFees(EggsMasterDeployResult.transactions);
        printTransactionFees(EggsMasterDeployResult.transactions);

    });
});
