pragma solidity ^0.4.18;

import './BurnableUpgradeableMintableToken.sol';

contract SALTToken is BurnableUpgradeableMintableToken {

    string public constant name = "SALT Lending Platform";
    string public constant symbol = "SALT";
    uint public constant decimals = 18;
    uint public constant initialSupply = 120000000 * 10 ** 18;

    constructor (address _teamMultisigWallet) BurnableUpgradeableMintableToken (_teamMultisigWallet, name, symbol, initialSupply, decimals, false) public {
    }
}
