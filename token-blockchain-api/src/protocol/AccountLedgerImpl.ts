import {
    AccountLedger, Address, Hash, Bytes, Signature, TimeStamp, IHashable,
    IAccountTransaction, AccountTransaction, AccountState
} from 'ac-contracts';
import { W3 } from 'soltsice';
import { DbService, EthService } from '../services';
import { Exception } from 'ts-httpexceptions/lib/';

export class AccountLedgerImpl extends AccountLedger {
    public account: Address;
    public signer: Address;
    public first: AccountTransaction<IHashable>;

    // when different DBs store txs, need to sync with the last anchor
    // private anchorSynched: boolean;

    constructor(private db: DbService, private ethService: EthService, address: string) {
        super();
        this.account = address;
        this.signer = this.ethService.botAddress;

        let accountState = new AccountState();
        accountState.receiptId = 0;
        accountState.nanoTokens = 0;
        accountState.rating = 0;
        accountState.requiredMilliTokensStake = 0;
        accountState.timeStamp = 0;
        let hashable: IHashable = { hash: W3.EthUtils.SHA3_NULL_S };
        let nullHash = W3.EthUtils.bufferToHex(W3.EthUtils.zeros(32));
        let nullSig = W3.EthUtils.bufferToHex(W3.EthUtils.zeros(65));
        this.first = new AccountTransaction<IHashable>(0, new TimeStamp(0), W3.zeroAddress, accountState, hashable,
            nullHash, W3.EthUtils.SHA3_NULL_S, this.signer, nullSig);

        // this.getHead().then(h => this.head = h);
    }

    public async getAnchor(): Promise<IAccountTransaction | undefined> {
        let params = await this.ethService.accountManager.currentAccountStateForAddress(this.account, W3.TX.txParamsDefaultSend(this.ethService.botAddress));
        let state = AccountState.fromContract(this.account, params);
        let hash = state.ledgerHash;
        if (hash && hash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
            let txs = await this.db.getReceiptsFromHash<IAccountTransaction>(this.account, hash, 1);
            if (txs.length === 0) {
                // workaround for unsynced DBs during test/stage
                if (+this.ethService.networkId !== 1) {
                    let tx = await this.getHead();
                    if ((tx && tx.id < state.receiptId) || (!tx && state.receiptId > 0)) {
                        // anchor has higher id, edge case during staging
                        let anchor = new AccountTransaction<IHashable>(state.receiptId, new TimeStamp(state.timeStamp * 1000),
                            state.accountAddress, state, { hash: W3.EthUtils.SHA3_NULL_S },
                            state.ledgerHash, state.ledgerHash, this.signer, W3.EthUtils.bufferToHex(W3.EthUtils.zeros(65)));
                        await this.db.addReceipt(this.account, anchor.id, anchor.hash, anchor);
                        return anchor;
                    }
                } else {
                    throw new Error(`Cannot find anchored tx ${hash} in the ledger for account ${this.account}`);
                }
            }
            let anchoredTx = txs[0];
            return anchoredTx;
        } else {
            return undefined;
        }
    }

    public async getHead(): Promise<IAccountTransaction> {
        // TODO problem - different DBs for same account
        let tx: AccountTransaction<IHashable>;

        tx = await this.db.lastReceipt<IAccountTransaction>(this.account) as AccountTransaction<IHashable>;

        // this is only a workaround to avoid errors when an account has a state in contracts
        // but it was not written to a local DB, e.g. dev machine and stage machine
        if (+this.ethService.networkId !== 1) {
            let anchor: AccountTransaction<IHashable>;
            let params = await this.ethService.accountManager.currentAccountStateForAddress(this.account, W3.TX.txParamsDefaultSend(this.ethService.botAddress));
            let state = AccountState.fromContract(this.account, params);
            if ((tx && tx.id < state.receiptId) || (!tx && state.receiptId > 0)) {
                // anchor has higher id, edge case during staging
                anchor = new AccountTransaction<IHashable>(state.receiptId, new TimeStamp(state.timeStamp * 1000),
                    state.accountAddress, state, { hash: W3.EthUtils.SHA3_NULL_S },
                    state.ledgerHash, state.ledgerHash, this.signer, W3.EthUtils.bufferToHex(W3.EthUtils.zeros(65)));
                await this.db.addReceipt(this.account, anchor.id, anchor.hash, anchor);
                this.first = anchor;
            }
        }

        // tslint:disable-next-line:prefer-conditional-expression
        if (tx) {
            tx = this.mapJsonToAccountTransaction(tx);
        } else {
            tx = this.first;
        }

        return tx;
    }

    private mapJsonToAccountTransaction(tx: AccountTransaction<IHashable>): AccountTransaction<IHashable> {
        // during runtime the type from DB is just JSON/OBJECT, need to set real types to fields/methods
        let timestamp = new TimeStamp(tx.timestamp.milliseconds);
        tx.timestamp = timestamp;
        return tx;
    }

    public async getTxsFromHash(hash: Hash, count: number): Promise<IAccountTransaction[]> {
        let arr = await this.db.getReceiptsFromHash<IAccountTransaction>(this.account, hash, count);
        return arr.map(this.mapJsonToAccountTransaction);
    }

    public async getTxsFromIndex(index: number, count: number): Promise<IAccountTransaction[]> {
        let arr = await this.db.getReceiptsFromIndex<IAccountTransaction>(this.account, index, count);
        return arr.map(this.mapJsonToAccountTransaction);
    }

    public async appendTx(tx: IAccountTransaction): Promise<boolean> {
        if (!tx.hash) {
            throw new Error('Tx must have hash to append');
        }

        // TODO uncomment after tests
        // if (!AccountTransaction.isValid(tx)) {
        //     throw new Error('Tx is invalid');
        // }

        // let receipt = this.generateSignedReceipt(tx);
        // if (receipt.isValid === false) {
        //     throw new Exception('Receipt is not valid' + JSON.stringify(receipt));
        // }

        // let head = await this.getHead();
        // if (head && head.id + 1 !== tx.id) {
        //     throw new Error(`Wrong transaction id: head is ${head.id}, tx id is ${tx.id}`);
        // }

        let result = await this.db.addReceipt(this.account, tx.id, tx.hash, tx);
        return result;
    }

    public sign(bytes: Bytes): Signature {
        let hexSign = this.ethService.sign(bytes);
        return hexSign;
    }

}
