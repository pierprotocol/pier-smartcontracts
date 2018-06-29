pragma solidity ^0.4.21;

import './BurnableUpgradeableMintableToken.sol';

contract PPPToken is BurnableUpgradeableMintableToken {

    string public constant name = "PayPie";
    string public constant symbol = "PPP";
    uint public constant decimals = 18;
    uint public constant initialSupply = 165000000 * 10 ** 18;

    constructor (address _teamMultisigWallet) BurnableUpgradeableMintableToken (_teamMultisigWallet, name, symbol, initialSupply, decimals, false) public {
    }
}
