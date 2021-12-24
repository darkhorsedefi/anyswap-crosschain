import { TransactionResponse } from '@ethersproject/providers'
import { useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import axios from 'axios'

// import { useActiveWeb3React } from '../../hooks'
import { useActiveReact } from '../../hooks/useActiveReact'
import { AppDispatch, AppState } from '../index'
import { addTransaction } from './actions'
import { TransactionDetails } from './reducer'

import config from '../../config'

// 可以接受ether库事务响应并将其添加到事务列表的助手
export function useTransactionAdder(): (
  response: TransactionResponse,
  customData?: {
    summary?: string;
    approval?: { tokenAddress: string; spender: string };
    claim?: { recipient: string };
    value?: any;
    toChainId?: any;
    toAddress?: any;
    symbol?: any;
    version?: any;
    routerToken?: any;
  }
) => void {
  // const { chainId, account } = useActiveWeb3React()
  const { chainId, account } = useActiveReact()
  const dispatch = useDispatch<AppDispatch>()

  return useCallback(
    (
      response: TransactionResponse,
      {
        summary,
        approval,
        claim,
        value,
        toChainId,
        toAddress,
        symbol,
        version,
        routerToken,
      }: {
        summary?: string;
        claim?: { recipient: string };
        approval?: { tokenAddress: string; spender: string },
        value?: string,
        toChainId?: string,
        toAddress?: string,
        symbol?: string,
        version?: string,
        routerToken?: string,
      } = {}
    ) => {
      if (!account) return
      if (!chainId) return

      const { hash } = response
      if (!hash) {
        throw Error('No transaction hash found.')
      }
      dispatch(addTransaction({
        hash,
        from: account,
        chainId,
        approval,
        summary,
        claim,
        value,
        toChainId,
        toAddress,
        symbol,
        version,
        routerToken,
      }))
    },
    [dispatch, chainId, account]
  )
}

// 返回当前链的所有事务
export function useAllTransactions(): { [txHash: string]: TransactionDetails } {
  const { chainId } = useActiveReact()

  const state = useSelector<AppState, AppState['transactions']>(state => state.transactions)

  return chainId ? state[chainId] ?? {} : {}
}

export function useIsTransactionPending(transactionHash?: string): boolean {
  const transactions = useAllTransactions()

  if (!transactionHash || !transactions[transactionHash]) return false

  return !transactions[transactionHash].receipt
}

/**
 * 返回事务是否发生在最后一天(86400秒* 1000毫秒/秒)
 * @param tx to check for recency
 */
export function isTransactionRecent(tx: TransactionDetails): boolean {
  return new Date().getTime() - tx.addedTime < 86_400_000
}

// 返回令牌是否有未决的审批事务
export function useHasPendingApproval(tokenAddress: string | undefined, spender: string | undefined): boolean {
  const allTransactions = useAllTransactions()
  // console.log(allTransactions)
  return useMemo(
    () =>
      (typeof tokenAddress === 'string' || typeof tokenAddress === 'number') &&
      typeof spender === 'string' &&
      Object.keys(allTransactions).some(hash => {
        const tx = allTransactions[hash]
        if (!tx) return false
        if (tx.receipt) {
          return false
        } else {
          const approval = tx.approval
          if (!approval) return false
          return approval.spender === spender && approval.tokenAddress === tokenAddress && isTransactionRecent(tx)
        }
      }),
    [allTransactions, spender, tokenAddress]
  )
}

// 注意提交索赔
// 如果没有加载，返回null;如果没有找到，返回undefined
export function useUserHasSubmittedClaim(
  account?: string
): { claimSubmitted: boolean; claimTxn: TransactionDetails | undefined } {
  const allTransactions = useAllTransactions()

  // get the txn if it has been submitted
  const claimTxn = useMemo(() => {
    const txnIndex = Object.keys(allTransactions).find(hash => {
      const tx = allTransactions[hash]
      return tx.claim && tx.claim.recipient === account
    })
    return txnIndex && allTransactions[txnIndex] ? allTransactions[txnIndex] : undefined
  }, [account, allTransactions])

  return { claimSubmitted: Boolean(claimTxn), claimTxn }
}

export function useHashSwapInfo (hash:any) {
  return new Promise(resolve => {
    const url = `${config.bridgeApi}/v2/history/details?params=${hash}`
    axios.get(url).then(res => {
      const {status, data} = res
      if (status === 200) {
        resolve(data)
      } else {
        resolve('')
      }
    }).catch((err) => {
      console.log(err)
      resolve('')
    })
  })
}