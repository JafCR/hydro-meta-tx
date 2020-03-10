import axios, { AxiosInstance } from 'axios'
import * as ethers from 'ethers'
import Wallet from './wallet'

ethers.errors.setLogLevel('error')

export default class MetaTx {
  options: any = {
  }

  wallet: Wallet | undefined

  relayAPI: AxiosInstance

  constructor(opts: object = {}) {
    this.options = Object.assign(this.options, opts)
    this.relayAPI = axios.create({
      baseURL: this.options.relayHost,
      timeout: 30000,
    })
  }

  get factoryAddress() {
    return this.options.factoryAddress
  }

  async createSmartWallet(password: string) {
    var account = ethers.Wallet.createRandom()
    var keystore = await account.encrypt(password)
    var smartWallet = new Wallet(this.options)
    let result = {
      keystore,
      smartWallet,
      account
    }
    await smartWallet.initKeyStore(keystore,password)
    return result
  }

  async importKeyStore(keystore: string, password: string) {
    var smartWallet = new Wallet(this.options)
    await smartWallet.initKeyStore(keystore,password)
    return smartWallet
  }

  async importPrivateKey(privateKey: string) {
    var smartWallet = new Wallet(this.options)
    await smartWallet.initPrivateKey(privateKey)
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
