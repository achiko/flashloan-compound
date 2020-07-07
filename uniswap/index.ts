import { ChainId, TradeType, Token, TokenAmount, Pair, Route, Trade  } from '@uniswap/sdk'
import { usePairs, useAllCommonPairs } from "./Trades"

const token1 = new Token(ChainId.MAINNET, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 18, 'USDC', 'USD//C')
const token2 = new Token(ChainId.MAINNET, '0x0D8775F648430679A709E98d2b0Cb6250d2887EF', 18, 'BAT', 'BAT')

//let res : any  = useAllCommonPairs(token1, token2);

let res : any = usePairs( [token1, token2] );

