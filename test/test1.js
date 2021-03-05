let Flashloan = artifacts.require("Flashloan");
// let Swap = artifacts.require("Swap");

const Web3 = require("web3");
const web3 = new Web3("http://127.0.0.1:8545");

const { legos } = require("@studydefi/money-legos");

const { Error, FailureInfo } = require("./data/errocdes.json");

const PriceOracleProxyAbi = require("./data/PriceOracleProxy.json");
const BigNumber = require("bignumber.js");

const makerDai = new web3.eth.Contract(
  legos.erc20.dai.abi,
  legos.erc20.dai.address
);
const cEth = new web3.eth.Contract(
  legos.compound.cEther.abi,
  legos.compound.cEther.address
);

const comptroller = new web3.eth.Contract(
  legos.compound.comptroller.abi,
  legos.compound.comptroller.address
);
const priceOracle = new web3.eth.Contract(
  PriceOracleProxyAbi,
  "0xDDc46a3B076aec7ab3Fc37420A8eDd2959764Ec4"
);

const dai = new web3.eth.Contract(legos.erc20.dai.abi, legos.erc20.dai.address); // dublicate
const usdc = new web3.eth.Contract(
  legos.erc20.usdc.abi,
  legos.erc20.usdc.address
);

const cDai = new web3.eth.Contract(
  legos.compound.cDAI.abi,
  "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"
); // manual add cDai ...
const cUsdc = new web3.eth.Contract(
  legos.compound.cUSDC.abi,
  legos.compound.cUSDC.address
);

const cEthAddress = legos.compound.cEther.address;
const cDaiAddress = legos.compound.cDAI.address;

const gasParams = {
  gasLimit: web3.utils.toHex(4500000), // posted at compound.finance/developers#gas-costs
  gasPrice: web3.utils.toHex(500000000000), // 500000000000
};

const bignum = (value) => new BigNumber(value); // just shorten bignum initialisation

let flashLoanInstance = null;
let swapInstance = null;

contract("Flashloan", (accounts) => {
  before("Setup Contracts ..... ", async () => {
    flashLoanInstance = await Flashloan.deployed();
    // swapInstance = await Swap.deployed();
  });

  it("Call Liquidation", async () => {
    let _account = accounts[0]; // the owner !!!

    // await web3.eth.sendTransaction({
    //     from : accounts[9],
    //     to : flashLoanInstance.address,
    //     value : bignum(0.6).times(10**18).toFixed(),
    //     ... gasParams
    // });

    let flashloanBalance = await web3.eth.getBalance(flashLoanInstance.address);
    console.log("Flashloan Instance ETH Balance : ", flashloanBalance, "wei");

    /* -------------  Function  params ----------- */
    // 1850 000000
    let _borrower = "0x14029b6e9ea11ea16adcaa16c57fe904d2d73580"; // The borrower address ...
    let _repayAmount = new BigNumber(0.22).times(10 ** 18).div(2); //
    let _cTokenBorrowed = "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5"; //
    let _cTokenCollateral = "0x5d3a536e4d6dbd6114cc1ead35777bab948e3643"; //

    // let { borrowedUnderlyingContract } = await generateContracts(_cTokenBorrowed, _cTokenCollateral);
    // console.log(' Start balance :   ', await borrowedUnderlyingContract.methods.balanceOf( flashLoanInstance.address ).call());

    /* -------------------------------------- */
    let tx = await flashLoanInstance.flashloan(
      _borrower,
      _repayAmount.toFixed(),
      _cTokenBorrowed,
      _cTokenCollateral,
      {
        from: _account,
        ...gasParams,
      }
    );

    console.log("------------");
    console.log(tx.logs);

    //console.log('Final Balance : ', await web3.eth.getBalance(flashLoanInstance.address));

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

    console.log("-------------");

    // let _balance = await borrowedUnderlyingContract.methods.balanceOf( flashLoanInstance.address ).call();
    // let _symbol = await borrowedUnderlyingContract.methods.symbol().call();
    // console.log('Token : ', _symbol, ' Balance == ', new BigNumber(_balance).div(10**6).toNumber());

    assert(true, true);
  });
});

async function generateContracts(_cTokenBorrowed, _cTokenCollateral) {
  let cTokenBorrowUnderlyingAddress = null;
  let cTokenCollateralUnderlyingAddress = null;
  let borrowedUnderlyingContract = null;
  let collateralUnderlyingContract = null;

  let cTokenBorrowedContract = new web3.eth.Contract(
    legos.compound.cToken.abi,
    _cTokenBorrowed
  );
  let cTokenCollateralContract = new web3.eth.Contract(
    legos.compound.cToken.abi,
    _cTokenCollateral
  );

  let cTokenBorrowedSymbol = await cTokenBorrowedContract.methods
    .symbol()
    .call();
  let cTokenCollateralSymbol = await cTokenCollateralContract.methods
    .symbol()
    .call();

  if (cTokenBorrowedSymbol !== "cETH") {
    cTokenBorrowUnderlyingAddress = await cTokenBorrowedContract.methods
      .underlying()
      .call();
    borrowedUnderlyingContract = new web3.eth.Contract(
      legos.erc20.abi,
      cTokenBorrowUnderlyingAddress
    );
  }

  if (cTokenCollateralSymbol !== "cETH") {
    cTokenCollateralUnderlyingAddress = await cTokenCollateralContract.methods
      .underlying()
      .call();
    collateralUnderlyingContract = new web3.eth.Contract(
      legos.erc20.abi,
      cTokenCollateralUnderlyingAddress
    );
  }

  console.log(
    "cTokenBorrowUnderlyingAddress :  ",
    cTokenBorrowedSymbol,
    cTokenBorrowUnderlyingAddress
  );
  console.log(
    "cTokenCollateralUnderlyingAddress :  ",
    cTokenCollateralSymbol,
    cTokenCollateralUnderlyingAddress
  );

  return {
    cTokenBorrowedContract: cTokenBorrowedContract,
    cTokenCollateralContract,
    cTokenBorrowedSymbol: cTokenBorrowedSymbol,
    cTokenCollateralSymbol,
    borrowedUnderlyingContract,
    collateralUnderlyingContract,
  };
}
