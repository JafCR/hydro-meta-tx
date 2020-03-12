import axios, { AxiosInstance } from 'axios'
import * as ethers from 'ethers'
import Wallet from './wallet'
const Logger = require('./logger.js')
import * as Verify from './verify.js'

const logger = new Logger().getLogger()

ethers.errors.setLogLevel('error')

export default class MetaTx {
  options: any = {}

  wallet: Wallet | undefined
  provider: any
  relayAPI: AxiosInstance

  constructor(opts: Hydro.Constructor) {
    if (!Verify.hydroConstructor(opts)) {
      throw('Invalid Hydro Constructor parameters')
    }
    this.options = Object.assign(this.options, opts)
    this.relayAPI = axios.create({
      baseURL: this.options.relayHost,
      timeout: 30000,
    })
    logger.debug('New Hydro-Meta-Tx instance,', this.options)
  }

  async getProvider({providerAddress,infuraNetwork,infuraAccessToken}):Promise<any> {
    var provider:any 
    if(infuraNetwork) {
        provider = new ethers.providers.InfuraProvider(infuraNetwork,infuraAccessToken)
    }
    else {
        provider = new ethers.providers.JsonRpcProvider(providerAddress)
    }
    
    let network = await provider.getNetwork()
    return provider
}
  get factoryAddress() {
    return this.options.factoryAddress
  }

  async verifyFactory(): Promise<boolean> {

    try {
      let blockNumber = await this.provider.getBlockNumber()
    }
    catch (e) {
      logger.fatal('Provider error: ', this.options.providerAddress, e)
      throw ('Provider error: ' + this.options.providerAddress)
    }

    var code
    try {
      code = await this.provider.getCode(this.options.factoryAddress)
    }
    catch (e) {
      logger.fatal('Wrong factory address: ', this.options.factoryAddress, e)
      throw ('Wrong factory address: ' + this.options.factoryAddress)
    }
    if (code == '0x') {
      logger.fatal('Factory code: ', code, ' Factory does not exist: ', this.options.factoryAddress)
      throw ('This is not a smart contract. Factory does not exist: ' + this.options.factoryAddress)
    }
    return true
  }

  async createSmartWallet(password: string) {
    await this.verifyFactory()

    this.provider = await this.getProvider({providerAddress:this.options.providerAddress,infuraNetwork:this.options.infuraNetwork,infuraAccessToken:this.options.infuraAccessToken})
    var account = ethers.Wallet.createRandom()
    var keystore = await account.encrypt(password)
    var smartWallet = new Wallet(this.options,this.provider)
    let result = {
      keystore,
      smartWallet,
      account
    }
    await smartWallet.initKeyStore(keystore, password)
    logger.debug('CreateSmartWallet: ', result)
    return result
  }

  async importKeyStore(keystore: string, password: string) {
    this.provider = await this.getProvider({providerAddress:this.options.providerAddress,infuraNetwork:this.options.infuraNetwork,infuraAccessToken:this.options.infuraAccessToken})
    await this.verifyFactory()
    var smartWallet = new Wallet(this.options,this.provider)
    await smartWallet.initKeyStore(keystore, password)
    logger.debug('importKeyStore: ', { smartwallet: smartWallet.address, signer: smartWallet.signer })
    return smartWallet
  }

  async importPrivateKey(privateKey: string) {
    this.provider = await this.getProvider({providerAddress:this.options.providerAddress,infuraNetwork:this.options.infuraNetwork,infuraAccessToken:this.options.infuraAccessToken})
    await this.verifyFactory()
    var smartWallet = new Wallet(this.options,this.provider)
    await smartWallet.initPrivateKey(privateKey)
    logger.debug('improtPrivateKey: ', { smartwallet: smartWallet.address, signer: smartWallet.signer })
    return smartWallet
  }

  async importAccount(
    keystore: string,
    password: string,
  ): Promise<ethers.Wallet> {
    return await ethers.Wallet.fromEncryptedJson(keystore, password)
  }


  async createAccount(password: string) {
    var account = ethers.Wallet.createRandom()
    var keystore = await account.encrypt(password)
    let result = {
      keystore,
      account
    }
    return result
  }


}
