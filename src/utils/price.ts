import BN from 'bn.js'
import { assert } from '@gnosis.pm/dex-js'
import { TEN, UNLIMITED_ORDER_AMOUNT_BIGNUMBER } from 'const'
import BigNumber from 'bignumber.js'

interface AdjustAmountParams {
  amount: BN
  higherPrecision: number
  lowerPrecision: number
}

export function adjustAmountToLowerPrecision({ amount, higherPrecision, lowerPrecision }: AdjustAmountParams): BN {
  if (higherPrecision === lowerPrecision) {
    // no adjustment required
    return amount
  }

  assert(higherPrecision > lowerPrecision, 'higherPrecision must be > lowerPrecision')

  const difference = new BN(higherPrecision - lowerPrecision)

  // divides amount by difference in precision, rounding. E.g:
  // 1.2345, precision 4, amount == 12345
  // 1.2345, precision 2, amount == 12345 / 10 ^ (4 - 2) => 12345 / 100 => 123
  // 1.5550, precision 1, amount == 15550 / 10 ^ (4 - 1) => 15550 / 1000 => 16
  return amount.divRound(TEN.pow(difference))
}

function bigNumberToBN(n: BigNumber | BN): BN {
  if (n instanceof BN) {
    return n
  }
  return new BN(n.integerValue().toString(10))
}

interface MaxAmountForSpreadParam {
  spread: number
  buyTokenPrecision: number
  sellTokenPrecision: number
}

interface Amounts {
  buyAmount: BN
  sellAmount: BN
}

/**
 * Calculates the max amounts within given `spread` for unlimited orders
 *
 * Uses BigNumber internally to keep track of decimals
 * Returns BN for compatibility with ExchangeApi
 *
 * @param spread Value between 0 and 100, not inclusive
 * @param buyTokenPrecision Decimals of buy token
 * @param sellTokenPrecision Decimals of sell token
 */
export function maxAmountsForSpread({
  spread,
  buyTokenPrecision,
  sellTokenPrecision,
}: MaxAmountForSpreadParam): Amounts {
  // Enforcing positive spreads: 0 < spread < 100
  assert(spread > 0 && spread < 100, 'Invalid spread amount')

  const MAX = UNLIMITED_ORDER_AMOUNT_BIGNUMBER
  const ONE = new BigNumber(1)

  const spreadPercentage = new BigNumber(spread).dividedBy(new BigNumber(100))

  let buyAmount
  let sellAmount

  if (buyTokenPrecision === sellTokenPrecision) {
    // case 1: same precision
    // buyAmount == MAX, sellAmount == buyAmount * (1 - (spread/100))
    buyAmount = MAX
    sellAmount = buyAmount.multipliedBy(ONE.minus(spreadPercentage))
  } else if (buyTokenPrecision > sellTokenPrecision) {
    // case 2: buyTokenPrecision > sellTokenPrecision
    // buyAmount == MAX, sellAmount == buyAmount * (1 - (spread/100))
    buyAmount = MAX
    const rawSellAmount = buyAmount.multipliedBy(ONE.minus(spreadPercentage))
    sellAmount = adjustAmountToLowerPrecision({
      amount: bigNumberToBN(rawSellAmount),
      higherPrecision: buyTokenPrecision,
      lowerPrecision: sellTokenPrecision,
    })
  } else {
    // case 3: buyTokenPrecision < sellTokenPrecision
    // sellAmount == MAX, buyAmount == sellAmount * (1 + (spread/100))
    sellAmount = MAX
    const rawBuyAmount = sellAmount.multipliedBy(ONE.plus(spreadPercentage))
    buyAmount = adjustAmountToLowerPrecision({
      amount: bigNumberToBN(rawBuyAmount),
      higherPrecision: sellTokenPrecision,
      lowerPrecision: buyTokenPrecision,
    })
  }

  return { buyAmount: bigNumberToBN(buyAmount), sellAmount: bigNumberToBN(sellAmount) }
}
