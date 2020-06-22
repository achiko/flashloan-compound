let Flashloan = artifacts.require("Flashloan")

module.exports = async function (deployer, accounts) {
    try {

        await deployer.deploy(Flashloan)
        const flashloan = await Flashloan.deployed();

        console.log('Flashloan Address : ', flashloan.address);
        
        
    } catch (e) {
        console.log(`Error in migration: ${e.message}`)
    }
}