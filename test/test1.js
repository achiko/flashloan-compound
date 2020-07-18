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

    before('Setup Contracts ..... ', async () => { 
        flashLoanInstance = await Flashloan.deployed();
        swapInstance = await Swap.deployed();
    });

    it('Call Liquidation', async () => { 

        let _account = accounts[8];

        
        await web3.eth.sendTransaction({ 
            from : accounts[9],
            to : flashLoanInstance.address, 
            value : bignum(0.6).times(10**18).toFixed(),   
            ... gasParams
        });

        let flashloanBalance = await web3.eth.getBalance(flashLoanInstance.address);
        console.log('Flashloan Instance Balance : ', flashloanBalance , 'wei');

        /* -------------  Function  params ----------- */
        
        let _borrower = "0xea3c266499f31a38d143d242f7ca51e7ca0d216d"; // The borrower address ... 
        let _repayAmount = new BigNumber(0.15).times(10**18);  //
        let _cTockenBorrowed = "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5";  // 
        let _cTokenCollateral = "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643"; // 

        /* -------------------------------------- */

        let tx = await 
            flashLoanInstance.flashloan(_borrower, _repayAmount.toFixed(), _cTockenBorrowed, _cTokenCollateral, {
            from : _account, 
            ... gasParams 
        });

        console.log('------------');
        console.log( tx.logs );
        
        console.log('Final Balance : ', await web3.eth.getBalance(flashLoanInstance.address));

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

        console.log('----------------------');

        //let { cTockenBorrowedContract, cTokenCollateralContract } = await generateContracts(_cTockenBorrowed, _cTokenCollateral);
        //let tx = await cTockenBorrowedContract.methods.

        // let _balance = await borrowedUnderlyingContract.methods.balanceOf( flashLoanInstance.address ).call();
        // console.log('Smartcontract Balance :  ', cTockenBorrowedSymbol, ' Is: ', new BigNumber(_balance).div(10*18).toNumber() );

        assert(true, true);
    });
});



async function generateContracts(_cTockenBorrowed, _cTokenCollateral) {
    
    let cTockenBorrowedContract = new web3.eth.Contract(legos.compound.cToken.abi, _cTockenBorrowed);
    let cTokenCollateralContract = new web3.eth.Contract(legos.compound.cToken.abi, _cTokenCollateral);

    let cTockenBorrowedSymbol = await cTockenBorrowedContract.methods.symbol().call();
    let cTokenCollateralSymbol = await cTokenCollateralContract.methods.symbol().call();

    let cTockenBorrowUnderlyingAddress = await cTockenBorrowedContract.methods.underlying().call();
    let cTokenCollateralUnderlyingAddress = await cTokenCollateralContract.methods.underlying().call();

    let borrowedUnderlyingContract = new web3.eth.Contract(legos.erc20.abi, cTockenBorrowUnderlyingAddress);
    let collateralUnderlyingContract = new web3.eth.Contract(legos.erc20.abi, cTokenCollateralUnderlyingAddress);

    return { cTockenBorrowedContract, cTokenCollateralContract, borrowedUnderlyingContract, cTockenBorrowedSymbol };
}
