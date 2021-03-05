pragma solidity >=0.6.2;

import "./aave/FlashLoanReceiverBase.sol";
import "./aave/ILendingPoolAddressesProvider.sol";
import "./aave/ILendingPool.sol";
import "./openzeppelin/IERC20.sol";
import "./compound/CTokenInterfaces.sol";
import "./compound/ComptrollerInterface.sol";
import "./uniswap/IUniswapV2Router02.sol";

contract FlashloanUSDC is FlashLoanReceiverBase {
    uint256 public fee;
    address private _owner;
    address public treasuryWallet;

    IUniswapV2Router02 public uniswapRouter;
    ComptrollerInterface public comptroller;

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    constructor() public {
        address msgSender = msg.sender;
        _owner = msgSender;
    }

    // receive() payable external {}

    struct FlashloanLocalVars {
        address _borrower;
        uint256 _repayAmount;
        address _cTokenRepay;
        address _cTokenCollateral;

        address _underlyingAddress;
        IERC20 _underlyingContract; // underlying contract
        bool _approveResponse;
        uint256 _allowance;
        CErc20Interface _cTokenRepayContract;
        uint256 _liquidateBorrowError;

        uint256 _cTokenBalanceAfterLiquidation;
        uint256 _redeemErrorCode;

        bool _break;
    }

    function executeOperation(
        address _reserve,
        uint256 _amount,
        uint256 _fee,
        bytes calldata _params
    ) external override {
        require(
            _amount <= getBalanceInternal(address(this), _reserve),
            "Invalid balance, was the flashLoan successful?"
        );

        FlashloanLocalVars memory vars;

        /* Decode _params */
        (
            vars._borrower,
            vars._repayAmount,
            vars._cTokenRepay,
            vars._cTokenCollateral
        ) = abi.decode(_params, (address, uint256, address, address));

        /* Get Underlying Contract */
        vars._underlyingAddress = CErc20Storage(vars._cTokenRepay).underlying();
        vars._underlyingContract = IERC20(vars._underlyingAddress);

        /* Approve CToken Contract Underlying Amount */
        vars._approveResponse = vars._underlyingContract.approve(vars._cTokenRepay,vars._repayAmount);
        vars._allowance = vars._underlyingContract.allowance(address(this), vars._cTokenRepay); //(owner this, spender cToken)

        uint256 tokenBalance = vars._underlyingContract.balanceOf(address(this)); // My Balance ? Ok

        // cToken Contracts there repayment (liquidation) happens
        vars._cTokenRepayContract = CErc20Interface(vars._cTokenRepay);

        // Call Liquidation !!!
        vars._liquidateBorrowError = vars._cTokenRepayContract.liquidateBorrow(
            vars._borrower,
            vars._repayAmount,
            CTokenInterface(vars._cTokenCollateral)
        );

        require(vars._liquidateBorrowError == 0, "Call Liquidation Error !!! "); // revert if error !!!

        /* Get cToken Balance */
        vars._cTokenBalanceAfterLiquidation = CTokenInterface(vars._cTokenCollateral).balanceOf(address(this));

        /* Redeem Liquidated assets From CToken */
        vars._redeemErrorCode = CErc20Interface(vars._cTokenCollateral).redeem(vars._cTokenBalanceAfterLiquidation);

        require(vars._redeemErrorCode == 0, "Redeem Token Error");

        fee = _fee;
        uint256 totalDebt = _amount.add(_fee);

        vars._break = true;
        transferFundsBackToPoolInternal(_reserve, totalDebt);
    }

    function flashloan(
        address _borrower,
        uint256 _repayAmount,
        CTokenInterface _cTokenRepay,
        CTokenInterface _cTokenCollateral
    ) public onlyOwner {
        /* Encode Passed Data */
        bytes memory data = abi.encode(
            _borrower,
            _repayAmount,
            _cTokenRepay,
            _cTokenCollateral
        );

        /* Get Underlying Token address Bat, Usdc etc...  */
        address lendingAsset = CErc20Storage(address(_cTokenRepay)).underlying();

        ILendingPool lendingPool = ILendingPool(addressesProvider.getLendingPool());
        lendingPool.flashLoan(address(this), lendingAsset, _repayAmount, data);
    }

    /* @dev Swap ERC Tokens To Tokens : */
    function setComptroller(ComptrollerInterface _comptroller) public {
        comptroller = _comptroller;
    }

    function getNow() public view returns (uint256 _now) {
        _now = now + 6000;
    }

    function setTreasuryWallet(address _wallet) public onlyOwner {
        treasuryWallet = _wallet;
    }

    function getTreasuryWallet() public view returns (address _treasuryWallet) {
        _treasuryWallet = treasuryWallet;
    }

    function getowner() public view returns (address ownerAddress) {
        ownerAddress = _owner;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function getContractErc20Balance(address _underlyingAddress)
        public
        view
        returns (address _erc20Address, uint256 _balance)
    {
        _balance = IERC20(_underlyingAddress).balanceOf(address(this));
        _erc20Address = _underlyingAddress;
    }

    function transferAllErc20Tokens(address _erc20address, address _to)
        public
        onlyOwner
        returns (bool result)
    {
        uint256 erc20Balance = IERC20(_erc20address).balanceOf(address(this));
        require(erc20Balance > 0, "NOT ENOUGH BALANCE");
        result = IERC20(_erc20address).transfer(_to, erc20Balance);
    }
}
