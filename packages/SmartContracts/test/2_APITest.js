const axios = require('axios')

const relayAPI = axios.create({
    baseURL: 'http://localhost:4000',
    timeout: 30000,
  })


let request = { token: '0xF2cd21Db077Abbc3e6B503d978c828c7c012728a',
gasprice: '10000000000',
to: '0x3e3B49F87212A1f772D44e47F0Db067A2606A32c',
value: 100,
fee: '1000',
deadline: 800,
relayer: '0xdc5ceee4a36133a4b31285675545cd230b09a5c4',
factory: '0x04F172096c1Fb1c90eFdFdEA31b85eA4a2532a45',
sig:
 '0x44a22d06021632726102fe99db5ffea22e267218ed177f900665a41cf0924bf41bcec8c741ef60cb60c4546dcbdab56a7485dfb0b8bf7761b33ad31ab9d8eff11b' }

relayAPI.post('/deploySend', request)