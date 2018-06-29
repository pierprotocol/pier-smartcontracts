import * as uuid from 'uuid';
import { W3, testAccounts, testPrivateKeys, soltsice } from 'soltsice';
import * as fs from 'fs';
import * as path from 'path';
import { Service } from 'ts-express-decorators';

import { BigNumber } from 'bignumber.js';
import { ApproveWorkRequest, ApproveWorkResponse } from '../models';
import { BadRequest, InternalServerError } from 'ts-httpexceptions';
import { Server } from '../server';
import { config } from '../config';
import * as winston from 'winston';
import { DbService } from './DbService';
import { AccountLedgerImpl } from '../protocol/AccountLedgerImpl';
import { error } from 'util';

@Service()
export class EthService {
    private logger: winston.LoggerInstance = Server.logger;

    public w3: W3;

    // let's leak some memory and cache ledgers for each account
    // it will be nice if we really need to fix this before other issues
    // this doesn't store ledger state, just the objects
    private accountLedgers: any = {};

    public botAddress: string;
    private privateKey: string;

    public txParams: W3.TX.TxParams;

    public networkId: string;

    public accountManager: ACAccountManager;

    public token: PIERToken;

    public unlocked: boolean;

    public initialized: Promise<void>;

    public static getW3(): W3 {
        let provider: any;
        // console.log('NODE_ENV', process.env.NODE_ENV);
        if (process.env.NODE_ENV === 'test') {
            let ganache = require('ganache-cli');
            provider = ganache.provider({
                network_id: 314,
                accounts: [
                    { balance: '0xD3C21BCECCEDA1000000', secretKey: '0x' + testPrivateKeys[0] },
                    { balance: '0xD3C21BCECCEDA1000000', secretKey: '0x' + testPrivateKeys[1] },
                    { balance: '0xD3C21BCECCEDA1000000', secretKey: '0x' + testPrivateKeys[2] },
                    { balance: '0xD3C21BCECCEDA1000000', secretKey: '0x' + testPrivateKeys[3] },
                    { balance: '0xD3C21BCECCEDA1000000', secretKey: '0x' + testPrivateKeys[4] }
                ]
            });
        } else {
            provider = new W3.providers.HttpProvider(config.w3.provider);
        }
        let w3 = new W3(provider);
        W3.Default = w3;
        return w3;
    }

    constructor(private db: DbService) {
        this.initialized = this.init();
    }

    private async init() {
        try {
            this.w3 = EthService.getW3();
            this.networkId = await this.w3.networkId;
            if (this.networkId === '314') {
                // doesn't matter which one. TestRPC doesn't support importRawKey
                this.botAddress = testAccounts[1];
                this.privateKey = '0x' + testPrivateKeys[1];
                // must be set before contract creation or every contract call will need explicit txParams
                this.w3.defaultAccount = this.botAddress;

                // setup all contracts in TestRPC in memory
                let deployerPrivateKey =  '0x' + testPrivateKeys[0];
                this.txParams = W3.TX.txParamsDefaultDeploy(testAccounts[0]);

                let wallet = await MultiSigWallet.New(this.txParams, {
                    _owners: [testAccounts[0]],
                    _required: new BigNumber(1)
                }, this.w3, undefined, deployerPrivateKey);

                this.accountManager = await ACAccountManager.New(this.txParams, {_wallet: wallet.address}, this.w3, undefined, deployerPrivateKey);

                this.token = await PIERToken.New(this.txParams, {_owner: wallet.address, _accountManager: this.accountManager.address}, this.w3, undefined, deployerPrivateKey);

                await this.accountManager.setToken(this.token.address, this.txParams, deployerPrivateKey);

                let botData = await this.accountManager.enableBot.data(this.botAddress);
                await wallet.submitTransaction(this.accountManager.address, 0, botData, this.txParams, deployerPrivateKey);

                let mintAmountString = '1000000000000000000000000';
                let mintData = await this.token.mint.data(wallet.address, new BigNumber(mintAmountString));
                await wallet.submitTransaction(this.token.address, 0, mintData, this.txParams, deployerPrivateKey);

                let projectAmountString = '10000000000000000000000';

                let allowanceData = await this.token.transfer.data(this.accountManager.address, new BigNumber(projectAmountString));
                await wallet.submitTransaction(this.token.address, 0, allowanceData, this.txParams, deployerPrivateKey);

            } else {
                this.botAddress = await this.getBotAddress();
                // must be set before contract creation or every contract call will need explicit txParams
                this.w3.defaultAccount = this.botAddress;

                // helper to get right contracts for the given network id
                let contracts = await PIERContracts.Get(this.w3);
                this.token = await contracts.getToken();
                this.accountManager = await contracts.getAccountManager();

            }

            await this.db.initialized;

        } catch (e) {
            console.log('EthService init error: ', e);
            this.logger.error('EthService init error: ' + JSON.stringify(e));
        }
    }

