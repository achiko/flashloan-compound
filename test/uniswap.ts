import { ChainId, TradeType, Token, TokenAmount, Pair, Route, Trade  } from '@uniswap/sdk'

// const token = new Token(ChainId.MAINNET, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6, 'USDC', 'USD//C')
// const token1 = new Token(ChainId.MAINNET, '0x0D8775F648430679A709E98d2b0Cb6250d2887EF', 18, 'BAT', 'Caffeine')
// const pair = new Pair(new TokenAmount(token, '1000000'), new TokenAmount(token1, '0'))



const HOT = new Token(ChainId.MAINNET, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 18, 'USDC', 'USD//C')
const NOT = new Token(ChainId.MAINNET, '0x0D8775F648430679A709E98d2b0Cb6250d2887EF', 18, 'BAT', 'BAT')
const HOT_NOT = new Pair(new TokenAmount(HOT, '1000000'), new TokenAmount(NOT, '1000000000000000000'))
const NOT_TO_HOT = new Route([HOT_NOT], NOT)

const trade = new Trade(NOT_TO_HOT, new TokenAmount(NOT, '1000000000000000'), TradeType.EXACT_INPUT)

//console.log(trade);


let res  = Trade.bestTradeExactIn(
        [HOT_NOT], 
        new TokenAmount(HOT, '1000000'),  
        NOT,
        { "maxNumResults" : 3, "maxHops" : 3 }
    )

console.log(JSON.stringify(res ) );
