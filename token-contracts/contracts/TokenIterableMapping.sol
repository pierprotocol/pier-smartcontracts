pragma solidity ^0.4.21;

/// @dev Models a uint -> uint mapping where it is possible to iterate over all keys.
library TokenIterableMapping
{
  struct itmap
  {
    mapping(string => IndexValue) data;
    KeyFlag[] keys;
    uint size;
  }

  struct IndexValue { uint keyIndex; address erc20Address; uint256 price; uint256 amount; }
  struct KeyFlag { string symbol; bool deleted; }
  
  function insert(itmap storage self, string symbol, address erc20Address, uint256 price, uint256 amount) public returns (bool replaced)
  {
    uint keyIndex = self.data[symbol].keyIndex;
    self.data[symbol].erc20Address = erc20Address;
    self.data[symbol].price = price;
    self.data[symbol].amount = amount;
    if (keyIndex > 0)
      return true;
    else
    {
      keyIndex = self.keys.length++;
      self.data[symbol].keyIndex = keyIndex + 1;
      self.keys[keyIndex].symbol = symbol;
      self.size++;
      return false;
    }
  }
  
  function remove(itmap storage self, string symbol) public returns (bool success)
  {
    uint keyIndex = self.data[symbol].keyIndex;
    if (keyIndex == 0)
      return false;
    delete self.data[symbol];
    self.keys[keyIndex - 1].deleted = true;
    self.size --;
  }

  function get(itmap storage self, string _symbol) view public returns (string symbol, address erc20Address, uint256 price, uint256 amount)
  {
    if (!contains(self, symbol)) 
        throw;
    symbol       = _symbol;
    erc20Address = self.data[_symbol].erc20Address;
    price        = self.data[_symbol].price;
    amount       = self.data[_symbol].amount;
  }
  
  function contains(itmap storage self, string symbol) view public returns (bool)
  {
    return self.data[symbol].keyIndex > 0;
  }
  
  function iterate_start(itmap storage self) view public returns (uint keyIndex)
  {
    return iterate_next(self, uint(-1));
  }
  
  function iterate_valid(itmap storage self, uint keyIndex) view public returns (bool)
  {
    return keyIndex < self.keys.length;
  }
  
  function iterate_next(itmap storage self, uint keyIndex) view public returns (uint r_keyIndex)
  {
    keyIndex++;
    while (keyIndex < self.keys.length && self.keys[keyIndex].deleted)
      keyIndex++;
    return keyIndex;
  }
  
  function iterate_get(itmap storage self, uint keyIndex) view public returns (string symbol, address erc20Address, uint256 price, uint256 amount)
  {
    return get(self, self.keys[keyIndex].symbol);
  }
}
