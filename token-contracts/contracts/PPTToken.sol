pragma solidity ^0.4.18;

import './BurnableUpgradeableMintableToken.sol';

contract PPTToken is BurnableUpgradeableMintableToken {

    string public constant name = "Populous";
    string public constant symbol = "PPT";
    uint public constant decimals = 18;
    uint public constant initialSupply = 53252246 * 10 ** 18;

    constructor (address _teamMultisigWallet) BurnableUpgradeableMintableToken (_teamMultisigWallet, name, symbol, initialSupply, decimals, false) public {
    }
}
