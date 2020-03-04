pragma solidity 0.5.16;


/**
 * @title Proxy
 * @dev This contract is usually deployed as part of every user's first gasless transaction. 
 *      It refers to a hardcoded address of the smart wallet contract and uses its functions 
 *      via delegatecall.
 */
contract Proxy {
    
    /**
     * @dev Shared key value store. All data across different SmartWallet implementations is stored here. It also keeps storage across different upgrades.
     */
    mapping (bytes32 => bytes) public store;
    
    /**
     * @dev The Proxy constructor adds the hardcoded address of SmartWallet and the address of the factory (from msg.sender) to the store for later transactions
     */
    constructor(address _smartwallet) public {
        // set implementation address in storage
        store["fallback"] = abi.encode(_smartwallet); // SmartWallet address
        // set factory address in storage
        store["factory"] = abi.encode(msg.sender);
    }



    /**
     * @dev The fallback functions forwards everything as a delegatecall to the implementation SmartWallet contract
     */
    function() external payable {
        address impl = abi.decode(store["fallback"], (address));
        assembly {
          let ptr := mload(0x40)
        
          // (1) copy incoming call data
          calldatacopy(ptr, 0, calldatasize)
        
          // (2) forward call to logic contract
          let result := delegatecall(gas, impl, ptr, calldatasize, 0, 0)
          let size := returndatasize
        
          // (3) retrieve return data
          returndatacopy(ptr, 0, size)

          // (4) forward return data back to caller
          switch result
          case 0 { revert(ptr, size) }
          default { return(ptr, size) }
        }
    }
}