pragma solidity ^0.4.21;

import './BurnableUpgradeableMintableToken.sol';

contract PLRToken is BurnableUpgradeableMintableToken {

    string public constant name = "Pillar";
    string public constant symbol = "PLR";
    uint public constant decimals = 18;
    uint public constant initialSupply = 800000000 * 10 ** 18;

    constructor (address _teamMultisigWallet) BurnableUpgradeableMintableToken (_teamMultisigWallet, name, symbol, initialSupply, decimals, false) public {
    }
}