    public generateUuid(): string {
        return uuid.v4();
    }

    private async getSecretMachineId() {
        // this could be the same for same virtual images, add locally stored uuid for security
        // const mId = this.getMachineUniqueId();
        const filepath = path.join(__dirname, '../../config/machine.key');

        if (fs.existsSync(filepath)) {
            return fs.readFileSync(filepath, { encoding: 'ascii' }).trim();
        }
        const id = this.generateUuid();
        fs.writeFileSync(filepath, id, { encoding: 'ascii' });
        return id;
    }

    private async getBotAddress(): Promise<string> {
        if (this.botAddress) {
            return this.botAddress;
        }

        let netId = await this.w3.networkId;
        const pass = await this.getSecretMachineId();
        const filepath = path.join(__dirname, '../../config/machineaccount.' + netId + '.key');

        let pkAddress = soltsice.getLocalPrivateKeyAndAddress(filepath, pass);

        this.privateKey = pkAddress.privateKey;
        this.botAddress = pkAddress.address;

        return pkAddress.address;
    }

    private getAccountLedger(address: string) {
        let ledger = this.accountLedgers[address];
        if (!ledger) {
            ledger = new AccountLedgerImpl(this.db, this, address);
            this.accountLedgers[address] = ledger;
        }
        return ledger as AccountLedgerImpl;
    }

    public async approveWorkAsync(request: ApproveWorkRequest): Promise<ApproveWorkResponse> {

        if (!request.workerAddress || !W3.isValidAddress(request.workerAddress)) {
            throw new BadRequest(JSON.stringify({ success: false, error: `Request workerAddress '${request.workerAddress}' is invalid.` }));
        }

        if (typeof request.amount !== 'number' || request.amount < 0 || request.amount > 10000000000) {
            throw new BadRequest(JSON.stringify({ success: false, error: `Request amount '${request.amount}' is invalid. Must be positive <= 10000000000` }));
        }

        if (!request.projectId) {
            throw new BadRequest(JSON.stringify({ success: false, error: `Request projectId '${request.projectId}' is invalid.` }));
        }

        if (request.rating && (request.rating < 0 || request.rating > 100)) {
            throw new BadRequest(JSON.stringify({ success: false, error: `Request rating '${request.rating}' is outside [0, 100] range.` }));
        }

        try {
            let ledger = this.getAccountLedger(request.workerAddress);
            let head = await ledger.getHead();

            let txHash: string;
            let tx: IAccountTransaction;

            // when amount = 0 do not apply any Tx, just calculate diff between head and anchor - that is the current balance on the platform
            if (request.amount > 0) {
                // no payload at the moment
                let payloadTmp: IHashable = { hash: W3.EthUtils.SHA3_NULL_S };

                let delta = new AccountStateDelta();
                delta.receiptId = head.id + 1;
                // request.amount MUST be in nanotokens
                delta.nanoTokens = request.amount;
                delta.rating = request.rating;
                delta.requiredMilliTokensStake = 0;
                delta.timeStamp = Math.floor(Date.now() / 1000);

                // this writes to DB but does not touch contracts
                tx = await ledger.applyTx(payloadTmp, delta);

                txHash = tx.hash;
            }

            let balance: number;

            let anchor = await ledger.getAnchor();

            // tslint:disable-next-line:prefer-conditional-expression
            if (anchor) {
                balance = head.accountState.nanoTokens + request.amount - anchor.accountState.nanoTokens;
            } else {
                balance = head.accountState.nanoTokens + request.amount;
            }

            let result = { success: true, txHash, balance: Math.floor(balance).toString() };

            // add the entire tx as a return field
            (result as any).tx = tx;

            return result;

        } catch (e) {
            this.logger.error(e.message);
            throw new InternalServerError(JSON.stringify({ success: false, error: e.message }));
        }
    }

