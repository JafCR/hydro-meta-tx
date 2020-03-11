import axios, { AxiosInstance } from 'axios'
import * as ethers from 'ethers'
import Wallet from './wallet'
const logger = require('./logger.js')
import * as Verify from './verify.js'

ethers.errors.setLogLevel('error')

export default class MetaTx {
  options: any = {}

  wallet: Wallet | undefined
  provider: ethers.providers.JsonRpcProvider
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
    this.provider = new ethers.providers.JsonRpcProvider(this.options.providerAddress!)
    logger.debug('New Hydro-Meta-Tx instance,', this.options)
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

    var account = ethers.Wallet.createRandom()
    var keystore = await account.encrypt(password)
    var smartWallet = new Wallet(this.options)
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
    await this.verifyFactory()
    var smartWallet = new Wallet(this.options)
    await smartWallet.initKeyStore(keystore, password)
    logger.debug('importKeyStore: ', { smartwallet: smartWallet.address, signer: smartWallet.signer })
    return smartWallet
  }

  async importPrivateKey(privateKey: string) {
    await this.verifyFactory()
    var smartWallet = new Wallet(this.options)
    await smartWallet.initPrivateKey(privateKey)
    logger.debug('improtPrivateKey: ', { smartwallet: smartWallet.address, signer: smartWallet.signer })
    return smartWallet
  }

  async importAccount(
    keystore: string,
    password: string,
  ): Promise<ethers.Wallet> {
    await this.verifyFactory()
    return await ethers.Wallet.fromEncryptedJson(keystore, password)
  }


  async createAccount(password: string) {
    var account = ethers.Wallet.createRandom()
    var keystore = await account.encrypt(password)
    let result = {
      keystore,
      account
    }
    await this.verifyFactory()
    return result
  }


}
