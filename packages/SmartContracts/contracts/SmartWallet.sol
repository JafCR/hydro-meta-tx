pragma solidity 0.5.16;

import "./RelayRegistry.sol";
import "./IERC20.sol";

/**
 * @title Smart Wallet Contract
 * @dev All functions of this contract should be called using delegatecall from the Proxy contract. This allows us to significantly reduce the deployment costs of smart wallets. All functions of this contract are executed in the context of Proxy contract.
 */
contract SmartWallet {

    event Upgrade(address indexed newImplementation);
    event Paid(address from, address to, address tokenContract, uint value,uint fee);
    /**
     * @dev Shared key value store. Data should be encoded and decoded using abi.encode()/abi.decode() by different functions. No data is actually stored in SmartWallet, instead everything is stored in the Proxy contract's context.
     */
    mapping (bytes32 => bytes) public store;
    
    modifier onlyRelay {
        RelayRegistry registry = RelayRegistry(abi.decode(store["registry"],(address)));
        require(registry.relays(msg.sender));
        _;
    }
    
    modifier onlyOwner {
        require(msg.sender == abi.decode(store["factory"], (address)) || msg.sender == abi.decode(store["owner"], (address)));
        _;
    }
    
    function factory() public view returns(address) {
        return abi.decode(store["factory"],(address));
        // return store["factory"];

    }

    function registry() public view returns(address) {
        return abi.decode(store["registry"],(address));
        // return store["factory"];

    }

    /**
     * @dev Function called once by Factory contract to initiate owner and nonce. This is necessary because we cannot pass arguments to a CREATE2-created contract without changing its address.
     * @param owner Wallet Owner
     */
    function initiate(address owner, address _registry) public returns (bool) {
        // this function can only be called by the factory
        // address factory = abi.decode(store["factory"],(address));

        require(msg.sender == abi.decode(store["factory"],(address)),"Only factory can call this function");
        // store current owner in key store
        store["registry"] =  abi.encode(_registry);
        store["owner"] = abi.encode(owner);
        store["nonce"] = abi.encode(0);
        return true;
    }
    
    /**
     * @dev Same as above, but also applies a feee to a relayer address provided by the factory
     * @param owner Wallet Owner
     * @param relay Address of the relayer
     * @param fee Fee paid to relayer in a token
     * @param token Address of ERC20 contract in which fee will be denominated.
     */
    function initiate(address owner,address _registry, address relay, uint fee, address token) public returns (bool) {
        require(initiate(owner, _registry), "internal initiate failed");
        // Access ERC20 token
        IERC20 tokenContract = IERC20(token);
        // Send fee to relay
        tokenContract.transfer(relay, fee);
        return true;
    }
    
    /**
     * @dev Relayed token transfer. Submitted by a relayer on behalf of the wallet owner.
     * @param to Recipient address
     * @param value Transfer amount
     * @param fee Fee paid to the relayer
     * @param tokenContract Address of the token contract used for both the transfer and the fees
     * @param deadline Block number deadline for this signed message
     */
    function pay(address to, uint value, uint fee, address tokenContract, uint deadline, uint8 v, bytes32 r, bytes32 s) onlyRelay public returns (bool) {
        uint currentNonce = abi.decode(store["nonce"], (uint));
        require(block.number <= deadline);
        address signer = recover(keccak256(abi.encodePacked("pay", msg.sender, to, tokenContract, value, fee, tx.gasprice, currentNonce, deadline)), v, r, s);
        // emit Paid(signer,signer,msg.sender,currentNonce,fee);
        require(abi.decode(store["owner"], (address)) == signer,"Wrong signer");
        IERC20 token = IERC20(tokenContract);
        store["nonce"] = abi.encode(currentNonce+1);
        token.transfer(to, value);
        token.transfer(msg.sender, fee);
        emit Paid(signer,to,tokenContract,value,fee);
        return true;
    }
    
    /**
     * @dev Direct token transfer. Submitted by the wallet owner
     * @param to Recipient address
     * @param value Transfer amount
     * @param tokenContract Address of the token contract used for the transfer
     */
    function pay(address to, uint value, address tokenContract) onlyOwner public returns (bool) {
        IERC20 token = IERC20(tokenContract);
        token.transfer(to, value);
        return true;
    }
    
    /**
     * @dev Same as above but allows batched transfers in multiple tokens 
     */
    function pay(address[] memory to, uint[] memory value, address[] memory tokenContract) onlyOwner public returns (bool) {
        for (uint i; i < to.length; i++) {
            IERC20 token = IERC20(tokenContract[i]);
            token.transfer(to[i], value[i]);
        }
        return true;
    }
    
    /**
     * @dev Internal function that executes a call to any contract
     * @param contractAddress Address of the contract to call
     * @param data calldata to send to contractAddress
     * @param msgValue Amount in wei to be sent with the call to the contract from the wallet's balance
     */
    function _execCall(address contractAddress, bytes memory data, uint256 msgValue) internal returns (bool result) {
        // Warning: This executes an external contract call, may pose re-entrancy risk.
        assembly {
            result := call(gas, contractAddress, msgValue, add(data, 0x20), mload(data), 0, 0)
        }
    }

    /**
     * @dev Internal function that creates any contract
     * @param data bytecode of the new contract
     */
    function _execCreate(bytes memory data) internal returns (bool result) {
        address deployedContract;
        assembly {
            deployedContract := create(0, add(data, 0x20), mload(data))
        }
        result = (deployedContract != address(0));
    }
    
    /**
     * @dev Internal function that creates any contract using create2
     * @param data bytecode of the new contract
     * @param salt Create2 salt parameter
     */
    function _execCreate2(bytes memory data, uint256 salt) internal returns (bool result) {
        address deployedContract;
        assembly {
            deployedContract := create2(0, add(data, 0x20), mload(data), salt)
        }
        result = (deployedContract != address(0));
    }
    
    /**
     * @dev Public function that allows the owner to execute a call to any contract
     * @param contractAddress Address of the contract to call
     * @param data calldata to send to contractAddress
     * @param msgValue Amount in wei to be sent with the call to the contract from the wallet's balance
     */
    function execCall(address contractAddress, bytes memory data, uint256 msgValue) onlyOwner public returns (bool) {
        require(_execCall(contractAddress, data, msgValue));
        return true;
    }
    
    /**
     * @dev Public function that allows a relayer to execute a call to any contract on behalf of the owner
     * @param contractAddress Address of the contract to call
     * @param data calldata to send to contractAddress
     * @param msgValue Amount in wei to be sent with the call to the contract from the wallet's balance
     * @param fee Fee paid to the relayer
     * @param tokenContract Address of the token contract used for the fee
     * @param deadline Block number deadline for this signed message
     */
    function execCall(address contractAddress, bytes memory data,  uint256 msgValue, uint fee, address tokenContract, uint deadline, uint8 v, bytes32 r, bytes32 s) onlyRelay public returns (bool) {
        uint currentNonce = abi.decode(store["nonce"], (uint));
        require(block.number <= deadline);
        require(abi.decode(store["owner"], (address)) == recover(keccak256(abi.encodePacked("execCall", msg.sender, contractAddress, tokenContract, data, msgValue, fee, tx.gasprice, currentNonce, deadline)), v, r, s));
        IERC20 token = IERC20(tokenContract);
        store["nonce"] = abi.encode(currentNonce+1);
        token.transfer(msg.sender, fee);
        require(_execCall(contractAddress, data, msgValue));
        return true;
    }
    
    /**
     * @dev Public function that allows the owner to create any contract
     * @param data bytecode of the new contract
     */
    function execCreate(bytes memory data) onlyOwner public returns (bool) {
        require(_execCreate(data));
        return true;
    }
    
    /**
     * @dev Public function that allows a relayer to create any contract on behalf of the owner
     * @param data new contract bytecode
     * @param fee Fee paid to the relayer
     * @param tokenContract Address of the token contract used for the fee
     * @param deadline Block number deadline for this signed message
     */
    function execCreate(bytes memory data, uint fee, address tokenContract, uint deadline, uint8 v, bytes32 r, bytes32 s) onlyRelay public returns (bool) {
        uint currentNonce = abi.decode(store["nonce"], (uint));
        require(block.number <= deadline);
        require(abi.decode(store["owner"], (address)) == recover(keccak256(abi.encodePacked("execCreate", msg.sender, tokenContract, data, fee, tx.gasprice, currentNonce, deadline)), v, r, s));
        require(_execCreate(data));
        IERC20 token = IERC20(tokenContract);
        store["nonce"] = abi.encode(currentNonce+1);
        token.transfer(msg.sender, fee);
        return true;
    }
    
    /**
     * @dev Public function that allows the owner to create any contract using create2
     * @param data bytecode of the new contract
     * @param salt Create2 salt parameter
     */
    function execCreate2(bytes memory data, uint salt) onlyOwner public returns (bool) {
        require(_execCreate2(data, salt));
        return true;
    }
    
    /**
     * @dev Public function that allows a relayer to create any contract on behalf of the owner using create2
     * @param data new contract bytecode
     * @param salt Create2 salt parameter
     * @param fee Fee paid to the relayer
     * @param tokenContract Address of the token contract used for the fee
     * @param deadline Block number deadline for this signed message
     */
    function execCreate2(bytes memory data, uint salt, uint fee, address tokenContract, uint deadline, uint8 v, bytes32 r, bytes32 s) onlyRelay public returns (bool) {
        uint currentNonce = abi.decode(store["nonce"], (uint));
        require(block.number <= deadline);
        require(abi.decode(store["owner"], (address)) == recover(keccak256(abi.encodePacked("execCreate2", msg.sender, tokenContract, data, salt, fee, tx.gasprice, currentNonce, deadline)), v, r, s));
        require(_execCreate2(data, salt));
        IERC20 token = IERC20(tokenContract);
        store["nonce"] = abi.encode(currentNonce+1);
        token.transfer(msg.sender, fee);
        return true;
    }
    
    /**
     * @dev Since all eth transfers to this contract are redirected to the owner. This is the only way for anyone, including the owner, to keep ETH on this contract.
     */
    function depositEth() public payable {}
    
    /**
     * @dev Allows the owner to withdraw all ETH from the contract. 
     */
    function withdrawEth() public onlyOwner() {
        address payable owner = abi.decode(store["owner"], (address));
        owner.transfer(address(this).balance);
    }
    
    /**
     * @dev Allows a relayer to change the address of the smart wallet implementation contract on behalf of the owner. New contract should have its own upgradability logic or Proxy will be stuck on it.
     * @param implementation Address of the new implementation contract to replace this one.
     * @param fee Fee paid to the relayer
     * @param feeContract Address of the fee token contract
     * @param deadline Block number deadline for this signed message
     */
    function upgrade(address implementation, uint fee, address feeContract, uint deadline, uint8 v, bytes32 r, bytes32 s) onlyRelay public returns (bool) {
        uint currentNonce = abi.decode(store["nonce"], (uint));
        require(block.number <= deadline);
        address owner = abi.decode(store["owner"], (address));
        require(owner == recover(keccak256(abi.encodePacked("upgrade", msg.sender, implementation, feeContract, fee, tx.gasprice, currentNonce, deadline)), v, r, s));
        store["nonce"] = abi.encode(currentNonce+1);
        store["fallback"] = abi.encode(implementation);
        IERC20 feeToken = IERC20(feeContract);
        feeToken.transfer(msg.sender, fee);
        emit Upgrade(implementation);
        return true;
        
    }
    
    /**
     * @dev Same as above, but activated directly by the owner.
     * @param implementation Address of the new implementation contract to replace this one.
     */
    function upgrade(address implementation) onlyOwner public returns (bool) {
        store["fallback"] = abi.encode(implementation);
        emit Upgrade(implementation);
        return true;
    }
    
    /**
     * @dev Internal function used to prefix hashes to allow for compatibility with signers such as Metamask
     * @param messageHash Original hash
     */
    function recover(bytes32 messageHash, uint8 v, bytes32 r, bytes32 s) internal pure returns (address) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 prefixedMessageHash = keccak256(abi.encodePacked(prefix, messageHash));
        return ecrecover(prefixedMessageHash, v, r, s);
    }
    
}