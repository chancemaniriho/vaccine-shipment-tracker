const { ethers } = require("hardhat");

/**
 * Script to test temperature breach scenarios for Tenderly debugging
 * This script will create a shipment and then trigger a temperature breach
 * to demonstrate the reversion mechanism
 */

async function main() {
  console.log("🧪 Testing Temperature Breach Scenarios");
  
  const [deployer, tracker1] = await ethers.getSigners();
  
  // Get the deployed contract
  const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const ShipmentTracker = await ethers.getContractFactory("ShipmentTracker");
  const shipmentTracker = ShipmentTracker.attach(contractAddress);
  
  console.log("📋 Contract Address:", contractAddress);
  console.log("🔑 Tracker Address:", tracker1.address);
  
  try {
    // 1. Create a test shipment
    console.log("\n📦 Creating test shipment...");
    const createTx = await shipmentTracker.createShipment("TEST-BREACH-001", tracker1.address);
    const createReceipt = await createTx.wait();
    
    const shipmentId = createReceipt.logs.find(
      log => log.fragment && log.fragment.name === 'ShipmentCreated'
    )?.args[0];
    
    console.log("✅ Shipment created with ID:", shipmentId.toString());
    
    // 2. Test normal temperature update first
    console.log("\n🌡️  Testing normal temperature update...");
    const trackerContract = shipmentTracker.connect(tracker1);
    
    const normalTx = await trackerContract.updateStatus(
      shipmentId,
      -500, // -5°C (within safe range)
      "Cold Storage Facility"
    );
    await normalTx.wait();
    console.log("✅ Normal temperature update successful");
    
    // 3. Test HIGH temperature breach (above 8°C)
    console.log("\n🔥 Testing HIGH temperature breach...");
    try {
      const highTempTx = await trackerContract.updateStatus(
        shipmentId,
        1200, // 12°C (above 8°C limit)
        "Overheated Transport Vehicle"
      );
      const highTempReceipt = await highTempTx.wait();
      
      console.log("🚨 HIGH Temperature breach transaction:", highTempTx.hash);
      console.log("📊 Gas used:", highTempReceipt.gasUsed.toString());
      
      // Check for events
      const tempAlert = highTempReceipt.logs.find(
        log => log.fragment && log.fragment.name === 'TemperatureAlert'
      );
      
      const shipmentReverted = highTempReceipt.logs.find(
        log => log.fragment && log.fragment.name === 'ShipmentReverted'
      );
      
      if (tempAlert) {
        console.log("🚨 TemperatureAlert Event:", {
          shipmentId: tempAlert.args.shipmentId.toString(),
          temperature: (Number(tempAlert.args.temperature) / 100).toFixed(1) + "°C",
          threshold: (Number(tempAlert.args.threshold) / 100).toFixed(1) + "°C",
          alertType: tempAlert.args.alertType
        });
      }
      
      if (shipmentReverted) {
        console.log("❌ ShipmentReverted Event:", {
          shipmentId: shipmentReverted.args.shipmentId.toString(),
          reason: shipmentReverted.args.reason
        });
      }
      
    } catch (error) {
      console.log("❌ High temperature breach failed (expected):", error.message);
    }
    
    // 4. Create another shipment for LOW temperature test
    console.log("\n📦 Creating second test shipment for LOW temperature test...");
    const createTx2 = await shipmentTracker.createShipment("TEST-BREACH-002", tracker1.address);
    const createReceipt2 = await createTx2.wait();
    
    const shipmentId2 = createReceipt2.logs.find(
      log => log.fragment && log.fragment.name === 'ShipmentCreated'
    )?.args[0];
    
    console.log("✅ Second shipment created with ID:", shipmentId2.toString());
    
    // 5. Test LOW temperature breach (below -80°C)
    console.log("\n🧊 Testing LOW temperature breach...");
    try {
      const lowTempTx = await trackerContract.updateStatus(
        shipmentId2,
        -9000, // -90°C (below -80°C limit)
        "Freezer Malfunction"
      );
      const lowTempReceipt = await lowTempTx.wait();
      
      console.log("🚨 LOW Temperature breach transaction:", lowTempTx.hash);
      console.log("📊 Gas used:", lowTempReceipt.gasUsed.toString());
      
      // Check for events
      const tempAlert = lowTempReceipt.logs.find(
        log => log.fragment && log.fragment.name === 'TemperatureAlert'
      );
      
      if (tempAlert) {
        console.log("🚨 TemperatureAlert Event:", {
          shipmentId: tempAlert.args.shipmentId.toString(),
          temperature: (Number(tempAlert.args.temperature) / 100).toFixed(1) + "°C",
          threshold: (Number(tempAlert.args.threshold) / 100).toFixed(1) + "°C",
          alertType: tempAlert.args.alertType
        });
      }
      
    } catch (error) {
      console.log("❌ Low temperature breach failed (expected):", error.message);
    }
    
    // 6. Display final contract stats
    console.log("\n📊 Final Contract Statistics:");
    const stats = await shipmentTracker.getContractStats();
    console.log("Total Shipments:", stats[0].toString());
    console.log("Active Shipments:", stats[1].toString());
    console.log("Next Shipment ID:", stats[2].toString());
    
    console.log("\n🎯 Tenderly Debugging Instructions:");
    console.log("1. Copy the transaction hashes above");
    console.log("2. Go to Tenderly Dashboard");
    console.log("3. Search for the transaction hash");
    console.log("4. Use the Debugger to trace execution");
    console.log("5. Look for the exact line where temperature threshold check fails");
    console.log("6. Examine the _handleTemperatureBreach function execution");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });