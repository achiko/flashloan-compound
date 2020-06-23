pragma solidity ^0.5.15;

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

    uint256 public fee;
    address public owner;
    address public USDCAddress;
    address public DaiAddress;

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
        external
    {
        require(_amount <= getBalanceInternal(address(this), _reserve), "Invalid balance, was the flashLoan successful?");
        emit ExecuteOpreationEvent(_reserve, _amount, _fee, _params);

        /* Decode _params */
        (address _borrower, uint _repayAmount,
            address _cTockenRepay,
            address _cTokenCollateral) = abi.decode(_params,(address,uint,address,address));

        /* Get Account Liqudity Again before Contract Call */
        /*
        (uint err, uint liquidity, uint shortfall) = comptroller.getAccountLiquidity(_borrower);
        emit GetAccountLiquidity(err, liquidity, shortfall);
        */

        /** To Do :  Add require flag here liquidity Shortfall != 0 */

        /* Approve Tokens  */
        /* Get Underlying Token address Bat, Usdc etc...  */
        address underlyingAddress = CErc20Storage(_cTockenRepay).underlying();
        emit GetUnderlyingAddress(underlyingAddress);

        /* Approve this(address) for underlying token  */
        IERC20(underlyingAddress).approve(address(this), _repayAmount);

        /* Call Comptroller Liquidation */
        /* liquidateBorrow(address borrower, uint repayAmount, CTokenInterface cTokenCollateral) */
        (uint err) = CErc20Interface(_cTockenRepay).liquidateBorrow(_borrower, _repayAmount, CTokenInterface(_cTokenCollateral));
        emit LiquidationEvent(err);

        /* Redeem Liquidated assets From CToken */

        /* Check CToken Balance */

        /* Start Uniswap Procedure */


        // Time to transfer the funds back
        fee = _fee;

        uint totalDebt = _amount.add(_fee);
        transferFundsBackToPoolInternal(_reserve, totalDebt);
    }


    function flashloan(address _borrower, uint _repayAmount, CTokenInterface _cTockenRepay, CTokenInterface _cTokenCollateral) public {

        /* Encode Passed Data */
        bytes memory data = abi.encode(_borrower,_repayAmount,_cTockenRepay,_cTokenCollateral);

        /* To Do Modyfy by passed repayAmount */
        uint amount = 1 ether;
        address asset = address(0x6B175474E89094C44Da98b954EedeAC495271d0F); // Mainnet DAI

        ILendingPool lendingPool = ILendingPool(addressesProvider.getLendingPool());
        lendingPool.flashLoan(address(this), asset, amount, data);
    }


    function setComptroller(ComptrollerInterface _comptroller) public {
        comptroller = _comptroller;
    }


    // function getContractBalance() public returns 
    // function getContractErc20Balance() public returns
    
    // function  transferTokens( _toAddress ) 

}