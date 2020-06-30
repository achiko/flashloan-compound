let Flashloan = artifacts.require("Flashloan");
const { legos }  = require("@studydefi/money-legos");
let Swap = artifacts.require("Swap");
const BigNumber = require('bignumber.js');
const Web3 = require('web3');

let swapInstance = null;

contract('Flashloan', accounts  => { 

    before('Setup Contract', async () => { 
        swapInstance = await Swap.deployed();
        console.log('Swap Router Address : ', swapInstance.address);
    });

    it('Call Liquidation', async () => {  
        assert(true, true);
    });

});