    public async getLastReceiptAsync(workerAddress: string): Promise<WorkReceipt> {

        if (!workerAddress || !W3.isValidAddress(workerAddress)) {
            throw new BadRequest(JSON.stringify({ success: false, error: `Request workerAddress '${workerAddress}' is invalid.` }));
        }

        try {
            let ledger = this.getAccountLedger(workerAddress);
            let head = await ledger.getHead();

            if (!W3.isValidAddress(head.signer)) {
                throw new Error('Wrong signer: ' + JSON.stringify(head));
            }

            let receipt = ledger.generateSignedReceipt(head);

            if (receipt.isValid === false) {
                throw new Error('Receipt is invaid: ' + JSON.stringify(receipt));
            }

            return receipt;

        } catch (e) {
            this.logger.error(e.message);
            throw new InternalServerError(JSON.stringify({ success: false, error: e.message }));
        }
    }

    public async getCheckoutDataAsync(workerAddress: string): Promise<string> {

        if (!workerAddress || !W3.isValidAddress(workerAddress)) {
            throw new BadRequest(JSON.stringify({ success: false, error: `Request workerAddress '${workerAddress}' is invalid.` }));
        }

        try {
            let ledger = this.getAccountLedger(workerAddress);
            let head = await ledger.getHead();

            let receipt = ledger.generateSignedReceipt(head);

            let state = receipt.accountState;

            let txParams = W3.TX.txParamsDefaultSend(this.botAddress);
            txParams.gas = 500000;

            let checkoutData = await this.accountManager.checkoutReceipt.data(state.receiptId, state.timeStamp,
                state.nanoTokens, state.requiredMilliTokensStake, state.rating, state.ledgerHash, receipt.signature);

            return checkoutData;

        } catch (e) {
            this.logger.error(e.message);
            throw new InternalServerError(JSON.stringify({ success: false, error: e.message }));
        }
    }

    public async checkoutAccountAsync(workerAddress: string): Promise<string> {

        if (!workerAddress || !W3.isValidAddress(workerAddress)) {
            throw new BadRequest(JSON.stringify({ success: false, error: `Request workerAddress '${workerAddress}' is invalid.` }));
        }

        try {
            let ledger = this.getAccountLedger(workerAddress);
            let head = await ledger.getHead();

            let receipt = ledger.generateSignedReceipt(head);

            if (!receipt.isValid) {
                throw new Error('Receipt is not valid for head: ' + JSON.stringify(head));
            }

            let state = receipt.accountState;

            let txParams = W3.TX.txParamsDefaultSend(this.botAddress);
            txParams.gas = 100000;

            let checkoutTx = await this.accountManager.checkoutReceiptForAccount.sendTransaction.sendSigned(state.receiptId, state.timeStamp,
                state.nanoTokens, state.requiredMilliTokensStake, state.rating, state.ledgerHash, workerAddress, receipt.signature, this.privateKey, txParams);

            return checkoutTx;

        } catch (e) {
            this.logger.error(e.message);
            throw new InternalServerError(JSON.stringify({ success: false, error: e.message }));
        }
    }

    public sign(bytesHex: string): string {
        let hexSign = W3.sign(bytesHex, this.privateKey);
        return hexSign;
    }
}
