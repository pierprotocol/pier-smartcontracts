const MultiSigWalletWithDailyLimit = artifacts.require('./MultiSigWalletWithDailyLimit.sol')
const SafeMathLib = artifacts.require('./SafeMathLib.sol')
const TokenIterableMapping = artifacts.require('./TokenIterableMapping')
const PAYToken = artifacts.require('./PAYToken.sol')
const PLRToken = artifacts.require('./PLRToken.sol')
const PPPToken = artifacts.require('./PPPToken.sol')
const PPTToken = artifacts.require('./PPTToken.sol')
const SALTToken = artifacts.require('./SALTToken.sol')
const PIERToken = artifacts.require('./PIERToken.sol')

//@ts-check
module.exports = async function (deployer) {
    let wallet = await MultiSigWalletWithDailyLimit.deployed();
    console.log("MultiSigWallet has been deployed: " + wallet.address);

    console.log("Deploying SafeMathLib ...");
    await deployer.deploy(SafeMathLib);
    console.log("Deploying SafeMathLib started ...");
    let safeMathLib = await SafeMathLib.deployed();
    console.log("SafeMathLib has been deployed: " + safeMathLib.address);
    await deployer.link(SafeMathLib, PAYToken);
    await deployer.link(SafeMathLib, PLRToken);
    await deployer.link(SafeMathLib, PPPToken);
    await deployer.link(SafeMathLib, PPTToken);
    await deployer.link(SafeMathLib, SALTToken);
    await deployer.link(SafeMathLib, PIERToken);
    console.log("SafeMathLib has been linked");

    // Mapping library for (tokeName -> address) pairs 
    console.log("Deploying TokenIterableMapping ...");
    await deployer.deploy(TokenIterableMapping);
    console.log("Deploying TokenIterableMapping started ...");
    let tokenIterableMapping = await TokenIterableMapping.deployed();
    console.log("TokenIterableMapping has been deployed: " + tokenIterableMapping.address);
    await deployer.link(TokenIterableMapping, PIERToken);
    console.log("TokenIterableMapping has been linked");    


    // Example ERC20 tokens to be involved in the stable coin creating
    console.log("Deploying PAYToken ...");
    await deployer.deploy(PAYToken, wallet.address);
    console.log("Deploying PAYToken started ...");
    let payToken = await PAYToken.deployed();
    console.log("PAYToken has been deployed: " + payToken.address);
    console.log(payToken.logs);

    console.log("Deploying PLRToken ...");
    await deployer.deploy(PLRToken, wallet.address);
    console.log("Deploying PLRToken started ...");
    let plrToken = await PLRToken.deployed();
    console.log("PLRToken has been deployed: " + plrToken.address);
    console.log(plrToken.logs);

    console.log("Deploying PPPToken ...");
    await deployer.deploy(PPPToken, wallet.address);
    console.log("Deploying PPPToken started ...");
    let pppToken = await PPPToken.deployed();
    console.log("PPPToken has been deployed: " + pppToken.address);
    console.log(pppToken.logs);

    console.log("Deploying PPTToken ...");
    await deployer.deploy(PPTToken, wallet.address);
    console.log("Deploying PPTToken started ...");
    let pptToken = await PPTToken.deployed();
    console.log("PPTToken has been deployed: " + pptToken.address);
    console.log(pptToken.logs);

    console.log("Deploying SALTToken ...");
    await deployer.deploy(SALTToken, wallet.address);
    console.log("Deploying SALTToken started ...");
    let saltToken = await SALTToken.deployed();
    console.log("SALTToken has been deployed: " + saltToken.address);
    console.log(saltToken.logs);


    // Stable coin contract
    console.log("Deploying PIERToken ...");
    await deployer.deploy(PIERToken, wallet.address, 40 * 10 ** 18);
    console.log("Deploying PIERToken started ...");
    let pierToken = await PIERToken.deployed();
    console.log("PIERToken has been deployed: " + pierToken.address);
    console.log(pierToken.logs);


};
