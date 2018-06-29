pragma solidity ^0.4.21;

import './TokenIterableMapping.sol';
import './BurnableUpgradeableMintableToken.sol';

contract PIERToken is BurnableUpgradeableMintableToken {

    string public constant name = "PIER Stable Token";
    string public constant symbol = "PIER";
    uint   public constant decimals = 18;
    uint   public constant initialSupply = 1000000000 * 10 ** 18;

    // Expected PIERToken price (target - 0.4 USD)
    uint256 targetPrice;

    // Struct holding mapping with the list of involved ERC20 Tokens.
    TokenIterableMapping.itmap basketTokens;

    /*
     *  Events
     */
    event TokenAddedToBasket    (string indexed tokenSymbol, address indexed tokenContractAddress, uint256 price, uint256 amount);
    event TokenRemovedFromBasket(string indexed tokenSymbol);
    event TokenPriceChanged     (string indexed tokenSymbol, uint256 newPrice, uint256 newAmount, uint256 oldPrice, uint256 oldAmount);
    
    event PriceChanged(uint256 newPrice);
    event MintedExtra (uint256 amount, uint256 price);
    event BurnedExtra (uint256 amount, uint256 price);

    constructor (address _teamMultisigWallet, uint256 _targetPrice) BurnableUpgradeableMintableToken(_teamMultisigWallet, name, symbol, initialSupply, decimals, false) public {
        targetPrice = _targetPrice;
    }

    // Add a new ERC20 to the Basket
    function addTokenToBasket(string tokenSymbol, address tokenContractAddress, uint256 price, uint256 amount) public onlyOwner returns (uint size)
    {
        TokenIterableMapping.insert(basketTokens, tokenSymbol, tokenContractAddress, price, amount);
        emit TokenAddedToBasket(tokenSymbol, tokenContractAddress, price, amount);
        return basketTokens.size;
    }

    // Remove a ERC20 from the Basket
    function removeTokenFromBasket(string tokenSymbol) public onlyOwner returns (uint size)
    {
        TokenIterableMapping.remove(basketTokens, tokenSymbol);
        emit TokenRemovedFromBasket(tokenSymbol);
        return basketTokens.size;
    }

    function updateSymbolPrice(string _tokenSymbol, uint256 newPrice) public onlyOwner returns (uint256 tokenPrice)
    {
        var (symbol, erc20Address, price, amount) = TokenIterableMapping.get(basketTokens, _tokenSymbol);

        TokenIterableMapping.insert(basketTokens, _tokenSymbol, erc20Address, newPrice, amount);
        emit TokenPriceChanged(_tokenSymbol, newPrice, amount, price, amount);

        uint256 newTokenPrice = calculatePrice();
        emit PriceChanged(newTokenPrice);

        adjustTotalSupply(newTokenPrice);

        return newTokenPrice;
    }

    function calculatePrice() public view returns (uint256 tokenPrice)
    {
        uint256 total;
        for (var i = TokenIterableMapping.iterate_start(basketTokens); TokenIterableMapping.iterate_valid(basketTokens, i); i = TokenIterableMapping.iterate_next(basketTokens, i))
        {
            var (symbol, erc20Address, price, amount) = TokenIterableMapping.iterate_get(basketTokens, i);
            total += price.mul(amount);
        }
        return total.div(totalSupply());
    }

    function adjustTotalSupply(uint256 currentPrice) internal 
    {
        uint256 toBeMintedAmount = calculateMintRequired(currentPrice); 
        uint256 toBeBurnedAmount = calculateBurnRequired(currentPrice); 
        if (toBeMintedAmount > 0) {
            mint(owner, toBeMintedAmount);
            emit MintedExtra (toBeMintedAmount, currentPrice);
        }
        if (toBeBurnedAmount > 0) {
            burnFrom(owner, toBeBurnedAmount);
            emit BurnedExtra (toBeBurnedAmount, currentPrice);
        }
    }

    function calculateMintRequired(uint256 currentPrice) internal view returns (uint256 adjustmentAmount)
    {
        return 0; // TODO: Add calculation logic
    }

    function calculateBurnRequired(uint256 currentPrice) internal view returns (uint256 adjustmentAmount)
    {
        return 0; // TODO: Add calculation logic
    }
}
