/**
 * @author  cpurta <cpurta@gmail.com>
 * @github https://github.com/cpurta/geth-devnet
 * This code comes from Christopher Purta's `geth-devnet` project.
 * geth --dev seeds with a single account so we need to spin
 * up more accounts and short-circuit account auto-locking to get multi-account
 * tests passing.
 */

// function createAccounts() {
//   for (var i = 0; i < 10; i++) {
//     acc = personal.newAccount('')
//     personal.unlockAccount(acc, '')
//     // eth.sendTransaction({
//     //   from: eth.accounts[0],
//     //   to: acc,
//     //   value: web3.toWei(1000, 'ether'),
//     // })
//   }
// }

function unlockAccounts() {
  eth.accounts.forEach(function (account) {
    console.log('Unlocking ' + account + '...')
    personal.unlockAccount(account, '', 86400)
  })
}

function setupDevNode() {
  // keep accounts unlocked
  while (true) {
    unlockAccounts()
  } 
}

// Add first account and set it as etherbase. Then start mining
// personal.importRawKey("52cc5ff4d4278a74fd5b1405ef9d52a5ef9a7e215973b13f466267870c67287b",'')
// miner.setEtherbase("0xdc5ceee4a36133a4b31285675545cd230b09a5c4")
// createAccounts()

// miner.start(1)
setupDevNode()
