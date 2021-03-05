let Flashloan = artifacts.require("Flashloan");

const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:8545'); 

const { legos }  = require("@studydefi/money-legos");
const { Error, FailureInfo } = require('./data/errocdes.json');
const BigNumber = require('bignumber.js');
const comptroller = new web3.eth.Contract(legos.compound.comptroller.abi, legos.compound.comptroller.address);


contract('Flashloan', accounts  => {

    before('Setup Contract', async () => { 
        flashLoanInstance = await Flashloan.deployed();
        console.log('Flashloan Address : ', flashLoanInstance.address);
    });


    it('Call Compound Liquidation cETH', async () => {

        let _account = accounts[0]; // the owner !!! 
        
        let _borrower = "0xed25b12116062500098f361597d72f3bb27cca61"; // The borrower address ... 
        let _repayAmount = new BigNumber(0.45).times(10**18);  
        let _cTokenBorrowed = "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5";  
        let _cTokenCollateral = "0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407";  

        let { cTokenBorrowedContract, cTokenCollateralContract }  = await generateContracts(_cTokenBorrowed, _cTokenCollateral);

        let { 1:liquidity, 2: shortfall } = await comptroller.methods.getAccountLiquidity(_borrower).call();    
        console.log('Liquidity', liquidity, 'Shortfall', shortfall);
          
        // cEth 
        // let txLiquidate = await cTokenBorrowedContract.methods.liquidateBorrow(_borrower, _repayAmount.toFixed(), _cTokenCollateral).send({ 
        //     from : _account, 
        //     ...gasParams 
        // });

    });


    async function generateContracts(_cTokenBorrowed, _cTokenCollateral) {
    
        let cTokenBorrowUnderlyingAddress = null;
        let cTokenCollateralUnderlyingAddress = null;
        let borrowedUnderlyingContract = null;
        let collateralUnderlyingContract = null;
    
        let cTokenBorrowedContract = new web3.eth.Contract(legos.compound.cToken.abi, _cTokenBorrowed);
        let cTokenCollateralContract = new web3.eth.Contract(legos.compound.cToken.abi, _cTokenCollateral);
    
        let cTokenBorrowedSymbol = await cTokenBorrowedContract.methods.symbol().call();
        let cTokenCollateralSymbol = await cTokenCollateralContract.methods.symbol().call();
    
        if( cTokenBorrowedSymbol !== 'cETH' ) {
            cTokenBorrowUnderlyingAddress = await cTokenBorrowedContract.methods.underlying().call();
            borrowedUnderlyingContract = new web3.eth.Contract(legos.erc20.abi, cTokenBorrowUnderlyingAddress);
        }
    
        if( cTokenCollateralSymbol !== 'cETH' ) {
            cTokenCollateralUnderlyingAddress = await cTokenCollateralContract.methods.underlying().call();
            collateralUnderlyingContract = new web3.eth.Contract(legos.erc20.abi, cTokenCollateralUnderlyingAddress);
        }
    
        console.log('cTokenBorrowUnderlyingAddress :  ',  cTokenBorrowedSymbol, cTokenBorrowUnderlyingAddress);
        console.log('cTokenCollateralUnderlyingAddress :  ',  cTokenCollateralSymbol, cTokenCollateralUnderlyingAddress);
    
        return {
            cTokenBorrowedContract,
            cTokenCollateralContract,
            cTokenBorrowedSymbol,
            cTokenCollateralSymbol,
            borrowedUnderlyingContract,
            collateralUnderlyingContract
        }
    }
    

});



