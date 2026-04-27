/**
 * Script to authorize tracker addresses on the ShipmentTracker contract
 * Usage: npx hardhat run scripts/authorize-tracker.js --network localhost
 */

const hre = require('hardhat');

async function main() {
  const [owner] = await hre.ethers.getSigners();
  
  console.log('Authorizing trackers...');
  console.log('Owner:', owner.address);
  
  // Get the contract from deployment info
  const deploymentInfo = require('../deployment-info.json');
  const contractAddress = deploymentInfo.contractAddress;
  const proxyAddress = deploymentInfo.proxyAddress;
  
  console.log('Contract Address:', contractAddress);
  console.log('Proxy Address:', proxyAddress);
  
  // Get the contract instance (use proxy address for interaction)
  const contract = await hre.ethers.getContractAt('ShipmentTracker', proxyAddress);
  
  // Get all signer addresses
  const signers = await hre.ethers.getSigners();
  const trackerAddresses = signers.slice(0, 3).map(s => s.address); // Use first 3 signers as trackers
  
  console.log('\nAuthorizing the following tracker addresses:');
  trackerAddresses.forEach((addr, i) => {
    console.log(`  ${i + 1}. ${addr}`);
  });
  
  // Authorize each tracker
  for (const trackerAddr of trackerAddresses) {
    try {
      const isAuthorized = await contract.isTrackerAuthorized(trackerAddr);
      
      if (isAuthorized) {
        console.log(`✓ ${trackerAddr} already authorized`);
      } else {
        console.log(`Authorizing ${trackerAddr}...`);
        const tx = await contract.authorizeTracker(trackerAddr);
        await tx.wait(1);
        console.log(`✓ ${trackerAddr} authorized`);
      }
    } catch (error) {
      console.error(`✗ Error authorizing ${trackerAddr}:`, error.message);
    }
  }
  
  console.log('\n✅ Tracker authorization complete!');
  console.log('\nYou can now use the Sensor Simulator with these addresses.');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
