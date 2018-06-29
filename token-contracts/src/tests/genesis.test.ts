import { W3, testAccounts, testPrivateKeys, Storage, StorageFactory, TestRPC } from 'soltsice';
import { DbrainToken, MultiSigWallet, DbrainLibrary, DbrainAccountManager } from '../contracts';
import { DbrainContracts } from '../DbrainContracts';
import * as ganache from 'ganache-cli';
import { BigNumber } from 'bignumber.js';
import { networks } from '../';
import { Utils } from '../utils';
import { AccountLedgerMock } from '../protocol/account/AccountLedgerMock';
import { IHashable, Hash, IAccountTransaction, AccountState, AccountStateDelta, AccountTransaction } from '../protocol';

// Replace with Infura endpoint + key
// let w3 = new W3(new W3.providers.HttpProvider('https://[network].infura.io/[INFURA_KEY]'));

let w3: W3 = new W3(ganache.provider({
    mnemonic: 'dbrainio',
    network_id: 314
}));

// Change private key to one that have enough ether on a target network to deploy all contracts
let privateKey = '0x' + testPrivateKeys[0];


let activeAccount = W3.EthUtils.bufferToHex(W3.EthUtils.privateToAddress(W3.EthUtils.toBuffer(privateKey)));
w3.defaultAccount = activeAccount;
W3.Default = w3;

// UPDATE NONCE IN utils.ts FOR COMPLETE REDEPLOY
let utils = new Utils(activeAccount, w3, privateKey);

let log = console.log;

let deployParams = W3.TX.txParamsDefaultDeploy(activeAccount);
let sendParams = W3.TX.txParamsDefaultSend(activeAccount);

beforeEach(async () => {
    // Testnets are SLOW compared to TestRPC
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 36000000;
    if ((await w3.networkId) === '1') {
        console.log('NOT ON TESTNET');
    } else {
        deployParams.gasPrice = new BigNumber(50000000000);
        sendParams.gasPrice = new BigNumber(50000000000);
    }
    expect((await w3.networkId)).not.toBe('1');
});

afterEach(async () => {
    // if we mute console in some test then unmute it
    console.log = log;
});

let wallet: MultiSigWallet;
// let community: MultiSigWallet;
let accountManager: DbrainAccountManager;
let token: DbrainToken;


xit('Genesis: Could enable bot', async () => {
    wallet = await utils.getMultiSig({ _owners: [activeAccount], _required: 1 });
    accountManager = await utils.getDbrainAccountManager({ _wallet: wallet.address });

    let bot = '0xa92f0d2c6f867326067ac1f57cb3ca7447fb3521'; // VB local
    // let bot = '0xacd856813d2e0a8ab64ac706e3f2ec114de3f6b4'; // Azure sandbox
    let isBot = await accountManager.isBot(bot);
    if (!isBot) {
        let botData = await accountManager.enableBot.data(bot);
        let tx = await wallet.submitTransaction(accountManager.address, 0, botData, deployParams, privateKey);
        console.log('ENABLE BOT TX', tx);
        isBot = await accountManager.isBot(bot);
    }
    expect(isBot).toBe(true);
});

