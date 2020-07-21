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
    event convertEthToAnyToken(uint _amount, address _tokensOut, address[] path);
    

    uint256 public fee;
    address private _owner;
    address public treasuryWallet;

    IUniswapV2Router02 public uniswapRouter;
    ComptrollerInterface public comptroller;


	address internal constant UNISWAP_ROUTER_ADDRESS = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address internal constant CETH_ADDRESS = 0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5;
    address internal constant ETH_RESERVE_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;


    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

     modifier ensureTreasuryWallet() {
        require(treasuryWallet != address(0), "There is No Treasury Wallet !!!");
        _;
    }


    constructor() public {
        address msgSender = msg.sender;
        _owner = msgSender;
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

        address path0;
        address path1;
        address path2;
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
            
            /* Liquidate call cEth */    
            uint liquidateBorrowError = CETHInterface(vars._cTokenRepay).liquidateBorrow{value : vars._repayAmount}
                                            ( vars._borrower, CTokenInterface(vars._cTokenCollateral) );
            
            emit LiquidationEvent(liquidateBorrowError);
            require(vars.liquidateBorrowError == 0, "Call Liquidation Error 1 !!! ");

            /* 1. Redeem liquidated Tokens !  */
            
            /* Get Seized  CToken  Balance */
            vars.cTokenBalance = CTokenInterface(vars._cTokenCollateral).balanceOf(address(this));
            emit CTokenBalance(vars.cTokenBalance);

            /* Redeem Liquidated assets From CToken */	
            
            vars.redeemErrorCode = CErc20Interface(vars._cTokenCollateral).redeem(vars.cTokenBalance);
            emit RedeemEvent(vars.redeemErrorCode);
            require(vars.redeemErrorCode == 0, "Redeem Token Error");

            /* Swap Tokens To Ether !!! */ 
            address[] memory ethPath = new address[](2);
            ethPath[0] = vars.underlyingAddress1; 
            ethPath[1] = uniswapRouter.WETH();

            uniswapRouter.swapExactTokensForETH(vars.cTokenBalance, 0, ethPath, address(this),  getNow() );
        }
        

        if(vars._cTokenRepay != CETH_ADDRESS) { 

            vars.approveResponse = IERC20(vars.underlyingAddress).approve(vars._cTokenRepay, vars._repayAmount);
		    vars.allowance = IERC20(vars.underlyingAddress).allowance(address(this), vars._cTokenRepay);

		    uint tokenBalance = IERC20(vars.underlyingAddress).balanceOf(address(this));
		    emit AccountTokenBalance(vars.approveResponse, vars.allowance, vars._cTokenRepay, vars.underlyingAddress, tokenBalance, vars._repayAmount);

            // Here Add Approve 
            vars.liquidateBorrowError = 
                CErc20Interface(vars._cTokenRepay)
                    .liquidateBorrow(vars._borrower,vars._repayAmount,CTokenInterface(vars._cTokenCollateral));

            require(vars.liquidateBorrowError == 0, "Call Liquidation Error !!! ");

            /* Get CToken Balance */
            vars.cTokenBalance = CTokenInterface(vars._cTokenCollateral).balanceOf(address(this));
            emit CTokenBalance(vars.cTokenBalance);

            /* Redeem Liquidated assets From CToken */	
            vars.redeemErrorCode = CErc20Interface(vars._cTokenCollateral).redeem(vars.cTokenBalance);
            emit RedeemEvent(vars.redeemErrorCode);
            require(vars.redeemErrorCode == 0, "Redeem Token Error");

            
            if(vars._cTokenCollateral == CETH_ADDRESS) {
                vars.path0 = uniswapRouter.WETH();
            }else{
                vars.path0 = vars.underlyingAddress1;
            }

            address[] memory path = new address[](2);
            path[0] = vars.path0; // 
            path[1] = vars.underlyingAddress;

	        // uint[] memory amounts = uniswapRouter.getAmountsOut(msg.value, path);
	        uniswapRouter.swapExactETHForTokens{value : address(this).balance}(0, path, address(this), getNow());
        }



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
        public onlyOwner
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

		emit LogConvertTokensToTokensEvent(_tokenInAmount,_tokenInAddress,_tokenOutAddress,_to,_deadline, amounts);
	}


    function setComptroller(ComptrollerInterface _comptroller) public {
        comptroller = _comptroller;
    }


	function getNow() public view returns (uint _now) {
		_now = now + 6000; 
	}
    
    function setTreasuryWallet(address _wallet) public onlyOwner {
        treasuryWallet = _wallet;
    }

    function getTreasuryWallet() public view returns(address _treasuryWallet) {
        _treasuryWallet = treasuryWallet;
    }

    function getowner() public view returns(address ownerAddress) {
        ownerAddress = _owner;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function getContractBalance() public view returns(uint) {
        return address(this).balance;
    }

    function getContractErc20Balance(address _underlyingAddress) public view returns(address _erc20Address, uint _balance) {
        _balance =  IERC20(_underlyingAddress).balanceOf(address(this));
        _erc20Address = _underlyingAddress;
    } 

    
	function transferAllErc20Tokens(address _erc20address,  address _to) public onlyOwner returns (bool result) {
        uint erc20Balance = IERC20(_erc20address).balanceOf( address(this) );
        require(erc20Balance > 0, "NOT ENOUGH BALANCE");
        result = IERC20(_erc20address).transfer(_to, erc20Balance);
    }

}