// NB signing moved to Soltsice, this is old playground

import {
    DbrainGenesis, DbrainToken,
    MultiSigWallet, MultiSigWalletFactory, DbrainLibrary
} from '../contracts';
import { BigNumber } from 'bignumber.js';
import { W3, testAccounts, getStorage } from 'soltsice';
import { networks } from '../';
import { AccountState } from '../protocol/account';
import { Utils } from '../utils';

let w3 = new W3(new W3.providers.HttpProvider('http://localhost:8544'));
let activeAccount = '0xc08d5fe987c2338d28fd020b771a423b68e665e4';
w3.defaultAccount = activeAccount;
let utils = new Utils(activeAccount, w3);

let deployParams = W3.TX.txParamsDefaultDeploy(activeAccount);
let sendParams = W3.TX.txParamsDefaultSend(activeAccount);

beforeAll(async () => {
    await w3.unlockAccount(activeAccount, 'Ropsten1', 150000);
});

beforeEach(async () => {
    // Ropsten is SLOW compared to TestRPC
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;
    if ((await w3.networkId) !== '3') {
        console.log('NOT ON ROPSTEN');
    }
    expect((await w3.networkId)).toBe('3');
});

// These are legacy test when we used geth calls for signing.


xit('Genesis: Could recover signature from library', async () => {
    // !!!
    let store = await getStorage(w3, activeAccount);
    let libAddress = await store.getAddressValue(w3.web3.sha3('DbrainLibrary')); // '0x0'; //

    let library: DbrainLibrary;
    if (w3.toBigNumber(libAddress).toNumber() === 0) {
        console.log('TX PARAMS', deployParams);
        // gas 637274 as of 10/27
        library = await DbrainLibrary.At(deployParams, w3);
        let newAddrs = await library.address;
        await store.setAddressValue(w3.web3.sha3('DbrainLibrary'), newAddrs);
    } else {
        library = await DbrainLibrary.At(libAddress, w3);
    }
    libAddress = library.address;
    console.log('LIB ADDRESS', libAddress);

    let message = 'юникод sucks!';
    let rawMessage = W3.utf8ToHex(message, true);
    console.log('LENGTH', rawMessage.length / 2);
    console.log('RAW MESSAGE', rawMessage);

    let signature = await w3.signRaw('0x' + rawMessage, activeAccount, 'Ropsten1');
    console.log('SIGNATURE', signature);

    let prefix = '19457468657265756d205369676e6564204d6573736167653a0a'; // toHex('\x19Ethereum Signed Message:\n');

    let prefixedMessage =
        '0x' +
        prefix + W3.utf8ToHex((rawMessage.length / 2) + '', true)
        + W3.utf8ToHex(message, true);
    console.log('PREFIXED', prefixedMessage);

    let recovered = await library.recover(w3.web3.sha3(prefixedMessage, { encoding: 'hex' }), signature);

    // 0x3ef9a3d61fed6a33fff709f4d34ee92bffacc346e7e2233876018e2dde33faa8
    console.log('EXPECTED SHA', '0x8b15a88a4cbd9f0afa0f97f522c91cdd0fcc82f838548ff9fab26b405fb3913f');
    console.log('SHA', w3.web3.sha3('0x19457468657265756d205369676e6564204d6573736167653a0a3178', { encoding: 'hex' }));

    console.log('RECOVERED: ', recovered);
    expect(recovered).toBe(activeAccount);

});


xit('Genesis: Could use personal_recover from library', async () => {

    // gas 637274 as of 10/27
    let library = await utils.getDbrainLibrary();

    let message = 123;

    let rawMessage = W3.toHex(message, false, 256);
    console.log('RAW', rawMessage);

    let signature = await w3.signRaw(rawMessage, activeAccount, 'Ropsten1');
    console.log('SIGNATURE', signature);

    let recovered = await library.personalRecoverUint256(message, signature);

    let manualHash = w3.web3.sha3(rawMessage, { encoding: 'hex' });
    console.log('MANUAL HASH', manualHash);

    let solidityHash = await library.prefixedKeccak256(message);
    console.log('SOLIDITY HASH', solidityHash);

    // TODO hash with prefix
    // expect(manualHash).toBe(solidityHash);

    console.log('RECOVERED: ', recovered);
    expect(recovered).toBe(activeAccount);

    let rawMessage2 = W3.toHex(message, false) + W3.toHex(message, true);
    console.log('RAW 2', rawMessage2);
    let signature2 = await w3.signRaw(rawMessage2, activeAccount, 'Ropsten1');

    let manualHash2 = w3.web3.sha3(message, message);
    console.log('MANUAL HASH 2', manualHash2);

    let solidityHash2 = await library.prefixedKeccak256x2(message, message);
    console.log('SOLIDITY HASH 2', solidityHash2);

    // expect(manualHash2).toBe(solidityHash2);

    let recovered2 = await library.personalRecoverUint256x2(message, message, signature2);
    expect(recovered2).toBe(activeAccount);

    let rawMessage3 = W3.toHex(message, false) + W3.toHex(message, true) + W3.toHex(message, true);
    console.log('RAW 3', rawMessage2);
    let signature3 = await w3.signRaw(rawMessage3, activeAccount, 'Ropsten1');

    let manualHash3 = w3.web3.sha3(message, message, message);
    console.log('MANUAL HASH 3', manualHash2);

    let solidityHash3 = await library.prefixedKeccak256x3(message, message, message);
    console.log('SOLIDITY HASH 3', solidityHash2);

    // expect(manualHash3).toBe(solidityHash3);

    let recovered3 = await library.personalRecoverUint256x3(message, message, message, signature3);
    expect(recovered3).toBe(activeAccount);
});


xit('Genesis: Get prefix bytes', async () => {
    let store = await getStorage(w3, activeAccount);
    let utilsAddress = await store.getAddressValue(w3.web3.sha3('DbrainUtils'));

    let library: DbrainLibrary;
    if (w3.toBigNumber(utilsAddress).toNumber() === 0) {
        library = await DbrainLibrary.At(deployParams,  w3);
        let newAddrs = await library.address;
        await store.setAddressValue(w3.web3.sha3('DbrainUtils'), newAddrs);
    } else {
        library = await DbrainLibrary.At(utilsAddress, w3);
    }
    utilsAddress = await library.address;
    console.log('UTILS ADDRESS', utilsAddress);

    let message = 'My message юникод';
    let prefixedMessage = '\x19Ethereum Signed Message:\n' + message.length + message;
    let signature = await w3.sign(message, activeAccount, 'Ropsten1');
    console.log('SIGNATURE', signature);

    let recovered = await library.recover(w3.web3.sha3(prefixedMessage), signature);
    console.log('RECOVERED: ', recovered);
    expect(recovered).toBe(activeAccount);

});
