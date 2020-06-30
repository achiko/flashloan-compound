let Flashloan = artifacts.require("Flashloan");
let Swap = artifacts.require("Uniswap");

module.exports = async function (deployer, accounts) {
    try {

        // await deployer.deploy(Flashloan);
        // const flashloan = await Flashloan.deployed();
        // console.log('Flashloan Address : ', flashloan.address);

        await deployer.deploy(Swap);
        console.log('Uniswap Address : ', Swap.address);
        
        
    } catch (e) {
        console.log(`Error in migration: ${e.message}`)
    }
}