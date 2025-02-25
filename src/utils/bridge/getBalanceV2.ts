
import { useWeb3, getContract } from '../tools/web3UtilsV2'
import { useMulticall } from '../tools/multicall'
import {setLocalConfig, getLocalConfig, fromWei} from '../tools/tools'
// import config from '../../config'
import { isAddress } from '..'

import ERC20_INTERFACE from '../../constants/abis/erc20'

const erc20Contract = getContract()

const DESTBALANCE = 'DESTBALANCE'

export function getNodeBalance(account?:any, token?:string, chainID?:any, dec?:any, isNativeToken?:boolean) {
  return new Promise(resolve => {
    
    if (
      account
      && token
      && chainID
    ) {
      const lObj = getLocalConfig(account, token, chainID, DESTBALANCE, 1000 * 10)
      if (lObj && lObj.balance) {
        resolve(fromWei(lObj.balance, dec))
      } else {
        if (isNativeToken || !isAddress(token)) {
          useWeb3(chainID, 'eth', 'getBalance', [account]).then((res:any) => {
            // console.log(res)
            if (res && res.toString().indexOf('Error: Returned error') === -1) {
              const bl = res
              setLocalConfig(account, token, chainID, DESTBALANCE, {balance: bl})
              resolve(fromWei(bl, dec))
            } else {
              resolve('')
            }
          })
        } else {
          erc20Contract.options.address = token
          const data = erc20Contract.methods.balanceOf(account).encodeABI()
          useWeb3(chainID, 'eth', 'call', [{data, to: token}]).then((res:any) => {
            // console.log(res)
            if (res && res.toString().indexOf('Error: Returned error') === -1) {
              try {
                const bl = ERC20_INTERFACE?.decodeFunctionResult('balanceOf', res)?.toString()
                setLocalConfig(account, token, chainID, DESTBALANCE, {balance: bl})
                resolve(fromWei(bl, dec))
              } catch (error) {
                resolve('')
              }
            } else {
              resolve('')
            }
          })
        }
      }
    } else {
      resolve('')
    }
  })
}

const SRCTOTALSUPPLY = 'SRCTOTALSUPPLY'

export function getBlandTs(tokenList:any, chainId?:any, account?:string | null | undefined) {
  return new Promise(async(resolve) => {
    const len = tokenList.length
    const list:any = {}

    const arr:any = []

    for (let i = 0; i < len; i++) {
      const tokenObj = tokenList[i]
      if (tokenObj.underlying) {
        erc20Contract.options.address = tokenObj.underlying
        const tsData = erc20Contract.methods.balanceOf(tokenObj.token).encodeABI()
        arr.push({
          data: tsData,
          to: tokenObj.underlying,
          token: tokenObj.token,
          methods: 'balanceOf',
          key: 'ts',
          dec: tokenObj.dec
        })
      }

      if (isAddress(tokenObj.token)) {
        erc20Contract.options.address = tokenObj.token
        const tsData = erc20Contract.methods.totalSupply().encodeABI()
        arr.push({
          data: tsData,
          to: tokenObj.token,
          token: tokenObj.token,
          methods: 'totalSupply',
          key: 'anyts',
          dec: tokenObj.dec
        })
      }

      if (account) {
        if (isAddress(tokenObj.token)) {
          const blData = erc20Contract.methods.balanceOf(account).encodeABI()
          arr.push({
            data: blData,
            to: tokenObj.token,
            token: tokenObj.token,
            methods: 'balanceOf',
            key: 'balance',
            dec: tokenObj.dec
          })
        } else {
          arr.push({
            token: tokenObj.token,
            property: 'eth',
            methods: 'getBalance',
            inputFormatter: [account, 'latest'],
            key: 'balance',
            dec: tokenObj.dec
          })
        }
      }
    }
    
    useMulticall(chainId, arr).then((res:any) => {
      // console.log(res)
      if (res) {
        try {
          for (let i = 0, len = arr.length; i < len; i++) {
            if (res[i]) {
              const balance = ERC20_INTERFACE?.decodeFunctionResult('balanceOf', res[i])?.toString()

              if (!list[arr[i].token]) list[arr[i].token] = {}

              list[arr[i].token][arr[i].key] = fromWei(balance, arr[i].dec)
              list[arr[i].token][`wei_${arr[i].key}`] = balance.toString()
            }
          }
        } catch (error) {
          console.log(error)
        }
      }
      resolve(list)
    })
  })
}

export function getNodeTotalsupply(
  token?: string,
  chainId?: any,
  decimals?: any,
  account?: string | null | undefined,
  underlying?: string | undefined
) {
  return new Promise(resolve => {
    if (token && chainId) {
      const lObj = getLocalConfig(SRCTOTALSUPPLY, SRCTOTALSUPPLY, chainId, SRCTOTALSUPPLY, 1000 * 10)

      if (lObj && lObj.totalsupply) {
        resolve(lObj)
      } else {
        const tokenList = [
          {
            token,
            underlying,
            dec: decimals,
          }
        ]
        getBlandTs(tokenList, chainId, account).then((res: any) => {
          resolve(res)
        })
      }
    } else {
      resolve('')
    }
  })
}

export function getGroupTotalsupply (tokenList:any, chainId?:any, account?:string | null | undefined) {
  return new Promise(resolve => {
    // console.log(chainId)
    if (!chainId) resolve(false)
    else {
      const lData = getLocalConfig(SRCTOTALSUPPLY, SRCTOTALSUPPLY, chainId, SRCTOTALSUPPLY, 1000 * 10)
      // console.log(lData)
      // console.log(token)
      if (lData && lData.list) {
        resolve(lData.list)
      } else {
        getBlandTs(tokenList, chainId, account).then((res:any) => {
          // console.log(res)
          if (res) {
            setLocalConfig(SRCTOTALSUPPLY, SRCTOTALSUPPLY, chainId, SRCTOTALSUPPLY, {list: res})
          }
          resolve(res)
        })
      }
    }
  })
}
