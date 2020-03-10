const RelayRegistry = artifacts.require("RelayRegistry");
const SmartWallet = artifacts.require('SmartWallet')
const Factory = artifacts.require('Factory')


module.exports = async function(deployer,network,accounts) {
    
  let from = deployer.networks[network].from
  await deployer.deploy(RelayRegistry,from);
  await deployer.deploy(SmartWallet)

  registry = await RelayRegistry.deployed()
  smartwallet = await SmartWallet.deployed()

  await deployer.deploy(Factory,registry.address,smartwallet.address)

};
                                                                                                   