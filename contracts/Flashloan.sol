//pragma solidity ^0.5.15;
pragma solidity >=0.6.2;

import "./aave/FlashLoanReceiverBase.sol";
import "./aave/ILendingPoolAddressesProvider.sol";
import "./aave/ILendingPool.sol";
import "./openzeppelin/IERC20.sol";
import "./compound/CTokenInterfaces.sol";
import "./compound/ComptrollerInterface.sol";
import './uniswap/IUniswapV2Router02.sol';


contract Flashloan is FlashLoanReceiverBase {

	event LogConvertTokensToTokensEvent(
		uint _tokenInAmount,
		address _tokenInAddress,
		address _tokenOutAddress,
		address _to,
		uint _deadline,
		uint[] amounts
	);

    event ExecuteOpreationEvent( address _reserve, uint256 _amount, uint256 _fee, bytes _params);
    event GetAccountLiquidity( uint Error, uint liquidity, uint shortfall );
    event GetUnderlyingAddress(address _underlyingaddress);

	event AccountTokenBalance(bool approveResponse, uint256 allowance, address cTokenRepay, address token,  uint balance, uint repayAmount);

    event LiquidationEvent(uint _err);
    event CTokenBalance(uint _balance);
    event RedeemEvent(uint _redeemError);
    

    uint256 public fee;
    address public owner;

	address internal constant UNISWAP_ROUTER_ADDRESS = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
	IUniswapV2Router02 public uniswapRouter;

    address internal constant CETH_ADDRESS = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5;
    address internal ETH_RESERVE_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    ComptrollerInterface public comptroller;

    constructor() public {
        owner = msg.sender;
		uniswapRouter = IUniswapV2Router02(UNISWAP_ROUTER_ADDRESS);
    }

	// receive() payable external {}

    struct FlashloanLocalVars  {

        address _borrower;
        uint _repayAmount;
        address _cTokenRepay;
        address _cTokenCollateral;

        uint getLiquidityError;
        uint liquidity;
        uint shortfall;
        address underlyingAddress;
		address underlyingAddress1; // _cTokenCollateral underlying address
        
		uint liquidateBorrowError;
		uint liquidateBorrowError1;

        uint cTokenBalance;  // ctoken Balance after Liquidation
        uint redeemErrorCode;

		bool approveResponse;
		uint256 allowance;

		uint liquidatedAssetBalance;
    }
    
    function executeOperation(address _reserve, uint256 _amount, uint256 _fee, bytes calldata _params) external override {
        require(_amount <= getBalanceInternal(address(this), _reserve), "Invalid balance, was the flashLoan successful?");
        
        FlashloanLocalVars memory vars;

        /* Decode _params */
        (
            vars._borrower,
            vars._repayAmount,
            vars._cTokenRepay,
            vars._cTokenCollateral

        ) = abi.decode(_params,(address,uint,address,address));


        /* Get Underlying address of cTokenRepay  when cTokenRepay !== cETH */
        if(vars._cTokenRepay != CETH_ADDRESS) { 
            vars.underlyingAddress = CErc20Storage(vars._cTokenRepay).underlying();
        }
        
        /* Get Underlying address  of colatreal  when _collateral !== cETH  */
        if(vars._cTokenCollateral != CETH_ADDRESS) {
            vars.underlyingAddress1 = CErc20Storage(vars._cTokenCollateral).underlying(); 
        }

        
        if( vars._cTokenRepay == CETH_ADDRESS ) {
            uint liquidateBorrowError = CETHInterface(vars._cTokenRepay).liquidateBorrow{value : vars._repayAmount}
                                        ( vars._borrower, CTokenInterface(vars._cTokenCollateral) );
            emit LiquidationEvent(liquidateBorrowError);
        }
        
        if(vars._cTokenRepay != CETH_ADDRESS) { 
            // Here Add Approve 
            vars.liquidateBorrowError = CErc20Interface(vars._cTokenRepay).liquidateBorrow(
                        vars._borrower,
                        vars._repayAmount,
                        CTokenInterface(vars._cTokenCollateral)
                    );
        }


        fee = _fee;
        uint totalDebt = _amount.add(_fee);
        transferFundsBackToPoolInternal(_reserve, totalDebt);
    }

    /////////////////////////////////////////
    /////////////////////////////////////////
    function executeOperationS(
        address _reserve,
        uint256 _amount,
        uint256 _fee,
        bytes calldata _params
    )
        //external override
        external
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
		/*
            (vars.getLiquidityError, vars.liquidity, vars.shortfall) = comptroller.getAccountLiquidity(vars._borrower);

            require(vars.getLiquidityError == 0, "Error getAccountLiquidity Function");
            require(vars.liquidity == 0, "Account is healthy");
            require(vars.shortfall != 0, "Account is healthy");
        */

        /* Get Underlying Token address Bat, Usdc etc...  */
        vars.underlyingAddress = CErc20Storage(vars._cTokenRepay).underlying();

        if(vars._cTokenCollateral != CETH_ADDRESS) {
            /* Get Underlying address  of colatreal  when _collateral !== cETH !!! */
            vars.underlyingAddress1 = CErc20Storage(vars._cTokenCollateral).underlying(); 
        }
        

        // emit GetUnderlyingAddress(vars.underlyingAddress);
		// emit GetUnderlyingAddress(vars.underlyingAddress1);

        /* Approve this(address) for underlying token */
        vars.approveResponse = IERC20(vars.underlyingAddress).approve(vars._cTokenRepay, vars._repayAmount);
		vars.allowance = IERC20(vars.underlyingAddress).allowance(address(this), vars._cTokenRepay);

		uint tokenBalance = IERC20(vars.underlyingAddress).balanceOf(address(this));
		emit AccountTokenBalance(vars.approveResponse, vars.allowance, vars._cTokenRepay, vars.underlyingAddress, tokenBalance, vars._repayAmount);

        /* Call Comptroller Liquidation */
		//vars.liquidateBorrowError 
    

        // uniswapRouter.swapExactETHForTokens{value : msg.value}(0, path, _to, getNow()); //

        if( vars._cTokenRepay == CETH_ADDRESS ) {
            vars.liquidateBorrowError = CETHInterface(vars._cTokenRepay).liquidateBorrow{value : vars._repayAmount}( vars._borrower, CTokenInterface(vars._cTokenCollateral) );
        }else{ 
		
            vars.liquidateBorrowError = CErc20Interface(vars._cTokenRepay).liquidateBorrow(
                        vars._borrower,
                        vars._repayAmount,
                        CTokenInterface(vars._cTokenCollateral)
                    );
        }


        emit LiquidationEvent(vars.liquidateBorrowError);

        require(vars.liquidateBorrowError == 0, "Call Liquidation Error !!! ");

        /* Get CToken Balance */
        vars.cTokenBalance = CTokenInterface(vars._cTokenCollateral).balanceOf(address(this));
        emit CTokenBalance(vars.cTokenBalance);

        /* Redeem Liquidated assets From CToken */	
	    vars.redeemErrorCode = CErc20Interface(vars._cTokenCollateral).redeem(vars.cTokenBalance);
        emit RedeemEvent(vars.redeemErrorCode);
        require(vars.redeemErrorCode == 0, "Redeem Token Error");

        /* Start Uniswap Procedure */
		/* Get luqudated ERC20 balance */
		
        if(vars._cTokenCollateral != CETH_ADDRESS ) { 
            /* Swap Liquidated Assets back to borrowed amount to return FlashLoan */
            vars.liquidatedAssetBalance = IERC20(vars.underlyingAddress1).balanceOf(address(this));
		    convertTokensToTokens(vars.liquidatedAssetBalance, vars.underlyingAddress1, vars.underlyingAddress, address(this), getNow());
        } 
        
        // else {
        //     address[] memory path = new address[](2);
        //     path[0] = uniswapRouter.WETH();
	    //     path[1] = vars.underlyingAddress;
        //     uniswapRouter.swapExactETHForTokens{value : address(this).balance}(0, path, address(this), getNow());
        // }

        // Time to transfer the funds back
        fee = _fee;
        
        uint totalDebt = _amount.add(_fee);
        transferFundsBackToPoolInternal(_reserve, totalDebt);
    }


    //
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
        address lendingAsset;
        if(address(_cTokenRepay) ==  CETH_ADDRESS) {
            lendingAsset = ETH_RESERVE_ADDRESS;
        }else{
            lendingAsset = CErc20Storage(address(_cTokenRepay)).underlying();
        }
    
        ILendingPool lendingPool = ILendingPool(addressesProvider.getLendingPool());
        lendingPool.flashLoan(address(this), lendingAsset, _repayAmount, data);
    }


	/* @dev Swap ERC Tokens To Tokens : */
	function convertTokensToTokens(
		uint _tokenInAmount,
		address _tokenInAddress,
		address _tokenOutAddress,
		address _to,
		uint _deadline
	) public payable {

		/* Approve Router Address !!! */
		IERC20(_tokenInAddress).approve(UNISWAP_ROUTER_ADDRESS,_tokenInAmount);
		address[] memory path = new address[](2);
		
        path[0] = _tokenInAddress;
        path[1] = uniswapRouter.WETH();
		path[2] = _tokenOutAddress;

		uint[] memory amounts = uniswapRouter.swapExactTokensForTokens(_tokenInAmount, 0, path, _to, _deadline);

		emit LogConvertTokensToTokensEvent(_tokenInAmount,_tokenInAddress,_tokenOutAddress,_to, _deadline, amounts);
	}


    // function convertETHtoAnyToken(address _tokensOut, address _to) public payable {
		
	// 	address[] memory path = new address[](2);
	// 	path[0] = uniswapRouter.WETH();
	// 	path[1] = _tokensOut;

	// 	uint[] memory amounts = uniswapRouter.getAmountsOut(msg.value, path);

	// 	uniswapRouter.swapExactETHForTokens{value : msg.value}(0, path, _to, getNow());
	// 	//emit convertEthToAnyToken(_amount, _tokensOut, path);
	// }

    function setComptroller(ComptrollerInterface _comptroller) public {
        comptroller = _comptroller;
    }

	function getNow() public view returns (uint _now) {
		_now = now + 6000; // 
	}



	/*
        function getContractBalance() public returns
        function getContractErc20Balance() public returns
        function  transferTokens(_toAddress)
	*/

}