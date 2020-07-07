let Flashloan = artifacts.require("Flashloan");
let Swap = artifacts.require("Swap");

const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:8546'); 

const { legos }  = require("@studydefi/money-legos");

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

// Declare Flashloan Public Contract 

let flashLoanInstance = null;
let swapInstance = null;

contract('Flashloan', accounts  => {

    before('Setup Contract', async () => { 
        flashLoanInstance = await Flashloan.deployed();
        swapInstance = await Swap.deployed();
        console.log('Flashloan Address : ', flashLoanInstance.address);
        console.log('Uniswap Address : ', swapInstance.address);

    });


    it.skip('Call Liquidation And Swap Tokens ', async () => {
        
        let _account = accounts[6];
        console.log('Swap Ether To Tokens &Send To Contract');
        let _amount = new BigNumber(1).times(10**18).toFixed(); 
        let _tokensOut = legos.erc20.usdc.address;

        let tx = await swapInstance.convertETHtoAnyToken(_tokensOut, flashLoanInstance.address, { 
            from : _account, 
            value : _amount, 
            ...gasParams 
        });

        console.log( tx.logs );
        console.log('--------------');

        let usdcBalance = new BigNumber( await usdc.methods.balanceOf(flashLoanInstance.address).call() ).toNumber();
        console.log( 'usdcBalance : ', usdcBalance );

        console.log(' Swap Flashloan Contract USD to Dai');
        let _deadline = new BigNumber( await swapInstance.getNow()).toFixed();
        let tx1 = await flashLoanInstance.testCall( usdcBalance, legos.erc20.usdc.address, legos.erc20.dai.address, flashLoanInstance.address,  _deadline, { 
            from : _account,
            ...gasParams
         });

        console.log( tx1.logs );

        let usdcBalanceUpdated = new BigNumber(await usdc.methods.balanceOf(flashLoanInstance.address).call());
        let daibalance = new BigNumber(await makerDai.methods.balanceOf(flashLoanInstance.address).call());

        assert.equal( usdcBalanceUpdated.isZero(), true);
        assert.equal( daibalance.isZero(), false );
        
        console.log( "Daibalance : ", daibalance.toNumber() );

    });


    it.skip('Should return Account Liquidity', async () => {

        let _borrower = "0x331e97bdf4239313674d1f0d9799d804da4b88ff"; // The borrower address ... 
        let { 0: err, 1:liquidity, 2: shortfall } = await comptroller.methods.getAccountLiquidity(_borrower).call();    
        console.log('Liquidity', liquidity);
        console.log('Shortfall', shortfall);
        assert.equal(err, 0);
    });

    it('Shuld Liquidate From Regular ETH  Account ', async () => {

            let _account = accounts[7];
            let _swapAmount = new BigNumber(1).times(10**18).toFixed();  // 1 eth 

            /* -------------  Function  params ----- */
            let _borrower = "0xde47e99d982b2c1f6c9ace3b20095b5e54ce4aa8"; // The borrower address ... 
            let _repayAmount = new BigNumber(50).times(10**6);  // * 0.5 borrowed amount // To Do : Decimals ... 
            let _cTockenBorrowed = "0x39aa39c021dfbae8fac545936693ac917d5e7563"; 
            let _cTokenCollateral = "0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e"; 
            /* -------------------------------------- */

            console.log(`Create Contract Instances Based on Borrowed Tokens ...`);

            let cTockenBorrowedContract  = new web3.eth.Contract(legos.compound.cToken.abi, _cTockenBorrowed);
            let cTokenCollateralContract = new web3.eth.Contract(legos.compound.cToken.abi, _cTokenCollateral);

            let cTockenBorrowedSymbol = await cTockenBorrowedContract.methods.symbol().call();
            let cTokenCollateralSymbol = await cTokenCollateralContract.methods.symbol().call();

            let cTockenBorrowUnderlyingAddress = await cTockenBorrowedContract.methods.underlying().call();
            let cTokenCollateralUnderlyingAddress = await cTokenCollateralContract.methods.underlying().call();

            let borrowedUnderlyingContract = new web3.eth.Contract(legos.erc20.abi,  cTockenBorrowUnderlyingAddress );
            let collateralUnderlyingContract = new web3.eth.Contract(legos.erc20.abi,  cTokenCollateralUnderlyingAddress );

            let borrowedSymbol = await cTockenBorrowedContract.methods.symbol().call();
            let collateralSymbol = await cTokenCollateralContract.methods.symbol().call();

            console.log('_cTockenBorrowed Symbol :  ', cTockenBorrowedSymbol, cTockenBorrowUnderlyingAddress, borrowedSymbol);
            console.log('_cTokenCollateral Symbol : ', cTokenCollateralSymbol, cTokenCollateralUnderlyingAddress , collateralSymbol );

            //console.log(borrowedUnderlyingContract);
            //************************  Borrow Liquidation Tokens  ********************/

            console.log(`SWAP ETH and get  ${_repayAmount} - ${cTockenBorrowUnderlyingAddress}  `);
            let balanceBeforeSwap = new BigNumber( await borrowedUnderlyingContract.methods.balanceOf(_account).call() );
        
            console.log('Balance Before Swap : ', balanceBeforeSwap.toFixed());

            let tx = await swapInstance.convertETHtoAnyToken(cTockenBorrowUnderlyingAddress, _account, { 
                from : _account, 
                value : _swapAmount, // send swap 1 eth
                ...gasParams 
            });

            let balanceAfterSwap = new BigNumber( await borrowedUnderlyingContract.methods.balanceOf(_account).call() );
            
            console.log('Balance After Swap : ', balanceAfterSwap.toFixed());
            console.log(`Now approve  ${borrowedSymbol}  - ${_repayAmount} to  ${cTockenBorrowUnderlyingAddress}  `);
            
            //---  Example :  approve 15 Bat for cBat Contract for repay amount --//
            await borrowedUnderlyingContract.methods.approve(_cTockenBorrowed, _repayAmount.toFixed() ).send({ from : _account,... gasParams });

            console.log('Check Allowance ... ');
            
            let allowance = await borrowedUnderlyingContract.methods.allowance( _account, _cTockenBorrowed).call();
            console.log('Allowance : ', allowance);

            console.log('Check cToken Balance before Liquidation');

            let cTokenBalanceBeforeLiquidaton = new BigNumber( await cTokenCollateralContract.methods.balanceOf(_account).call() );
            console.log(`${cTokenCollateralSymbol} Balance before liquidation is ${cTokenBalanceBeforeLiquidaton.toFixed()} `);

            let txLiquidate = await cTockenBorrowedContract.methods.liquidateBorrow(_borrower, _repayAmount.toFixed(), _cTokenCollateral).send({ 
                from : _account, 
                ...gasParams 
            });
            
            //console.log(txLiquidate.events);
            let { Failure } = txLiquidate.events;
            console.log('-------------------------------------------')
            console.log(':::::::::::::: RETURN VALUES ::::::::::::::');
    
            if(Failure) {
                console.log('We Found Failure Event in Trabsaction Decode it !!! ');
                let { error , info,  detail } = Failure.returnValues;
                
                console.log(` Error: ${error} , Info: ${ info } Detail: ${detail}  `);
                console.log('Error Desc : ', Error[error] );
                console.log('Failure Info :  : ', FailureInfo[info] );

            } else {
                console.log('NO FAILURE !!! Woohooo ... ');
            }
            
            
            console.log('Check CToken balance After liquidation');
            
            let cTokenBalanceAfterLiquidaton = new BigNumber( await cTokenCollateralContract.methods.balanceOf(_account).call() );
            console.log(`${cTokenCollateralSymbol} Balance After liquidation is :  ${cTokenBalanceAfterLiquidaton.toFixed()} `);
            
            console.log(`Redeem of ${cTokenBalanceAfterLiquidaton.toFixed()} - ${cTokenCollateralSymbol}  AND Get <?> ${collateralSymbol} Underlying Asstes`);
            let undelyingTokenBalanceBeforeRedeem = new BigNumber( await collateralUnderlyingContract.methods.balanceOf(_account).call() );

            console.log( 'undelyingTokenBalanceBeforeRedeem : ', undelyingTokenBalanceBeforeRedeem.toNumber() );

            let txRedeem = await cTokenCollateralContract.methods.redeem(cTokenBalanceAfterLiquidaton.toFixed()).send({ 
                from: _account, 
                ...gasParams  
            });

            //console.log(txRedeem);

            let undelyingTokenBalanceAfterRedeem = new BigNumber( await collateralUnderlyingContract.methods.balanceOf(_account).call() );
            let cTokenBalanceAfterRedeem = new BigNumber( await cTokenCollateralContract.methods.balanceOf(_account).call() );

            console.log(`${cTokenCollateralSymbol} Balance After Redeem is :  ${cTokenBalanceAfterRedeem.toFixed()} `);
            console.log(`undelyingToken  ${collateralSymbol} Balance After Redeem is : ${undelyingTokenBalanceAfterRedeem.toNumber()} `);

            
            console.log(' ---- START SWAP TO ETHER ? OR USDC  ---- ');
            
            // Send my tokens to uniswap 
            await collateralUnderlyingContract.methods.transfer(flashLoanInstance.address, undelyingTokenBalanceAfterRedeem.toFixed()).send({ 
                from : _account,
                ... gasParams
            });

            // let txApprove = await 
            //     borrowedUnderlyingContract.methods.approve(swapInstance.address,  undelyingTokenBalanceAfterRedeem.toFixed()).send({
            //     from : _account,
            //     ... gasParams
            // });

            // uint _tokenInAmount, address _tokenInAddress, address _tokenOutAddress, address _to, uint _deadline

            let txSwapTokenToToken = await swapInstance.convertTokensToTokens(
                undelyingTokenBalanceAfterRedeem.toFixed(), 
                cTokenCollateralUnderlyingAddress, 
                cTockenBorrowUnderlyingAddress,
                _account,
                new BigNumber(await swapInstance.getNow()).toFixed(),
            
            { 
                from : _account, 
                ...gasParams 
            });

            let balanceAfterCollaterralSwap = new BigNumber( await borrowedUnderlyingContract.methods.balanceOf(_account).call() );
            let diff = balanceAfterSwap.minus(balanceAfterCollaterralSwap).div(10**6);

            console.log( ` 
                        Start Balance of ${borrowedSymbol} was : ${balanceAfterSwap.div(10**6).toFixed()} 
                        -- minus -- 
                        Final balance After Collateral Swap is : ${balanceAfterCollaterralSwap.div(10**6).toFixed() } 
                        ----
                        = ${diff.toFixed()}
            `)


    });

    it.skip('Call Liquidation', async () => { 

        let usdcHolder = accounts[6];
        console.log('Swap Ether To Tokens &Send To Contract');
        let _amount = new BigNumber(1).times(10**18).toFixed();  // 1 eth 
        let _tokensOut = legos.erc20.usdc.address;

        let tx = await swapInstance.convertETHtoAnyToken(_tokensOut, usdcHolder, { 
            from : usdcHolder, 
            value : _amount, 
            ...gasParams 
        });

        //console.log( "USDCHoder Balance : ",  await web3.eth.getBalance(usdcHolder) );
        
        await usdc.methods.transfer( flashLoanInstance.address, (new BigNumber(20).times(10**6)).toFixed()).send({ 
            from : usdcHolder,
            ... gasParams
        });
        
        let flashloanUsdcBalance = await usdc.methods.balanceOf(flashLoanInstance.address).call();
        console.log( 'Flashloan Balance : ',  new BigNumber(flashloanUsdcBalance).div(10**6).toNumber() );
        
        console.log('Set Comptorller Interface : ');
        let _comptrollerAddress = legos.compound.comptroller.address; // "0x3d9819210a31b4961b30ef54be2aed79b9c9cd3b"; 
        let txSetComptroller = await flashLoanInstance.setComptroller(_comptrollerAddress, { from : accounts[0] });

        console.log('Call Flashloan Function !!! ');
        //let txData = web3.eth.abi.encodeParameters([ 'uint256' ], [66666]);
        
        let _borrower = "0x331e97bdf4239313674d1f0d9799d804da4b88ff"; // The borrower address ... 
        let _repayAmount = new BigNumber(5).times(10**6); 
        let _cTockenBorrowed = "0x39aa39c021dfbae8fac545936693ac917d5e7563"; //legos.compound.cUSDC.address; // <-typo: "0x39aa39c021dfbae8fac545936693ac917d5e7563"; // cUscd
        let _cTokenCollateral = "0xf5dce57282a584d2746faf1593d3121fcac444dc"; //legos.compound.cDAI.address; // "0xf5dce57282a584d2746faf1593d3121fcac444dc"; // cDai

        await usdc.methods.approve(  _cTockenBorrowed, _repayAmount );
        let txDirect = await cUsdc.methods.liquidateBorrow( _borrower, _repayAmount.toFixed(), _cTokenCollateral).send(
            {
                from : usdcHolder,
                ...gasParams
            })

        console.log(txDirect.events.Failure);

        // let txFlashloan =   await debug (
        //     flashLoanInstance.flashloan(_borrower, _repayAmount, _cTockenBorroued, _cTokenCollateral ,
        //         {from : accounts[7], data : txData, ... gasParams }) );
        // 

        // let txFlashloan = await flashLoanInstance.flashloan(_borrower, _repayAmount, _cTockenBorroued, _cTokenCollateral,{
        //     from : accounts[7], 
        //     ... gasParams 
        // });
        
        // console.log(txFlashloan.logs);

        // console.log('-----------------------');

        // txFlashloan.logs.map( (log) => {
        //     console.log('Event: ', log.events);
        //     console.log('Args : ', log.args);
        //     console.log('**------------**');
        // });

        // console.log('-----------------------');

        // let _err = txFlashloan.logs[1].args._err;
        // let errocode = new BigNumber(_err).toNumber();

        // console.log('Liquidation Error Code : ', new BigNumber(_err).toFixed());
        // console.log('Liquidation Error Text : ', errocodes[errocode] );

        // let { 1:liquidity, 2: shortfall } = await comptroller.methods.getAccountLiquidity(_borrower).call();    
        // console.log('Liquidity', liquidity);
        // console.log('Shortfall', shortfall);

        // let flashloanUsdcBalance1 = await usdc.methods.balanceOf(flashLoanInstance.address).call();
        // console.log( 'Flashloan Balance After Liquidation: ', new BigNumber(flashloanUsdcBalance1).dividedBy(10**6).toNumber() );
        
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