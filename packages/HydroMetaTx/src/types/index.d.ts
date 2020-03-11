import * as ethers from 'ethers'

declare global {
    namespace Routes {
        interface TransferRequest {
            token: string
            to: string
            value: string
            fee: string
            gasprice: string
        }
    }
    namespace Wallet {
        interface Constructor {
            factoryAddress: string,
            relayHost: string,
            providerAddress: string
        }
    }

    namespace Hydro {
        interface Constructor {
            factoryAddress: string,
            relayHost: string,
            providerAddress: string
        }
    }
}