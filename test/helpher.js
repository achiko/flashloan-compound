const _ = require('lodash');

let _token = {
    "WETH" : "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    "DAI" : "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    "USDC" : "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "SAI" : "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359",
    "USDT" : "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    "BAT" : "0x0D8775F648430679A709E98d2b0Cb6250d2887EF",
    "REP" : "0x1985365e9f78359a9B6AD760e32412f4a445E862",
    "WBTC" : "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    "ZRX" : "0xE41d2489571d322189246DaFA5ebDe1F4699F498"
}

const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

let tokens = [
    {
        "address" : "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        "symbol" : "WETH",
        "decimals" : 18,
        "main" : true
    },
    {
        "address" : "0x6B175474E89094C44Da98b954EedeAC495271d0F",
        "symbol" : "DAI",
        "decimals" : 18,
        "main" : false
    },
    {
        "address" : "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        "symbol" : "USDC",
        "decimals" : 6,
        "main" : false
    }, 
    {
        "address" : "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359",
        "symbol" : "SAI",
        "decimals" : 18,
        "main" : false
    },
    {
        "address" : "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "symbol" : "USDT",
        "decimals" : 6,
        "main" : false
    },
    {
        "address" : "0x0D8775F648430679A709E98d2b0Cb6250d2887EF",
        "symbol" : "BAT",
        "decimals" : 18,
        "main" : false
    }, 
    {
        "address" : "0x1985365e9f78359a9B6AD760e32412f4a445E862",
        "symbol" : "REP",
        "decimals" : 18,
        "main" : false
    },
    {
        "address" : "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        "symbol" : "WBTC",
        "decimals" : 8,
        "main" : false
    },
    {
        "address" : "0xE41d2489571d322189246DaFA5ebDe1F4699F498",
        "symbol" : "ZRX",
        "decimals" : 18,
        "main" : false
    }
]

console.log('Token  Pairs ...');

const getPath = ( token1Address, token2Address) => {

    let path = [];
    let _tokenA = _.find(tokens, { 'address': token1Address });
    let _tokenB = _.find(tokens, { 'address': token2Address });

    console.log( _tokenA );
    console.log('-----');
    console.log(_tokenB);

    if( !_tokenA.main) {
        path.push(token1Address);
        path.push(WETH)
        path.push()
    }

}


getPath( _token.DAI  , _token.BAT );