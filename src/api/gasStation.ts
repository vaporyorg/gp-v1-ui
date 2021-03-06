import { WalletApi } from './wallet/WalletApi'

const GAS_STATIONS = {
  1: 'https://safe-relay.gnosis.pm/api/v1/gas-station/',
  4: 'https://safe-relay.staging.gnosisdev.com/api/v1/gas-station/',
}

const GAS_PRICE_LEVEL: Exclude<keyof GasStationResponse, 'lastUpdate'> = 'standard'

let cacheKey = ''
let cachedGasPrice: undefined | string

const constructKey = ({ blockNumber, chainId }: GasPriceCacheDeps): string => chainId + '@' + blockNumber

interface GasPriceCacheDeps {
  blockNumber: number | null
  chainId: number
}

interface GasStationResponse {
  lastUpdate: string
  lowest: string
  safeLow: string
  standard: string
  fast: string
  fastest: string
}

const fetchGasPriceFactory = (walletApi: WalletApi) => async (): Promise<string | undefined> => {
  const { blockchainState } = walletApi

  if (!blockchainState) return undefined

  const { chainId, blockHeader } = blockchainState

  // only fetch new gasPrice when chainId or blockNumber changed
  const key = constructKey({ chainId, blockNumber: blockHeader && blockHeader.number })
  if (key === cacheKey) {
    return cachedGasPrice
  }

  const gasStationURL = GAS_STATIONS[chainId]

  if (!gasStationURL) return undefined

  try {
    const response = await fetch(gasStationURL)
    const json: GasStationResponse = await response.json()

    const gasPrice = json[GAS_PRICE_LEVEL]
    if (gasPrice) {
      cacheKey = key
      cachedGasPrice = gasPrice

      return gasPrice
    }
  } catch (error) {
    console.error('[api:gasStation] Error fetching gasPrice from', gasStationURL, error)
  }
  return undefined
}

export default fetchGasPriceFactory
