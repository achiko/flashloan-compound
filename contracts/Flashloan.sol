pragma solidity ^0.5.15;

import "./aave/FlashLoanReceiverBase.sol";
import "./aave/ILendingPoolAddressesProvider.sol";
import "./aave/ILendingPool.sol";

contract Flashloan is FlashLoanReceiverBase {

    event ExecuteOpreationEvent( address _reserve, uint256 _amount, uint256 _fee, bytes _params);
    event DecodePassedData( bytes data );


    uint256 public fee;
    

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
        // (uint256 _passedBalance) = abi.decode(_params,(uint256));
        // emit DecodePassedData(_passedBalance);

        //  
        // do your thing here
        //

        
        // Time to transfer the funds back
        fee = _fee;

        uint totalDebt = _amount.add(_fee);
        transferFundsBackToPoolInternal(_reserve, totalDebt);
    }

    function flashloan() public {

        bytes memory data = msg.data;
        emit DecodePassedData(data);

        // Else encode the params like below (bytes encoded param of type `address` and `uint`)
        // bytes memory params = abi.encode(address(this), 1234);

        // uint amount = 1 ether;
        // address asset = address(0x6B175474E89094C44Da98b954EedeAC495271d0F); // mainnet DAI

        // ILendingPool lendingPool = ILendingPool(addressesProvider.getLendingPool());
        // lendingPool.flashLoan(address(this), asset, amount, data);
    }
}