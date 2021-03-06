import { useEffect } from 'react'
import BN from 'bn.js'
import { assert } from '@gnosis.pm/dex-js'

import { tokenListApi, erc20Api, depositApi } from 'api'

import useSafeState from './useSafeState'
import { useWalletConnection } from './useWalletConnection'

import { formatAmount, logDebug } from 'utils'
import { ALLOWANCE_FOR_ENABLED_TOKEN } from 'const'
import { TokenBalanceDetails, TokenDetails } from 'types'
import { WalletInfo } from 'api/wallet/WalletApi'
import { PendingFlux } from 'api/deposit/DepositApi'

interface UseTokenBalanceResult {
  balances: TokenBalanceDetails[]
  error: boolean
}

function calculateTotalBalance(balance: BN, currentBatchId: number, pendingDeposit: PendingFlux): BN {
  const { amount, batchId } = pendingDeposit
  // Only matured deposits are added to the balance:
  // https://github.com/gnosis/dex-contracts/blob/master/contracts/EpochTokenLocker.sol#L165
  // In the UI we always display the pending amount as part of user's balance
  return batchId >= currentBatchId ? balance.add(amount) : balance
}

async function fetchBalancesForToken(
  token: TokenDetails,
  userAddress: string,
  contractAddress: string,
  networkId: number,
): Promise<TokenBalanceDetails> {
  const tokenAddress = token.address
  const [
    exchangeBalance,
    pendingDeposit,
    pendingWithdraw,
    currentBachId,
    walletBalance,
    allowance,
  ] = await Promise.all([
    depositApi.getBalance({ userAddress, tokenAddress, networkId }),
    depositApi.getPendingDeposit({ userAddress, tokenAddress, networkId }),
    depositApi.getPendingWithdraw({ userAddress, tokenAddress, networkId }),
    depositApi.getCurrentBatchId(networkId),
    erc20Api.balanceOf({ userAddress, tokenAddress, networkId }),
    erc20Api.allowance({ userAddress, tokenAddress, networkId, spenderAddress: contractAddress }),
  ])

  return {
    ...token,
    decimals: token.decimals,
    exchangeBalance,
    totalExchangeBalance: calculateTotalBalance(exchangeBalance, currentBachId, pendingDeposit),
    pendingDeposit,
    pendingWithdraw,
    claimable: pendingWithdraw.amount.isZero() ? false : pendingWithdraw.batchId < currentBachId,
    walletBalance,
    enabled: allowance.gt(ALLOWANCE_FOR_ENABLED_TOKEN),
  }
}

async function _getBalances(walletInfo: WalletInfo): Promise<TokenBalanceDetails[]> {
  const { userAddress, networkId } = walletInfo
  if (!userAddress || !networkId) {
    return []
  }

  const contractAddress = depositApi.getContractAddress(networkId)
  assert(contractAddress, 'No valid contract address found. Stopping.')

  const tokens = tokenListApi.getTokens(networkId)

  const balancePromises: Promise<TokenBalanceDetails | null>[] = tokens.map(token =>
    fetchBalancesForToken(token, userAddress, contractAddress, networkId).catch(e => {
      console.error('[useTokenBalances] Error for', token, userAddress, contractAddress, e)

      return null
    }),
  )
  const balances = await Promise.all(balancePromises)
  return balances.filter(Boolean) as TokenBalanceDetails[]
}

export const useTokenBalances = (): UseTokenBalanceResult => {
  const walletInfo = useWalletConnection()
  const [balances, setBalances] = useSafeState<TokenBalanceDetails[]>([])
  const [error, setError] = useSafeState(false)

  useEffect(() => {
    // can return NULL (if no address or network)
    walletInfo.isConnected &&
      _getBalances(walletInfo)
        .then(balances => {
          logDebug(
            '[useTokenBalances] Wallet balances',
            balances ? balances.map(b => formatAmount(b.walletBalance, b.decimals)) : null,
          )
          setBalances(balances)
          setError(false)
        })
        .catch(error => {
          console.error('[useTokenBalances] Error loading balances', error)
          setError(true)
        })
  }, [setBalances, setError, walletInfo])

  return { balances, error }
}
