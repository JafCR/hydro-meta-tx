const ethers = require('ethers')

var pk = '0xcaed41dd92c1548cf7536c290e6a1871757fb5fea5721dea3a08c6d4abcd16cf'
let w = new ethers.Wallet(pk)

// Shorter than 32 bytes
pk = '0xcaed41dd92c1548cf7536c290e6a1871757fb5fea5721dea3a08c6d4abcd16'
// w = new ethers.Wallet(pk)

// Incorrect hexidecimal string. Change last f to g. G is not hex 

pk = '0xcaed41dd92c1548cf7536c290e6a1871757fb5fea5721dea3a08c6d4abcd16cg'
try {
    w = new ethers.Wallet(pk)
}
catch (e) {
    console.log('Invalid private key.')
}

