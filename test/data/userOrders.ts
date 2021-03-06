import BN from 'bn.js'
import { addDays, addMinutes } from 'date-fns'

import { UNLIMITED_ORDER_AMOUNT, MAX_BATCH_ID } from '@gnosis.pm/dex-js'

import { dateToBatchId } from 'utils'

import { USER_1, BATCH_ID } from './basic'

const NOW = Date.now()

export const exchangeOrders = {
  [USER_1]: [
    {
      buyTokenId: 3, // TUSD
      sellTokenId: 7, // DAI
      validFrom: dateToBatchId(addDays(NOW, 1)), // scheduled order,
      validUntil: dateToBatchId(addDays(NOW, 20)),
      priceNumerator: new BN('2100000000000000000000'),
      priceDenominator: new BN('2000000000000000000000'),
      remainingAmount: new BN('2000000000000000000000'),
    },
    {
      buyTokenId: 7, // DAI
      sellTokenId: 5, // PAX
      validFrom: BATCH_ID,
      validUntil: MAX_BATCH_ID, // as big as it gets
      priceNumerator: UNLIMITED_ORDER_AMOUNT, // unlimited order, spread 0.3%
      priceDenominator: UNLIMITED_ORDER_AMOUNT.mul(new BN(997)).divRound(new BN(1000)),
      remainingAmount: UNLIMITED_ORDER_AMOUNT.mul(new BN(997)).divRound(new BN(1000)), // not touched for liquidity orders
    },
    {
      buyTokenId: 7, // DAI
      sellTokenId: 5, // PAX
      validFrom: BATCH_ID,
      validUntil: dateToBatchId(addMinutes(NOW, 2)),
      priceNumerator: new BN('10500000000000000000000'),
      priceDenominator: new BN('10000000000000000000000'),
      remainingAmount: new BN('5876842900000000000000'),
    },
    {
      buyTokenId: 0, // FEE Token; not in our list (forcing token fetch), registered in the exchange. Provides details
      sellTokenId: 1, // WETH
      validFrom: BATCH_ID,
      validUntil: dateToBatchId(addDays(NOW, 10)),
      priceNumerator: new BN('500000000000000000000'),
      priceDenominator: new BN('10000000000000000000000'),
      remainingAmount: new BN('300000000000000000000'),
    },
    {
      buyTokenId: 1, // WETH
      sellTokenId: 8, // TOKEN_8; not in our list (forcing token fetch), registered in the exchange. Does not provide details (name, symbol, decimals)
      validFrom: BATCH_ID,
      validUntil: MAX_BATCH_ID,
      priceNumerator: new BN('700000000000000000000000'),
      priceDenominator: new BN('10000000000000000000000'),
      remainingAmount: new BN('98000000000000000000'),
    },
  ],
}

export const pendingOrders = {
  [USER_1]: [
    {
      buyTokenId: 7, // DAI
      sellTokenId: 4, // USDC
      validFrom: BATCH_ID,
      validUntil: dateToBatchId(addDays(NOW, 1)),
      priceNumerator: new BN('1315273500000000000000'),
      priceDenominator: new BN('876849000'),
      remainingAmount: new BN('876849000'),
    },
  ],
}
