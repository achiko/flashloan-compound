// const { ChainId, Token, TokenAmount, Pair } = require('@uniswap/sdk');
// const tokenIn = new Token(ChainId.MAINNET, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 6, 'HOT', 'USDC') // USDC 
// const  tokenOut = new Token(ChainId.MAINNET, '0x0D8775F648430679A709E98d2b0Cb6250d2887EF', 18, 'NOT', 'BAT') // 
// const pair = new Pair(new TokenAmount(tokenIn, '2000000000000000000'), new TokenAmount(tokenOut, '1000000000000000000'))
// console.log(pair);

const { ChainId, Token, TokenAmount, Pair, Route, TradeType, Trade } = require('@uniswap/sdk')

const tokenIn = new Token(ChainId.MAINNET, '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', 6, 'USDC', 'UsdCoin')
const tokenOut = new Token(ChainId.MAINNET, '0x0D8775F648430679A709E98d2b0Cb6250d2887EF', 18, 'BAT', 'Bat Attention Token')

const pair = new Pair(new TokenAmount(tokenIn, '2000000000000000000'), new TokenAmount(tokenOut, '1000000000000000000'))

const route = new Route([pair], tokenOut)

//console.log(route);




//console.log(NOT_TO_HOT);
//const trade = new Trade(NOT_TO_HOT, new TokenAmount(NOT, '1000000000000000'), TradeType.EXACT_INPUT);
// Trade.bestTradeExactIn(
//     pairs: Pair[],
//     amountIn: TokenAmount,
//     tokenOut: Token,
//     { maxNumResults = 3, maxHops = 3 }: BestTradeOptions = {}): Trade[]