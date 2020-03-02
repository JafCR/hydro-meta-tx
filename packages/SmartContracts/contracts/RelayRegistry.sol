pragma solidity 0.5.16;
/**
 * @title RelayRegistry
 * @dev Singleton contract that registers a whitelist of relays accessed by the factory and smart wallets. Contract is owned by an external account for now but ownership should be transferred to a governance contract in the future.
 */

import "./Ownable.sol";


contract RelayRegistry is Ownable {
    
    event AddedRelay(address relay);
    event RemovedRelay(address relay);
    
    mapping (address => bool) public relays;
    
    constructor(address initialRelay) public {
        relays[initialRelay] = true;
    }
    /**
     * @dev Allows relay registry owner to add or remove a relay from the whitelist
     * @param relay Address of the selected relay
     * @param value True to add them to the whitelist, false to remove them
     */
    function triggerRelay(address relay, bool value) onlyOwner public returns (bool) {
        relays[relay] = value;
        if(value) {
            emit AddedRelay(relay);
        } else {
            emit RemovedRelay(relay);
        }
        return true;
    }
    
}