it('Genesis: Could deploy and setup Genesis', async () => {

    // 1. Deploy multisig + accountManager

    wallet = await utils.getMultiSig({ _owners: [activeAccount], _required: 1 });
    console.log('WALLET ADDRESS:', wallet.address);

    // 2. Create account manager

    accountManager = await utils.getDbrainAccountManager({ _wallet: wallet.address });
    console.log('AM ADDRESS: ', accountManager.address);

    expect(W3.isValidAddress(accountManager.address)).toBe(true);
    expect(W3.isValidAddress(await accountManager.wallet())).toBe(true);

    console.log('MSW', await accountManager.wallet());
    console.log('IsOwner', await accountManager.isOwner(activeAccount));

    wallet = await MultiSigWallet.At(await accountManager.wallet(), w3);


    // 3. Create token and set it address to AM
    token = await utils.getDbrainToken({ _owner: wallet.address, _accountManager: accountManager.address });

    console.log('TOKEN ADDRESS', token.address);

    let tokenOwner = await token.owner();
    expect(tokenOwner).toEqual(wallet.address);

    if (await accountManager.token() === W3.zeroAddress) {
        console.log('IS OWNER', await accountManager.isOwner(activeAccount));
        let tx = await accountManager.setToken(token.address, deployParams, privateKey);
        console.log('ACCOUNT MANAGER TX', tx);
    }

    expect(await accountManager.token()).toBe(token.address);

    let isBot = await accountManager.isBot(activeAccount);
    if (!isBot) {
        let botData = await accountManager.enableBot.data(activeAccount);
        let tx = await wallet.submitTransaction(accountManager.address, 0, botData, deployParams, privateKey);
        console.log('ENABLE BOT TX', tx);
        isBot = await accountManager.isBot(activeAccount);
    }1
    expect(isBot).toBe(true);

});

it('Genesis: Could mint tokens to self', async () => {

    // MultiSig is the owner of the token, it could mint and finalize minting

    let tokenAddress = await accountManager.token();
    console.log('TOKEN ADDRESS: ', tokenAddress);
    token = await DbrainToken.At(tokenAddress, w3);

    console.log('BUYER: ', wallet.address);

    let balance = await token.balanceOf(wallet.address);
    console.log('BALANCE: ', balance.toNumber());
    if (balance.toNumber() === 0) {

        let mintAmountString = '1000000000000000000000000';

        let mintData = await token.mint.data(wallet.address, new BigNumber(mintAmountString));
        let tx = await wallet.submitTransaction(token.address, 0, mintData, deployParams, privateKey);
        console.log('MINT TX', tx);
        balance = await token.balanceOf(wallet.address);

        expect(balance).toEqual(new BigNumber(mintAmountString));
    }

    console.log('BALANCE: ', balance.toNumber());
    expect(balance.toNumber()).toBeGreaterThan(0);

    let purchasers = await token.SHARE_PURCHASERS();
    let team = await token.SHARE_TEAM();
    let community = await token.SHARE_COMMUNITY();
    expect(purchasers.add(team).add(community)).toEqual(new BigNumber(100));

    let setCommunityData = await token.setCommunityAddress.data(wallet.address);
    let tx = await wallet.submitTransaction(token.address, 0, setCommunityData, deployParams, privateKey);
    console.log('SET COMMUNITY TX', tx);
    expect(wallet.address).toEqual(await token.community());

    let finishMintData = await token.finishMinting.data();
    let tx1 = await wallet.submitTransaction(token.address, 0, finishMintData, deployParams, privateKey);
    console.log('FINISH MINT TX', tx1);
    let finalizedBalance = await token.balanceOf(wallet.address);

    let onePercent = balance.div(purchasers).round(0, BigNumber.ROUND_DOWN); // int division

    let finTotalSupply = await token.totalSupply();
    console.log('FIN TOTAL SUPPLY:', finTotalSupply.toFormat());

    expect(await token.totalSupply()).toEqual(balance.add(onePercent.mul(team.add(community))));

    console.log('FIN BALANCE::', finalizedBalance.toFormat());
    let roundingDiff = finTotalSupply.sub(onePercent.mul(purchasers.add(team).add(community))).toNumber();
    console.log('DIFF:', roundingDiff);

    expect(roundingDiff).toBeLessThan(purchasers.toNumber());

    expect(finalizedBalance).toEqual(balance.add(onePercent.mul(team.add(community).sub(1))));
});

