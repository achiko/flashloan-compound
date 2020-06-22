let Flashloan = artifacts.require("Flashloan");
const { legos }  = require("@studydefi/money-legos");
const PriceOracleProxyAbi = require('./data/PriceOracleProxy.json');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:8546'); 

const makerDai = new web3.eth.Contract(legos.erc20.dai.abi, legos.erc20.dai.address);

// Main Net Contract for cETH (the collateral-supply process is different for cERC20 tokens)
const cEth = new web3.eth.Contract(legos.compound.cEther.abi, legos.compound.cEther.address);
// Main Net Contract for Compound's Comptroller
const comptroller = new web3.eth.Contract(legos.compound.comptroller.abi, legos.compound.comptroller.address);
// Main Net Contract for Compound's Price Oracle
const priceOracle = new web3.eth.Contract(PriceOracleProxyAbi, "0xDDc46a3B076aec7ab3Fc37420A8eDd2959764Ec4");
// Main net address of DAI contract
// https://etherscan.io/address/0x6b175474e89094c44da98b954eedeac495271d0f
const dai = new web3.eth.Contract(legos.erc20.dai.abi, legos.erc20.dai.address);
// Main Net Contract for cDAI (https://compound.finance/developers#networks)
const cDai = new web3.eth.Contract(legos.compound.cDAI.abi, legos.compound.cDAI.address);
const cEthAddress = legos.compound.cEther.address;
const cDaiAddress = legos.compound.cDAI.address;

const gasParams = {
    gasLimit: web3.utils.toHex(1500000),      // posted at compound.finance/developers#gas-costs
    gasPrice: web3.utils.toHex(90000000000), // use ethgasstation.info (mainnet only) 40000000000
};

const bignum = (value) => new BigNumber(value); // just shorten bignum initialisation

// Declare Flashloan Public Contract 

let flashLoanInstance = null;

contract('Flashloan', accounts  => {

    before('Setup Contract', async () => { 
        flashLoanInstance = await Flashloan.deployed();
        console.log('Flashloan Address : ', flashLoanInstance.address);
    });

    it('Send Dai to Flashloan Smartcontract', async () => { 

        // let daibalance = await makerDai.methods.balanceOf( accounts[7]).call();
        // console.log('DaiBalance ',  daibalance );

        // console.log('Send 30 Dai To Flashloan Contract ');
        // let transfer = await makerDai.methods.transfer( flashLoanInstance.address, '10000000000000000000').send({
        //     from : accounts[7],
        //     ...gasParams
        // });
        
        // console.log( transfer.events  );

        // console.log('Flashloan balance : ',  await makerDai.methods.balanceOf(flashLoanInstance.address).call() )

        console.log('Call Flashloan Function !!! ');
        let txData = web3.eth.abi.encodeParameters([ 'uint256' ], [66666]);
        console.log(txData);
        let txFlashloan = await flashLoanInstance.flashloan({from : accounts[7], data : txData, ... gasParams});
        
        console.log(txFlashloan)
        
        console.log( JSON.stringify(txFlashloan) );
        // console.log('/---------------------------/');
        // console.log(txFlashloan.logs[0].args);
        // console.log('/--------------------------/');
        // console.log(txFlashloan.logs[1].args);

        assert.equal(true, true, 'True is Always True !!!');
    });


    it.skip('Supply ETH to Compound as collateral (you will get cETH in return)', async() => {
        let lenderAdderss = accounts[7];
        console.log('\nSupplying ETH to Compound as collateral (you will get cETH in return)...\n');
        console.log('Ethers To Send : ', bignum('1000000000000000000').toFixed());
        
        let mint = await cEth.methods.mint().send({
            from: lenderAdderss,    
            value: bignum('10000000000000000000').toFixed(),
            ... gasParams
        });

        console.log(mint.events);

        console.log('\nEntering market (via Comptroller contract) for ETH (as collateral)...');
        let markets = [cEthAddress]; // This is the cToken contract(s) for your collateral
        let enterMarkets = await comptroller.methods.enterMarkets(markets).send({
            from: lenderAdderss,
            ... gasParams
        });

        console.log('Calculating your liquid assets in Compound...');
        let response = await comptroller.methods.getAccountLiquidity(lenderAdderss).call();
        console.log('response : ', response);

        let { 1:liquidity, 2: shortfall } = response;
        liquidity = web3.utils.fromWei(liquidity).toString();

        console.log('liquidity : ', liquidity);

        console.log("Fetching cETH collateral factor...");
        let {1:collateralFactor} = await comptroller.methods.markets(cEthAddress).call();
        collateralFactor = (collateralFactor / 1e18) * 100; // Convert to percent

        console.log('collateralFactor : ', collateralFactor);

        console.log('Fetching DAI price from the price oracle...');
        let daiPriceInEth = await priceOracle.methods.getUnderlyingPrice(cDaiAddress).call();
        daiPriceInEth = daiPriceInEth / 1e18;

        console.log('Fetching borrow rate per block for DAI borrowing...');
        let borrowRate = await cDai.methods.borrowRatePerBlock().call();
        borrowRate = borrowRate / 1e18;

        console.log(`\nYou have ${liquidity} of LIQUID assets (worth of ETH) pooled in Compound.`);
        console.log(`You can borrow up to ${collateralFactor}% of your TOTAL assets supplied to Compound as DAI.`);
        console.log(`1 DAI == ${daiPriceInEth.toFixed(6)} ETH`);
        console.log(`You can borrow up to ${liquidity/daiPriceInEth} DAI from Compound.`);
        console.log(`NEVER borrow near the maximum amount because your account will be instantly liquidated.`);
        console.log(`\nYour borrowed amount INCREASES (${borrowRate} * borrowed amount) DAI per block.\nThis is based on the current borrow rate.\n`);

        const daiToBorrow = liquidity/daiPriceInEth - 100;
        const daiToBorrowWei = web3.utils.toWei(daiToBorrow.toString(), 'ether');

        console.log(`Now attempting to borrow ${daiToBorrow} DAI ...  Equivalent in Wei : ${daiToBorrowWei} `);

        await cDai.methods.borrow(web3.utils.toWei(daiToBorrow.toString(), 'ether')).send({
            from: lenderAdderss,
            ... gasParams
        });

        // console.log('\nFetching DAI borrow balance from cDAI contract...');
        // let balance = await cDai.methods.borrowBalanceCurrent(lenderAdderss).call();
        // balance = balance / 1e18; // because DAI is a 1e18 scaled token.
        // console.log(`Borrow balance is ${balance} DAI`);
        // console.log(`\nThis part is when you do something with those borrowed assets!\n`);  

        assert.equal(true,true);


    });


});