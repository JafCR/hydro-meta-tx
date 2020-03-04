pragma solidity 0.5.16;

import "../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";
import "../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";


contract TestERC20 is ERC20,ERC20Detailed,ERC20Mintable
{

    constructor() public 
    ERC20Detailed("Name", "Symbol",8) {

    }




}