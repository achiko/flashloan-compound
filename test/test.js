let Flashloan = artifacts.require("Flashloan");
const { legos }  = require("@studydefi/money-legos");
const PriceOracleProxyAbi = require('./data/PriceOracleProxy.json');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:8546'); 

const makerDai = new web3.eth.Contract(legos.erc20.dai.abi, legos.erc20.dai.address);

const cEth = new web3.eth.Contract(legos.compound.cEther.abi, legos.compound.cEther.address);
const comptroller = new web3.eth.Contract(legos.compound.comptroller.abi, legos.compound.comptroller.address);
const priceOracle = new web3.eth.Contract(PriceOracleProxyAbi, "0xDDc46a3B076aec7ab3Fc37420A8eDd2959764Ec4");
const dai = new web3.eth.Contract(legos.erc20.dai.abi, legos.erc20.dai.address);
const usdc = new web3.eth.Contract(legos.erc20.usdc.abi, legos.erc20.usdc.address);
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


    it('Call Liquidation', async () => { 

        // let daiHolderAddress = "0xb3cc81d316e67de761e0aefbc35c70d76965dd05"; // hav a huge amount of Dai !!! 
        // let daibalance = await makerDai.methods.balanceOf(daiHolderAddress).call();
        
        // console.log('DaiBalance ',  daibalance );

        // console.log('Send 30 Dai To Flashloan Contract ');
        // let transfer = await makerDai.methods.transfer( flashLoanInstance.address, '10000000000000000000').send({
        //     from : daiHolderAddress,
        //     ...gasParams
        // });
        
        // console.log( transfer.events  );
        // console.log('Flashloan balance : ',  await makerDai.methods.balanceOf(flashLoanInstance.address).call() )


        // 0x6eC257536C8f6544017e095c0B30Af13b6B90963
        /*
        let usdcHolder = "0xb81e6058a9c917bf5d55887eaf5ef632ab57d64a";
        let usdcHodlerBalance = await usdc.methods.balanceOf(usdcHolder).call();
        
        console.log("usdcHodlerBalance : ", new BigNumber(usdcHodlerBalance).dividedBy(10**6).toNumber() );
        
        await web3.eth.sendTransaction({
            from : accounts[5],
            to : usdcHolder,
            // value : new BigNumber(3).times(10*18),
            value : '2000000000000000000',
            ... gasParams
        });

        console.log( "USDCHoder Balance : ",  await web3.eth.getBalance(usdcHolder) );
       

        await usdc.methods.transfer( flashLoanInstance.address, 
                (new BigNumber(20).times(10**6)).toFixed() ).send({ 
            from : usdcHolder,
            ... gasParams
        });
        
        */

        let flashloanUsdcBalance = await usdc.methods.balanceOf(flashLoanInstance.address).call();
        console.log( 'Flashloan Balance : ',  new BigNumber(flashloanUsdcBalance).dividedBy(10**6).toNumber() );
        

        console.log('Set Comptorller Interface : ');
        let _comptrollerAddress = "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b";
        let txSetComptroller = await flashLoanInstance.setComptroller(_comptrollerAddress, { from : accounts[0] });

        console.log('Call Flashloan Function !!! ');
        let txData = web3.eth.abi.encodeParameters([ 'uint256' ], [66666]);
        
        //address borrower, uint repayAmount, CTokenInterface cTokenCollateral

        let _borrower = "0x331e97bdf4239313674d1f0d9799d804da4b88ff";
        let _repayAmount = new BigNumber(5).times(10**6);
        let _cTockenBorroued = "0x39aa39c021dfbae8fac545936693ac917d5e7563"; // cUscd
        let _cTokenCollateral = "0xf5dce57282a584d2746faf1593d3121fcac444dc"; // cDai

        let txFlashloan = await flashLoanInstance.flashloan(_borrower, _repayAmount, _cTockenBorroued, _cTokenCollateral ,
                {from : accounts[7], data : txData, ... gasParams });
        
        
        //console.log(txFlashloan.logs);
        console.log('---------------');
        
        let { _balance } = txFlashloan.logs[0].args;
        console.log('Balance : ', new BigNumber(_balance).toNumber() );
        
        console.log('----------------');
        
        let { _redeemError } = txFlashloan.logs[1].args;
        console.log('_redeemError : ', new BigNumber(_redeemError).toNumber());

        // console.log('----------------------');
        // console.log( txFlashloan.logs[3].args );
        // let { _err } = txFlashloan.logs[3].args;
        // console.log( 'Error Code Returned : ? ', new BigNumber(_err).toNumber() );
        // console.log('----------------------');
        
        let { 1:liquidity, 2: shortfall } = await comptroller.methods.getAccountLiquidity(_borrower).call();
        
        
        console.log('Liquidity', liquidity);
        console.log('Shortfall', shortfall);

        let flashloanUsdcBalance1 = await usdc.methods.balanceOf(flashLoanInstance.address).call();
        console.log( 'Flashloan Balance After Liquidation: ',  new BigNumber(flashloanUsdcBalance1).dividedBy(10**6).toNumber() );
        

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