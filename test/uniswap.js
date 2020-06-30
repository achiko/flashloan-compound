let Flashloan = artifacts.require("Flashloan");
let Swap = artifacts.require("Swap");
const { legos }  = require("@studydefi/money-legos");
const UniswapV2Router02Abi = require('./data/UniswapV2Router02.json');
const BigNumber = require('bignumber.js');
const Web3 = require('web3');
const web3 = new Web3('http://127.0.0.1:8546'); // local focked chain.


let swapInstance = null;
const uniswapV2RouterInstance = new web3.eth.Contract(UniswapV2Router02Abi, "0x7a250d5630b4cf539739df2c5dacb4c659f2488d");
const makerDai = new web3.eth.Contract(legos.erc20.dai.abi, legos.erc20.dai.address);
const usdc = new web3.eth.Contract(legos.erc20.usdc.abi, legos.erc20.usdc.address);

const gasParams = {
    gasLimit: web3.utils.toHex(1500000),      // posted at compound.finance/developers#gas-costs
    gasPrice: web3.utils.toHex(90000000000), // use ethgasstation.info (mainnet only) 40000000000
};

contract('Flashloan', accounts  => { 

    before('Setup Contract', async () => { 
        swapInstance = await Swap.deployed();
        console.log('Swap Contract Address : ', swapInstance.address);
        
    });


    it('Test Smartcontract Functions', async () => {

        let _account = accounts[3];
        
        // Get Pairs 
        let _path = await swapInstance.getPathForETHtoDAI();
        console.log(_path); //['0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2','0x6B175474E89094C44Da98b954EedeAC495271d0F']

        let _deadline = new BigNumber( await swapInstance.getNow()).toFixed();
        console.log('Deadline : ', new BigNumber(_deadline).toFixed());

        let daiAmount = new BigNumber(150).times(10**18).toFixed();
        let estimatedETHforDAI = await swapInstance.getEstimatedETHforDAI(daiAmount);
        
        let _etAmount = new BigNumber(estimatedETHforDAI[0]).times(12*10**6).div(10**6).toFixed();
        let _daiAmount = new BigNumber(estimatedETHforDAI[1]).toFixed();

        console.log('Estimate 1 : ', new BigNumber(estimatedETHforDAI[0]).toFixed());
        console.log('Estimate 2 : ', new BigNumber(estimatedETHforDAI[1]).toFixed());

        let tx = await uniswapV2RouterInstance.methods.swapETHForExactTokens(_daiAmount, _path, _account , _deadline ).send({
            from : _account,
            value : _etAmount,
            ...gasParams
        });

        let daiABlance  = await makerDai.methods.balanceOf(_account).call();
        console.log( 'Dai Balance : ', new BigNumber(daiABlance).toNumber() );

        assert.equal(daiABlance , daiAmount, 'Swap was not successfull');

        // Just send to smartcontract avaliable dai balance !!! 
        await makerDai.methods.transfer(swapInstance.address, daiABlance).send({ from : _account, ...gasParams });

        //await makerDai.methods.approve(swapInstance.address, daiABlance);

        // Call convertTokensToTokens Function in uniswap 
        // function convertTokensToTokens(uint _tokenInAmount, address _tokenInAddress, address _tokenOutAddress, address _to, uint _deadline) public payable {

        let _tokenInAmount = daiABlance;
        let _tokenInAddress = legos.erc20.dai.address;
        let _tokenOutAddress = legos.erc20.usdc.address;
        let _to = _account; // W? 
        let _deadline1 = new BigNumber( await swapInstance.getNow() ).toFixed();
        
        let tx1  = await swapInstance.convertTokensToTokens(_tokenInAmount, _tokenInAddress, _tokenOutAddress, _to, _deadline1, { 
            from : _account,
            ...gasParams
        });

        console.log(tx1.logs);
        console.log('---------------');

        console.log('USDC Balance : ', await usdc.methods.balanceOf(_account).call() );

    });

    it.skip('Should Swap Tokens ... ', async () => {  

        let addressWeth = await uniswapV2RouterInstance.methods.WETH().call();
        // console.log('Factory Address : ', factoryAddress);

        let daiAmount = new BigNumber(150).times(10**18);
        let ethAmount = new BigNumber(1).times(10**18);
        let deadline = new Date().getTime() + 300000;
        let path = [addressWeth, legos.erc20.dai.address];
        let account = accounts[2];

        // function swapETHForExactTokens(uint amountOut, address[] calldata path, address to, uint deadline)
        let tx = await uniswapV2RouterInstance.methods.swapETHForExactTokens(daiAmount.toFixed(), path, account , deadline ).send({
            from : account,
            value : ethAmount.toFixed(),
            ...gasParams
        });

        console.log('----------------');
        console.log(tx.events);
        

        //let tx = await swapInstance.convertEthToDai(daiAmount, { from : accounts[2], value : ethAmount });
        // console.log(tx.receipt);

        let daiABlance  = await makerDai.methods.balanceOf(accounts[2]);
        console.log( 'Dai Balance : ', new BigNumber(daiABlance).toNumber() );

        // let contractDaibalance  = await makerDai.methods.balanceOf( swapInstance.address );
        // console.log( 'Dai Balance : ', new BigNumber(contractDaibalance).dividedBy(10*18));

        assert(true, true);
    });

});

