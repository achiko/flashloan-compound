//pragma solidity ^0.5.15;
pragma solidity >=0.6.2;

import './uniswap/IUniswapV2Router02.sol';
import "./openzeppelin/IERC20.sol";


contract Swap {
  
	event LogConvertTokensToTokensEvent( uint _tokenInAmount, address _tokenInAddress, address _tokenOutAddress, address _to, uint _deadline, uint[] amounts );
	event convertEthToAnyToken(uint _amount, address _tokensOut, address[] path);
	event Logamounts(uint[] amounts);

  	address internal constant UNISWAP_ROUTER_ADDRESS = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

  	IUniswapV2Router02 public uniswapRouter;
  	address private daiAddress = 0x6B175474E89094C44Da98b954EedeAC495271d0F;

	constructor() public {
		uniswapRouter = IUniswapV2Router02(UNISWAP_ROUTER_ADDRESS);
	}


	/*  Swap Exact Tokens To Tokens */
	
	function convertTokensToTokens(uint _tokenInAmount, address _tokenInAddress, address _tokenOutAddress, address _to, uint _deadline) public payable {

		IERC20(_tokenInAddress).approve(UNISWAP_ROUTER_ADDRESS, _tokenInAmount); // approve Router to get my tokens !!! 

		//Function: swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to, uint256 deadline);
		address[] memory path = new address[](2);
		path[0] = _tokenInAddress;
		path[1] = _tokenOutAddress;
		uint[] memory amounts = uniswapRouter.swapExactTokensForTokens(_tokenInAmount, 0, path, _to, _deadline);

		emit LogConvertTokensToTokensEvent(_tokenInAmount,_tokenInAddress,_tokenOutAddress,_to, _deadline, amounts);
	}

	
	//**  Convert ETH to Any kind of Tokens ...  **/
	function convertETHtoAnyToken(address _tokensOut, address _to) public payable {
		
		address[] memory path = new address[](2);
		path[0] = uniswapRouter.WETH();
		path[1] = _tokensOut;

		uint[] memory amounts = uniswapRouter.getAmountsOut(msg.value, path);

		emit Logamounts(amounts);

		uniswapRouter.swapExactETHForTokens{value : msg.value}(0, path, _to, getNow());

		//emit convertEthToAnyToken(_amount, _tokensOut, path);
	}

	/* Convert ETH To Dai */
	function convertEthToDai(uint daiAmount) public payable {

		uint deadline = now + 15; // using 'now' for convenience, for mainnet pass deadline from frontend!
		uniswapRouter.swapETHForExactTokens.value(msg.value)(daiAmount, getPathForETHtoDAI(), address(this), deadline);
		
		// refund leftover ETH to user
		msg.sender.call.value(address(this).balance)("");

	}
  
	function getNow() public view returns (uint _now) {
		_now = now + 650;
	}

	function getEstimatedETHforDAI(uint daiAmount) public view returns (uint[] memory) {
		return uniswapRouter.getAmountsIn(daiAmount, getPathForETHtoDAI());
	}

	//function getPair(address tokenA, address tokenB) external view returns (address pair);

	function getPathForETHtoDAI() public view returns (address[] memory) {
		address[] memory path = new address[](2);
		path[0] = uniswapRouter.WETH();
		path[1] = daiAddress;
		
		return path;
	}

  	// important to receive ETH
  	receive() payable external {}
}
