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
    event RedddemEvent(uint _redeemError);
    event Test(address pool, uint amount);

    uint256 public fee;
    address public owner;

    // address public USDCAddress;
    // address public DaiAddress;

    ComptrollerInterface public comptroller;

    
    constructor() public {
        owner = msg.sender;
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

        /* Decode _params */
        (
            address _borrower,
            uint _repayAmount,
            address _cTockenRepay,
            address _cTokenCollateral

        ) = abi.decode(_params,(address,uint,address,address));

        /* Get Account Liqudity Again before Contract Call */
        // (uint err, uint liquidity, uint shortfall) = comptroller.getAccountLiquidity(_borrower);
        // //emit GetAccountLiquidity(err, liquidity, shortfall);
        // require(err == 0, "Error getAccountLiquidity Function");
        // require(shortfall != 0, "Account is healthy");
        // require(liquidity == 0, "Account is healthy");

        /* Get Underlying Token address Bat, Usdc etc...  */
        address underlyingAddress = CErc20Storage(_cTockenRepay).underlying();
        //emit GetUnderlyingAddress(underlyingAddress);

        /* Approve this(address) for underlying token  */
        IERC20(underlyingAddress).approve(_cTockenRepay, _repayAmount);

        /* Call Comptroller Liquidation */
        (uint err1) = CErc20Interface(_cTockenRepay).liquidateBorrow(_borrower, _repayAmount, CTokenInterface(_cTokenCollateral));
        //emit LiquidationEvent(err1);
        //require(err1==0, "Liquidation Error !!! ");

        /* Get CToken Balance */
        uint cTokenBalance = CTokenInterface(_cTokenCollateral).balanceOf(address(this));
        emit CTokenBalance(cTokenBalance);
        
        /* Redeem Liquidated assets From CToken */
        (uint err2) = CErc20Interface(_cTokenCollateral).redeem(cTokenBalance);
        emit RedddemEvent(err2);

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
        CTokenInterface _cTockenRepay,
        CTokenInterface _cTokenCollateral
    )
        public
    {

        /* Encode Passed Data */
        bytes memory data = abi.encode(_borrower,_repayAmount,_cTockenRepay,_cTokenCollateral);
        /* Get Underlying Token address Bat, Usdc etc...  */
        address underlyingAddress = CErc20Storage(address(_cTockenRepay)).underlying();

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