it('Genesis: Could create community project', async () => {

    // TODO (DBR) for DBR0 multisig is community
    let community = wallet;

    let amBalance = await token.balanceOf(accountManager.address);

    if (amBalance.toNumber() === 0) {
        let projectAmountString = '10000000000000000000000';

        let allowanceData = await token.approve.data(accountManager.address, new BigNumber(projectAmountString));
        let tx = await community.submitTransaction(token.address, 0, allowanceData, deployParams, privateKey);
        console.log('APPROVE TX', tx);
        let data = await accountManager.depositTokens.data(new BigNumber(projectAmountString));
        let tx1 = await community.submitTransaction(accountManager.address, 0, data, deployParams, privateKey)
        console.log('DEPOSIT TOKENS TX', tx1);
    }
    amBalance = await token.balanceOf(accountManager.address);
    expect(amBalance.toNumber()).toBeGreaterThan(0);
    console.log('AM BALANCE', amBalance.toFormat());

});

it('Genesis: Could apply tx to account ledger', async () => {

    let testRPC = new TestRPC(w3);

    // TODO (DBC1) for DBC0 multisig is community
    let community = wallet;

    // let dbrain = await DbrainContracts.Get(w3);
    // let am = await dbrain.getAccountManager();
    let ledger = new AccountLedgerMock(activeAccount, accountManager);
    // console.log('LEDGER', ledger);
    let hashable: IHashable = { hash: W3.EthUtils.SHA3_NULL_S };

    let count = 5;
    for (var i = 1; i <= count; i++) {

        let now = await w3.latestTime;

        let params = AccountState.fromContract(activeAccount, await accountManager.currentAccountStateForAddress(activeAccount));
        console.log('ACC PARAMS', params);

        let delta = new AccountStateDelta();
        delta.receiptId = ledger.txArray.length;
        delta.nanoTokens = i; // 0.01 token = 1e7
        delta.rating = 60;
        delta.requiredMilliTokensStake = 0;
        delta.timeStamp = now - 1; // Math.floor(Date.now() / 1000) - 61 * 60 * 24 * (count - i);

        let tx = await ledger.applyTx(hashable, delta);
        expect(AccountTransaction.isValid(tx)).toBe(true);
        console.log('RESULT', tx);
        let receipt = ledger.generateSignedReceipt(tx);
        console.log('RECEIPT', receipt);
        expect(receipt.isValid).toBe(true);

        let library = await utils.getDbrainLibrary();

        // This is how to checkout a receipt
        let state = receipt.accountState;
        let recovered = await library.personalRecoverAccountStateWithHash(state.receiptId, state.timeStamp,
            state.nanoTokens, state.requiredMilliTokensStake, state.rating, state.ledgerHash, activeAccount, receipt.signature);

        console.log('LIB RECOVERED', recovered);
        console.log('SIGNER', receipt.signer);
        expect(recovered).toBe(receipt.signer);

        let isBot = await accountManager.isBot(receipt.signer);
        if (!isBot) {
            let botData = await accountManager.enableBot.data(receipt.signer);
            let tx = await wallet.submitTransaction(accountManager.address, 0, botData, deployParams, privateKey);
            isBot = await accountManager.isBot(receipt.signer);
        }
        expect(isBot).toBe(true);

        let paused = await accountManager.paused();
        expect(paused).toBe(false);

        let amBalance = await token.balanceOf(accountManager.address);
        console.log('AM BALANCE', amBalance.toNumber());

        // let checkoutTx = await accountManager.checkoutReceipt(state.receiptId, state.timeStamp,
        //     state.nanoTokens, state.reserved, state.requiredMilliTokensStake, state.packedRatings, state.ledgerHash, receipt.signature, deployParams);
        // console.log('CHECKOUT TX', checkoutTx);

        let checkoutTx = await accountManager.checkoutReceiptForAccount(state.receiptId, state.timeStamp,
            state.nanoTokens, state.requiredMilliTokensStake, state.rating, state.ledgerHash, activeAccount, receipt.signature, deployParams, privateKey);
        console.log('CHECKOUT TX', checkoutTx);

        if (await w3.networkId === '314') {
            await testRPC.increaseTime(61 * 60);
        } else {
            return;
        }
    }
});
