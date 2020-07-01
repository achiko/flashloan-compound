//pragma solidity ^0.5.15;
pragma solidity >=0.6.2;

import "./aave/FlashLoanReceiverBase.sol";
import "./aave/ILendingPoolAddressesProvider.sol";
import "./aave/ILendingPool.sol";

import "./openzeppelin/IERC20.sol";

import "./compound/CTokenInterfaces.sol";
import "./compound/ComptrollerInterface.sol";


contract Flashloan is FlashLoanReceiverBase {

    event ExecuteOpreationEvent( address _reserve, uint256 _amount, uint256 _fee, bytes _params);
    event DecodePassedData( bytes data );
    event UintLog(uint value);
    event GetAccountLiquidity( uint Error, uint liquidity, uint shortfall );
    event GetUnderlyingAddress(address _underlyingaddress);
    event LiquidationEvent(uint _err);
    event CTokenBalance(uint _balance);
    event RedeemEvent(uint _redeemError);
    event Test(address pool, uint amount);

    uint256 public fee;
    address public owner;

    // address public USDCAddress;
    // address public DaiAddress;

    ComptrollerInterface public comptroller;

    constructor() public {
        owner = msg.sender;
    }


    struct FlashloanLocalVars  {

        address _borrower;
        uint _repayAmount;
        address _cTokenRepay;
        address _cTokenCollateral;

        uint getLiquidityError;
        uint liquidity;
        uint shortfall;
        
        address underlyingAddress;

        uint liquidateBorrowError;
        uint cTokenBalance;  // ctoken Balance after Liquidation
        uint redeemErrorCode;
    }
    
    function executeOperation(
        address _reserve,
        uint256 _amount,
        uint256 _fee,
        bytes calldata _params
    )
        external override
    {
        require(_amount <= getBalanceInternal(address(this), _reserve), "Invalid balance, was the flashLoan successful?");
        //emit ExecuteOpreationEvent(_reserve, _amount, _fee, _params);

        FlashloanLocalVars memory vars;

        /* Decode _params */
        (
            vars._borrower,
            vars._repayAmount,
            vars._cTokenRepay,
            vars._cTokenCollateral

        ) = abi.decode(_params,(address,uint,address,address));

        /* Get Account Liqudity Again before Contract Call */
        ( vars.getLiquidityError, vars.liquidity, vars.shortfall  ) = comptroller.getAccountLiquidity(vars._borrower);

        require(vars.getLiquidityError == 0, "Error getAccountLiquidity Function");
        require(vars.liquidity == 0, "Account is healthy");
        require(vars.shortfall != 0, "Account is healthy");

        /* Get Underlying Token address Bat, Usdc etc...  */
        vars.underlyingAddress = CErc20Storage(vars._cTokenRepay).underlying();
        //emit GetUnderlyingAddress(underlyingAddress);

        /* Approve this(address) for underlying token  */
        IERC20(vars.underlyingAddress).approve(vars._cTokenRepay, vars._repayAmount);

        /* Call Comptroller Liquidation */
		vars.liquidateBorrowError =	CErc20Interface(vars._cTokenRepay).liquidateBorrow(
                vars._borrower,
                vars._repayAmount,
                CTokenInterface(vars._cTokenCollateral)
            );
        // emit LiquidationEvent(err1);
        require(vars.liquidateBorrowError==0, "Call Liquidation Error !!! ");

        /* Get CToken Balance */
        vars.cTokenBalance = CTokenInterface(vars._cTokenCollateral).balanceOf(address(this));
        emit CTokenBalance(vars.cTokenBalance);

        /* Redeem Liquidated assets From CToken */
        vars.redeemErrorCode = CErc20Interface(vars._cTokenCollateral).redeem(vars.cTokenBalance);
        emit RedeemEvent(vars.redeemErrorCode);
        require(vars.redeemErrorCode == 0, "Redeem Token Error");

        /* Start Uniswap Procedure */

        /* If Collatreall asset is Dai or USDC or USDT do not run uniswap selling procedure */

        // Time to transfer the funds back
        fee = _fee;

        uint totalDebt = _amount.add(_fee);
        transferFundsBackToPoolInternal(_reserve, totalDebt);
    }



    function flashloan(
        address _borrower,
        uint _repayAmount,
        CTokenInterface _cTokenRepay,
        CTokenInterface _cTokenCollateral
    )
        public
    {

        /* Encode Passed Data */
        bytes memory data = abi.encode(_borrower,_repayAmount,_cTokenRepay,_cTokenCollateral);
        /* Get Underlying Token address Bat, Usdc etc...  */
        address underlyingAddress = CErc20Storage(address(_cTokenRepay)).underlying();

        //emit Test(asset, amount);
        ILendingPool lendingPool = ILendingPool(addressesProvider.getLendingPool());
        lendingPool.flashLoan(address(this), underlyingAddress, _repayAmount, data);
    }


    function setComptroller(ComptrollerInterface _comptroller) public {
        comptroller = _comptroller;
    }


    // function getContractBalance() public returns 
    // function getContractErc20Balance() public returns
    // function  transferTokens( _toAddress ) 

}