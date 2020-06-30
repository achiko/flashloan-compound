//pragma solidity ^0.5.15;
pragma solidity >=0.6.2;

import './uniswap/IUniswapV2Router02.sol';

contract Swap {

    IUniswapV2Router01 public uniswapRouter;

    constructor () public {

    }

    function myName () public view returns (string memory name) {
        name = "Uniswap";
    }

}