import { DbrainToken } from '../contracts';
import { BigNumber } from 'bignumber.js';
// // import { DbrainGenesis } from '../contracts';
import { W3, TestRPC, testAccounts } from 'soltsice';
import * as ganache from 'ganache-cli';

let w3 = new W3(ganache.provider({
    mnemonic: 'dbrainio',
    network_id: 314
}));
W3.Default = w3;

// test network
let tn = new TestRPC(w3);

it('Should use web3 0.2 version', async () => {
    expect(w3.web3API.startsWith('0.20')).toBe(true);
});

xit('Should have accounts during test', async () => {
    if (await w3.networkId !== '1') {
        let accs = await w3.accounts;
        expect(accs.length).toBeGreaterThan(0);
        // console.log(await w3.version);
        // console.log('ACCOUNTS: ', await w3.accounts);
    }
});

xit('TestRPC: Could increase time', async () => {
    if (await w3.isTestRPC) {
        let result = await tn.increaseTime(2000);
        console.log('INCREASED TIME BY ', result);
    }
});

xit('TestRPC: Could get latest time and block, could advance time and block', async () => {
    if (await w3.isTestRPC) {

        let snapshot = await tn.snapshot();
        console.log('SNAPSHOT: ', snapshot);
        tn.mine();

        // await tn.revert(1);

        let lt = await w3.latestTime;

        console.log('LATEST TIME: ', new Date(lt * 1000));
        console.log('NOW: ', new Date(Date.now()));
        expect(lt).toBeLessThanOrEqual(Date.now());

        let block = await w3.blockNumber;
        console.log('BLOCK: ', block);

        await tn.advanceToBlock(block + 2);

        let block2 = await w3.blockNumber;

        expect(block2).toBe(block + 2);

        await tn.revert(snapshot);

        // let block3 = await w3.blockNumber;
        // expect(block3).toBeLessThan(block);

    } else {
        console.log('NOT ON TESTRPC');
    }
});

xit('Could create new account', async () => {
    if (await w3.networkId === '314') {
        let result = w3.web3.personal.newAccount('pass');
        expect(W3.isValidAddress(result)).toBe(true);
        console.log('RESULT: ', result);
    }
});
