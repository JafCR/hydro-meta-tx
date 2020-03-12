const TestERC20 = artifacts.require("TestERC20");


module.exports = async function(deployer,network,accounts) {
  await deployer.deploy(TestERC20);
};
                                                                                                   