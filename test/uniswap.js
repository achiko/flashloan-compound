let Flashloan = artifacts.require("Flashloan");
const { legos }  = require("@studydefi/money-legos");
const PriceOracleProxyAbi = require('./data/PriceOracleProxy.json');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');


contract('Flashloan', accounts  => {

    before('Setup Contract', async () => { 
        flashLoanInstance = await Flashloan.deployed();
        console.log('Flashloan Address : ', flashLoanInstance.address);
    });

    it('Call Liquidation', async () => {  

        AssertPlus(true, true);
    });

});

