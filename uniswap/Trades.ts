import {ChainId, Pair, Token, TokenAmount, Trade } from '@uniswap/sdk'
import { flatMap } from 'lodash.flatmap'
import { BASES_TO_CHECK_TRADES_AGAINST } from './constants'



export function usePairs(tokens: [Token | undefined, Token | undefined][]):  (undefined | null | null)[]  {

    const pairAddresses = 
      tokens.map(([tokenA, tokenB]) => {
        return tokenA && tokenB && !tokenA.equals(tokenB) ? Pair.getAddress(tokenA, tokenB) : undefined
      })
    
  

  const results = useMultipleContractSingleData(pairAddresses, PAIR_INTERFACE, 'getReserves')

  return useMemo(() => {
    return results.map((result, i) => {
      const { result: reserves, loading } = result
      const tokenA = tokens[i][0]
      const tokenB = tokens[i][1]

      if (loading || !tokenA || !tokenB) return undefined
      if (!reserves) return null
      const { reserve0, reserve1 } = reserves
      const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA]
      return new Pair(new TokenAmount(token0, reserve0.toString()), new TokenAmount(token1, reserve1.toString()))
    })
  }, [results, tokens])     

  }


export function useAllCommonPairs(tokenA?: Token, tokenB?: Token): Pair[] {
  //const { chainId } = useActiveWeb3React()

  const bases: Token[] = ChainId.MAINNET ? BASES_TO_CHECK_TRADES_AGAINST[ChainId.MAINNET] : []

  
  const allPairCombinations: [Token | undefined, Token | undefined][] =  [
      // the direct pair
      [tokenA, tokenB],
      // token A against all bases
      ...bases.map((base): [Token | undefined, Token | undefined] => [tokenA, base]),
      // token B against all bases
      ...bases.map((base): [Token | undefined, Token | undefined] => [tokenB, base]),
      // each base against all bases
      ...flatMap(bases, (base): [Token, Token][] => bases.map(otherBase => [base, otherBase]))
    ]
  
  

  const allPairs = usePairs(allPairCombinations);
  

  // only pass along valid pairs, non-duplicated pairs
  
  let result = 
      Object.values(
        allPairs
          // filter out invalid pairs
          .filter((p): p is Pair => !!p)
          // filter out duplicated pairs
          .reduce<{ [pairAddress: string]: Pair }>((memo, curr) => {
            memo[curr.liquidityToken.address] = memo[curr.liquidityToken.address] ?? curr
            return memo
          }, {})
      )

      return result;

    

}


/**
 * Returns the best trade for the exact amount of tokens in to the given token out
 */


/*
export function useTradeExactIn(amountIn?: TokenAmount, tokenOut?: Token): Trade | null {
  const allowedPairs = useAllCommonPairs(amountIn?.token, tokenOut)

  return useMemo(() => {
    if (amountIn && tokenOut && allowedPairs.length > 0) {
      return Trade.bestTradeExactIn(allowedPairs, amountIn, tokenOut, { maxHops: 3, maxNumResults: 1 })[0] ?? null
    }
    return null
  }, [allowedPairs, amountIn, tokenOut])
}
*/

/**
 * Returns the best trade for the token in to the exact amount of token out
 */

 /*
export function useTradeExactOut(tokenIn?: Token, amountOut?: TokenAmount): Trade | null {
  const allowedPairs = useAllCommonPairs(tokenIn, amountOut?.token)

  return useMemo(() => {
    if (tokenIn && amountOut && allowedPairs.length > 0) {
      return Trade.bestTradeExactOut(allowedPairs, tokenIn, amountOut, { maxHops: 3, maxNumResults: 1 })[0] ?? null
    }
    return null
  }, [allowedPairs, tokenIn, amountOut])
}
*/