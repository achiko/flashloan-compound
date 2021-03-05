let FlashloanUSDC = artifacts.require("FlashloanUSDC");
const Web3 = require("web3");
const web3 = new Web3("http://127.0.0.1:8545");
const BigNumber = require("bignumber.js");
const { legos } = require("@studydefi/money-legos");
const gasParams = {
    gasLimit: web3.utils.toHex(4500000), // posted at compound.finance/developers#gas-costs
    gasPrice: web3.utils.toHex(500000000000), // 500000000000
};

const bignum = (value) => new BigNumber(value); // just shorten bignum initialisation

let flashLoanInstance = null;
let swapInstance = null;

contract("Flashloan USDC", (accounts) => {

    before("Setup Contracts ..... ", async () => {
        flashLoanInstance = await FlashloanUSDC.deployed();
    });

    it("Executes Flashloan USDC", async () => {

        let _account = accounts[0];

        /* -------------  Function  params ----------- */
        let _borrower = "0xa8a4db788bdef9cd32ac8b6ce8529f7aa0560213"; // The borrower address ...
        let _repayAmount = new BigNumber(950).times(10 ** 6).div(2); //
        let _cTokenBorrowed = "0x39aa39c021dfbae8fac545936693ac917d5e7563"; //
        let _cTokenCollateral = "0x39aa39c021dfbae8fac545936693ac917d5e7563"; //
        /* -------------------------------------- */

        const {
            cTokenBorrowedContract,
            cTokenBorrowedSymbol,
            cTokenCollateralContract,
            cTokenCollateralSymbol,
            borrowedUnderlyingContract,
            collateralUnderlyingContract,
        } = await generateContracts(_cTokenBorrowed, _cTokenCollateral);

        console.log("cTokenBorrowedSymbol : ", cTokenBorrowedSymbol);
        console.log("cTokenCollateralSymbol : ", cTokenCollateralSymbol);

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
        console.log(tx);


        assert.isTrue(true);
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
        cTokenBorrowedContract,
        cTokenBorrowedSymbol,
        cTokenCollateralContract,
        cTokenCollateralSymbol,
        borrowedUnderlyingContract,
        collateralUnderlyingContract,
    };
}
