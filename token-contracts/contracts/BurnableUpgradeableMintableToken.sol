pragma solidity ^0.4.21;

import "./BurnableToken.sol";
import './UpgradeableMintableToken.sol';

/**
 * @title Standard Burnable Token
 * @dev Adds burnFrom method to ERC20 implementations
 */
contract BurnableUpgradeableMintableToken is UpgradeableMintableToken, BurnableToken {

  constructor (address _teamMultisigWallet, string _name, string _symbol, uint _initialSupply, uint _decimals, bool _mintable) 
    UpgradeableMintableToken(_teamMultisigWallet, _name, _symbol, _initialSupply, _decimals, _mintable) public {}

  /**
   * @dev Burns a specific amount of tokens from the target address and decrements allowance
   * @param _from address The address which you want to send tokens from
   * @param _value uint256 The amount of token to be burned
   */
  function burnFrom(address _from, uint256 _value) public {
    require(_value <= allowed[_from][msg.sender]);
    // Should https://github.com/OpenZeppelin/zeppelin-solidity/issues/707 be accepted,
    // this function needs to emit an event with the updated approval.
    allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
    _burn(_from, _value);
  }
}