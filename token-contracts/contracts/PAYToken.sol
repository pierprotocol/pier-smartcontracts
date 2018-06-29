pragma solidity ^0.4.18;

import './BurnableUpgradeableMintableToken.sol';

contract PAYToken is BurnableUpgradeableMintableToken {

    string public constant name = "PayPie";
    string public constant symbol = "PAY";
    uint public constant decimals = 18;
    uint public constant initialSupply = 205218256 * 10 ** 18;

    constructor (address _teamMultisigWallet) BurnableUpgradeableMintableToken(_teamMultisigWallet, name, symbol, initialSupply, decimals, false) public {
    }
}
