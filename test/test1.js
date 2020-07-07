let Flashloan = artifacts.require("Flashloan");
let Swap = artifacts.require("Swap");

const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:8545'); 

const { legos } = require("@studydefi/money-legos");

const { Error, FailureInfo } = require('./data/errocdes.json');

const PriceOracleProxyAbi = require('./data/PriceOracleProxy.json');
const BigNumber = require('bignumber.js');

const makerDai = new web3.eth.Contract(legos.erc20.dai.abi, legos.erc20.dai.address);
const cEth = new web3.eth.Contract(legos.compound.cEther.abi, legos.compound.cEther.address);

const comptroller = new web3.eth.Contract(legos.compound.comptroller.abi, legos.compound.comptroller.address);
const priceOracle = new web3.eth.Contract(PriceOracleProxyAbi, "0xDDc46a3B076aec7ab3Fc37420A8eDd2959764Ec4");

const dai = new web3.eth.Contract(legos.erc20.dai.abi, legos.erc20.dai.address); // dublicate 
const usdc = new web3.eth.Contract(legos.erc20.usdc.abi, legos.erc20.usdc.address);

const cDai = new web3.eth.Contract(legos.compound.cDAI.abi, "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"); // manual add cDai ... 
const cUsdc = new web3.eth.Contract(legos.compound.cUSDC.abi, legos.compound.cUSDC.address);

const cEthAddress = legos.compound.cEther.address;
const cDaiAddress = legos.compound.cDAI.address;

const gasParams = {
    gasLimit: web3.utils.toHex(2500000),      // posted at compound.finance/developers#gas-costs
    gasPrice: web3.utils.toHex(90000000000), // use ethgasstation.info (mainnet only) 40000000000
};

const bignum = (value) => new BigNumber(value); // just shorten bignum initialisation

let flashLoanInstance = null;
let swapInstance = null;

contract('Flashloan', accounts  => {

    before('Setup Contract', async () => { 
        flashLoanInstance = await Flashloan.deployed();
        swapInstance = await Swap.deployed();
    });

    it('Call Liquidation', async () => { 

        let _account = accounts[8];

        /* -------------  Function  params ----- */
        let _borrower = "0x028547275c1c0b9f143c6aa9941ad60ca989c3e5"; // The borrower address ... 
        let _repayAmount = new BigNumber(10).times(10**18);  // * 0.5 borrowed amount // To Do : Decimals ... 
        
        let _cTockenBorrowed = "0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e"; 
        let _cTokenCollateral = "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643"; 
        /* -------------------------------------- */

        let tx = await 
            flashLoanInstance.flashloan(_borrower, _repayAmount.toFixed(), _cTockenBorrowed, _cTokenCollateral, {
            from : _account, 
            ... gasParams 
        });

        console.log('------------');
        console.log( tx.logs );
        
        // let { Failure } = tx.events;

        // console.log('-------------------------------------------');
        // if(Failure) {
        //     console.log('We Found Failure Event in Transaction Decode it !!! ');
        //     let { error , info,  detail } = Failure.returnValues;
            
        //     console.log(`Error: ${error} , Info: ${ info } Detail: ${detail}  `);
        //     console.log('Error Desc : ', Error[error] );
        //     console.log('Failure Info :  : ', FailureInfo[info] );
        // } else {
        //     console.log('JUST PRINT NO FAILURE  ... ');
        // }
        
        assert(true, true);
    });

});