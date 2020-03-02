pragma solidity 0.5.16;


import "./RelayRegistry.sol";
import "./SmartWallet.sol";
import "./Proxy.sol";

/**
 * @title Smart wallet factory
 * @dev Singleton contract responsible for deploying new smart wallet instances
 */
contract Factory {
    
    event Deployed(address indexed addr, address indexed owner);
    RelayRegistry public registry;
    address public swTemplate;

    constructor(address _registry, address _swTemplate) public
    {
        registry = RelayRegistry(_registry);
        swTemplate = _swTemplate;
    }

    modifier onlyRelay {
        require(registry.relays(msg.sender));
        _;
    }

    /**
     * @dev Internal function used for deploying smart wallets using create2
     * @param owner Address of the wallet signer address (external account) associated with the smart wallet
     */
    function deployCreate2(address owner) internal returns (address) {
        bytes memory code = type(Proxy).creationCode;
        code = abi.encodePacked(code,abi.encode(swTemplate));
        address addr;
        assembly {
            // create2
            addr := create2(0, add(code, 0x20), mload(code), owner)
            // revert if contract was not created
            if iszero(extcodesize(addr)) {revert(0, 0)}
        }
        return addr;
    }

    /**
     * @dev Allows a relayer to deploy a smart wallet on behalf of a user
     * @param fee Fee paid from the user's newly deployed smart wallet to the relay
     * @param token Address of token contract for the fee
     * @param deadline Block number deadline for this signed message
     */
    function deployWallet(uint fee, address token, uint deadline, uint8 v, bytes32 r, bytes32 s) onlyRelay public returns (address) {
        require(block.number <= deadline);
        address signer = recover(keccak256(abi.encodePacked("deployWallet", msg.sender, token, tx.gasprice, fee, deadline)), v, r, s);
        address addr = deployCreate2(signer);
        SmartWallet wallet = SmartWallet(uint160(addr));
        require(wallet.initiate(signer,address(registry), msg.sender, fee, token));
        emit Deployed(addr, signer);
        return addr;
    }
    
    /**
     * @dev Allows a relayer to deploy a smart wallet and send a token transfer on behalf of a user
     * @param fee Fee paid from the user's newly deployed smart wallet to the relay
     * @param token Address of token contract for the fee
     * @param to Transfer recipient address
     * @param value Transfer amount
     * @param deadline Block number deadline for this signed message
     */
    function deployWalletPay(uint fee, address token, address to, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) onlyRelay public returns (address addr) {
        require(block.number <= deadline);
        address signer = recover(keccak256(abi.encodePacked("deployWalletPay", msg.sender, token, to, tx.gasprice, fee, value, deadline)), v, r, s);
        addr = deployCreate2(signer);
        SmartWallet wallet = SmartWallet(uint160(addr));
        require(wallet.initiate(signer,address(registry), msg.sender, fee, token));
        require(wallet.pay(to, value, token));
        emit Deployed(addr, signer);
    }
    
    /**
     * @dev Allows a user to directly deploy their own smart wallet
     */
    function deployWallet() public returns (address) {
        address addr = deployCreate2(msg.sender);
        SmartWallet wallet = SmartWallet(uint160(addr));
        require(wallet.initiate(msg.sender, address(registry)));
        emit Deployed(addr, msg.sender);
        return addr;
    }
    
    /**
     * @dev Same as above, but also sends a transfer from the newly-deployed smart wallet
     * @param token Address of the token contract for the transfer
     * @param to Transfer recipient address
     * @param value Transfer amount
     */
    function deployWalletPay(address token, address to, uint value) public returns (address) {
        address addr = deployCreate2(msg.sender);
        SmartWallet wallet = SmartWallet(uint160(addr));
        require(wallet.pay(to, value, token));
        require(wallet.initiate(msg.sender,address(registry)));
        emit Deployed(addr, msg.sender);
        return addr;
    }
    
    /**
     * @dev Allows user to deploy their wallet and execute a call operation to a foreign contract.
     * @notice The order of wallet.execCall & wallet.initiate is important. It allows the fee to be paid after the execution is finished. This allows collect-call use cases.
     * @param contractAddress Address of the contract to call
     * @param data calldata to send to contractAddress
     */
    function deployWalletExecCall(address contractAddress, bytes memory data) public payable returns (address) {
        address addr = deployCreate2(msg.sender);
        SmartWallet wallet = SmartWallet(uint160(addr));
        if(msg.value > 0) {
            wallet.depositEth.value(msg.value)();
        }
        require(wallet.execCall(contractAddress, data, msg.value));
        require(wallet.initiate(msg.sender,address(registry)));
        emit Deployed(addr, msg.sender);
        return addr;
    }
    
    /**
     * @dev Allows a relayer to deploy a wallet and execute a call operation to a foreign contract on behalf of a user.
     * @param contractAddress Address of the contract to call
     * @param data calldata to send to contractAddress
     * @param msgValue Amount in wei to be sent with the call to the contract from the wallet's balance
     * @param fee Fee paid to the relayer
     * @param token Address of the token contract for the fee
     * @param deadline Block number deadline for this signed message
     */
    function deployWalletExecCall(address contractAddress, bytes memory data, uint msgValue, uint fee, address token, uint deadline, uint8 v, bytes32 r, bytes32 s) onlyRelay public returns (address addr) {
        require(block.number <= deadline);
        address signer = recover(keccak256(abi.encodePacked("deployWalletExecCall", msg.sender, token, contractAddress, data, msgValue, tx.gasprice, fee, deadline)), v, r, s);
        addr = deployCreate2(signer);
        SmartWallet wallet = SmartWallet(uint160(addr));
        require(wallet.execCall(contractAddress, data, msgValue));
        require(wallet.initiate(signer,address(registry), msg.sender, fee, token));
        emit Deployed(addr, signer);
    }
    
    /**
     * @dev Allows user to deploy their wallet and deploy a new contract through their wallet
     * @param data bytecode of the new contract
     */
    function deployWalletExecCreate(bytes memory data) public returns (address) {
        address addr = deployCreate2(msg.sender);
        SmartWallet wallet = SmartWallet(uint160(addr));
        require(wallet.execCreate(data));
        require(wallet.initiate(msg.sender, address (registry)));
        emit Deployed(addr, msg.sender);
        return addr;
    }
    
    /**
     * @dev Allows a relayer to deploy a wallet and deploy a new contract through the wallet on behalf of a user.
     * @param data bytecode of the new contract
     * @param fee Fee paid to the relayer
     * @param token Address of the token contract for the fee
     * @param deadline Block number deadline for this signed message
     */
    function deployWalletExecCreate(bytes memory data, uint fee, address token, uint deadline, uint8 v, bytes32 r, bytes32 s) onlyRelay public returns (address addr) {
        require(block.number <= deadline);
        address signer = recover(keccak256(abi.encodePacked("deployWalletExecCreate", msg.sender, token, data, tx.gasprice, fee, deadline)), v, r, s);
        addr = deployCreate2(signer);
        SmartWallet wallet = SmartWallet(uint160(addr));
        require(wallet.execCreate(data));
        require(wallet.initiate(signer,address(registry), msg.sender, fee, token));
        emit Deployed(addr, signer);
    }
    
    /**
     * @dev Allows user to deploy their wallet and deploy a new contract through their wallet using create2
     * @param data bytecode of the new contract
     * @param salt create2 salt parameter
     */
    function deployWalletExecCreate2(bytes memory data, uint salt) public returns (address) {
        address addr = deployCreate2(msg.sender);
        SmartWallet wallet = SmartWallet(uint160(addr));
        require(wallet.execCreate2(data, salt));
        require(wallet.initiate(msg.sender,address(registry)));
        emit Deployed(addr, msg.sender);
        return addr;
    }
    
    /**
     * @dev Allows a relayer to deploy a wallet and deploy a new contract through the wallet using create2 on behalf of a user.
     * @param data bytecode of the new contract
     * @param salt create2 salt parameter
     * @param fee Fee paid to the relayer
     * @param token Address of the token contract for the fee
     * @param deadline Block number deadline for this signed message
     */
    function deployWalletExecCreate2(bytes memory data, uint salt, uint fee, address token, uint deadline, uint8 v, bytes32 r, bytes32 s) onlyRelay public returns (address addr) {
        require(block.number <= deadline);
        address signer = recover(keccak256(abi.encodePacked("deployWalletExecCreate2", msg.sender, token, data, tx.gasprice, salt, fee, deadline)), v, r, s);
        addr = deployCreate2(signer);
        SmartWallet wallet = SmartWallet(uint160(addr));
        require(wallet.execCreate2(data, salt));
        require(wallet.initiate(signer,address(registry), msg.sender, fee, token));
        emit Deployed(addr, signer);
    }

    /**
     * @dev Utility view function that allows clients to fetch a smart wallet address of any signer address
     * @param owner Signer address
     */
    function getCreate2Address(address owner) public view returns (address) {
        bytes32 temp = keccak256(abi.encodePacked(bytes1(0xff), address(this), uint(owner), bytes32(keccak256(type(Proxy).creationCode))));
        address ret;
        uint mask = 2 ** 160 - 1;
        assembly {
            ret := and(temp, mask)
        }
        return ret;
    }
    
    /**
     * @dev Utility view function that allows clients to fetch own smart wallet address
     */
    function getCreate2Address() public view returns (address) {
        return getCreate2Address(msg.sender);
    }
    
    /**
     * @dev Utility view function that allows clients to query whether a signer's smart wallet can be deployed or has already been
     * @param owner Signer address
     */
    function canDeploy(address owner) public view returns (bool inexistent) {
        address wallet = getCreate2Address(owner);
        assembly {
            inexistent := eq(extcodesize(wallet), 0)
        }
    }
    
    /**
     * @dev Utility view function that allows clients to query whether their signer's smart wallet can be deployed or has already been
     */
    function canDeploy() public view returns (bool) {
        return canDeploy(msg.sender);
    }
    
    /**
     * @dev Internal function used to prefix hashes to allow for compatibility with signers such as Metamask
     * @param messageHash Original hash
     */
    function recover(bytes32 messageHash, uint8 v, bytes32 r, bytes32 s) internal pure returns (address) {
        bytes memory prefix = "\x19Metacash Signed Message:\n32";
        bytes32 prefixedMessageHash = keccak256(abi.encodePacked(prefix, messageHash));
        return ecrecover(prefixedMessageHash, v, r, s);
    }

}
