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

    namespace Relayer {
        interface Constructor {
            port: number,
            privateKey: string,
            providerAddress: string
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
    namespace Logger {
        interface Options {
            directory: string,
            level: string,
            prefix: string
        }
    }
}