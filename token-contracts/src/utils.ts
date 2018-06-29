import {
    MultiSigWallet,
    // AITTToken
} from './contracts';
import { W3, getStorage, Storage } from 'soltsice';
import { BigNumber } from 'bignumber.js';

export class Utils {
    storage: Promise<Storage>;
    private w3: W3;
    private deployParams: W3.TX.TxParams;
    private privateKey?: string = undefined;

    // changing this will redeploy all contracts but only once
    private nonce: number = 21;
    /**
     *
     */
    constructor(activeAccount?: string, w3?: W3, privateKey?: string) {
        this.w3 = w3 || new W3();
        activeAccount = activeAccount || this.w3.defaultAccount || '0xc08d5fe987c2338d28fd020b771a423b68e665e4';
        this.deployParams = W3.TX.txParamsDefaultDeploy(activeAccount);
        this.privateKey = privateKey;
        this.w3.networkId.then(nid => {
            if (nid !== '1') {
                // Ropsten refused to process 2 Gwei txs on Nov 13
                this.deployParams.gasPrice = new BigNumber(50000000000);
                this.deployParams.gas = 4700000;
            }
        })
        this.storage = getStorage(this.w3, activeAccount);
    }

    public async getMultiSig(ctorParams?: { _owners: string[], _required: number }): Promise<MultiSigWallet> {
        let storage = await this.storage;
        await storage.instance;
        // unique string that changes with bytescode, parameters and is different from other if we add them later
        let msHash = W3.sha3(this.nonce + MultiSigWallet.BytecodeHash! + JSON.stringify(ctorParams) + "multisig");
        let msAddress = await storage.getAddressValue(msHash);
        let ms: MultiSigWallet;
        if (msAddress === W3.zeroAddress) {
            ms = await MultiSigWallet.New(this.deployParams, ctorParams, this.w3, undefined, this.privateKey);
            let newAddrs = ms.address;
            if (this.privateKey) {
                let txHash = await storage.setAddressValue.sendTransaction.sendSigned(msHash, newAddrs, this.privateKey, this.deployParams);
                await this.w3.waitTransactionReceipt(txHash);
            } else {
                await storage.setAddressValue(msHash, newAddrs, this.deployParams);
            }
        } else {
            ms = await MultiSigWallet.At(msAddress, this.w3);
        }
        return ms;
    }

    // /** Get existing or deploy new DbrainLibrary if artifacts changed. */
    // public async getDbrainLibrary(): Promise<DbrainLibrary> {
    //     let storage = await this.storage;
    //     await storage.instance;
    //     // no nonce here, libraries are stateless and need redeploy only on bytecode change
    //     let libHash = W3.sha3(DbrainLibrary.BytecodeHash!);
    //     let libAddress = await storage.getAddressValue(libHash);
    //     let library: DbrainLibrary;
    //     if (libAddress === W3.zeroAddress) {
    //         library = await DbrainLibrary.New(this.deployParams, undefined, this.w3, undefined, this.privateKey);
    //         let newAddrs = library.address;
    //         if (this.privateKey) {
    //             let txHash = await storage.setAddressValue.sendTransaction.sendSigned(libHash, newAddrs, this.privateKey, this.deployParams);
    //             await this.w3.waitTransactionReceipt(txHash);
    //         } else {
    //             await storage.setAddressValue(libHash, newAddrs, this.deployParams);
    //         }
    //     } else {
    //         library = await DbrainLibrary.At(libAddress, this.w3);
    //     }
    //     return library;
    // }

    // /** Get existing or deploy new DbrainUserManager if artifacts changed. */
    // public async getDbrainAccountManager(ctorParams?: { _wallet: string }): Promise<DbrainAccountManager> {
    //     let storage = await this.storage;
    //     let contractHash = W3.sha3(this.nonce + DbrainAccountManager.BytecodeHash! + JSON.stringify(ctorParams));
    //     let contractAddress = await storage.getAddressValue(contractHash);
    //     let contract: DbrainAccountManager;
    //     if (contractAddress === W3.zeroAddress) {
    //         if (!ctorParams) {
    //             throw new Error('AccountManager address is zero and no ctor parameters are provided.');
    //         }
    //         contract = await DbrainAccountManager.New(this.deployParams, ctorParams, this.w3, undefined, this.privateKey);
    //         let newAddrs = contract.address;
    //         if (this.privateKey) {
    //             let txHash = await storage.setAddressValue.sendTransaction.sendSigned(contractHash, newAddrs, this.privateKey, this.deployParams);
    //             await this.w3.waitTransactionReceipt(txHash);
    //         } else {
    //             await storage.setAddressValue(contractHash, newAddrs, this.deployParams);
    //         }
    //     } else {
    //         contract = await DbrainAccountManager.At(contractAddress, this.w3);
    //     }
    //     return contract;
    // }

    // public async getAITTToken(ctorParams?: { _teamMultisigWallet: string }): Promise<AITTToken> {
    //     let storage = await this.storage;
    //     let contractHash = W3.sha3(this.nonce + AITTToken.BytecodeHash! + JSON.stringify(ctorParams) + 'token');
    //     let contractAddress = await storage.getAddressValue(contractHash);
    //     let contract: AITTToken;
    //     if (contractAddress === W3.zeroAddress) {
    //         contract = await AITTToken.New(this.deployParams, ctorParams, this.w3, undefined, this.privateKey);
    //         let newAddrs = contract.address;
    //         if (this.privateKey) {
    //             let txHash = await storage.setAddressValue.sendTransaction.sendSigned(contractHash, newAddrs, this.privateKey, this.deployParams);
    //             await this.w3.waitTransactionReceipt(txHash);
    //         } else {
    //             await storage.setAddressValue(contractHash, newAddrs, this.deployParams);
    //         }
    //     } else {
    //         contract = await AITTToken.At(contractAddress, this.w3);
    //     }
    //     return contract;
    // }

}
