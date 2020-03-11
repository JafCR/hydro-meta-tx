const Relayer = require('hydro-meta-tx').relayer
const PORT = 4000
let relayer = new Relayer()
let privateKey = '0x52cc5ff4d4278a74fd5b1405ef9d52a5ef9a7e215973b13f466267870c67287b'
relayer.start(PORT,privateKey)
