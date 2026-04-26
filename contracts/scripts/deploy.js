const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying ShipmentTracker with Transparent Proxy...\n");

  const [deployer, tracker1, tracker2] = await ethers.getSigners();

  console.log("Deployer  :", deployer.address);
  console.log("Tracker 1 :", tracker1.address);
  console.log("Tracker 2 :", tracker2.address);
  console.log("Balance   :", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // ── Deploy Transparent Proxy ──────────────────────────────────────────────
  const ShipmentTracker = await ethers.getContractFactory("ShipmentTracker");

  console.log("📦 Deploying implementation + proxy...");
  const shipmentTracker = await upgrades.deployProxy(
    ShipmentTracker,
    [deployer.address],
    { initializer: "initialize", kind: "transparent" }
  );
  await shipmentTracker.waitForDeployment();

  const proxyAddress       = await shipmentTracker.getAddress();
  const implementationAddr = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  const adminAddress       = await upgrades.erc1967.getAdminAddress(proxyAddress);

  console.log("✅ Proxy deployed to      :", proxyAddress);
  console.log("📋 Implementation address :", implementationAddr);
  console.log("🔐 Proxy Admin address    :", adminAddress);

  // ── Authorize trackers ────────────────────────────────────────────────────
  console.log("\n🔑 Authorizing tracker devices...");
  await (await shipmentTracker.authorizeTracker(tracker1.address)).wait();
  console.log("  ✅ Tracker 1 authorized:", tracker1.address);
  await (await shipmentTracker.authorizeTracker(tracker2.address)).wait();
  console.log("  ✅ Tracker 2 authorized:", tracker2.address);

  // ── Seed: create a test shipment ──────────────────────────────────────────
  console.log("\n📦 Creating seed shipment BATCH-001...");
  const createTx = await shipmentTracker.createShipment("BATCH-001", tracker1.address);
  const createReceipt = await createTx.wait();
  const createdEvent = createReceipt.logs.find(l => l.fragment?.name === "ShipmentCreated");
  const shipmentId = createdEvent ? createdEvent.args[0].toString() : "1";
  console.log("  ✅ Shipment created, ID:", shipmentId);

  // ── Seed: normal temperature update ──────────────────────────────────────
  console.log("\n🌡️  Sending normal temperature update (-5°C)...");
  await (await shipmentTracker.connect(tracker1).updateStatus(1, -500, "Cold Storage A")).wait();
  console.log("  ✅ Temperature updated");

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = await shipmentTracker.getContractStats();
  console.log("\n📊 Contract stats:");
  console.log("  Total shipments :", stats.total.toString());
  console.log("  Active shipments:", stats.active.toString());
  console.log("  Next ID         :", stats.nextId.toString());

  // ── Persist deployment info ───────────────────────────────────────────────
  const deploymentInfo = {
    network: "localhost",
    chainId: 31337,
    contracts: {
      ShipmentTracker: {
        proxy: proxyAddress,
        implementation: implementationAddr,
        admin: adminAddress,
      },
    },
    accounts: {
      deployer: deployer.address,
      tracker1: tracker1.address,
      tracker2: tracker2.address,
    },
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync("./deployment-info.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("\n💾 deployment-info.json written");

  // ── Auto-update frontend .env ─────────────────────────────────────────────
  const frontendEnv = path.resolve(__dirname, "../../frontend/.env");
  const envContent = [
    `VITE_CONTRACT_ADDRESS=${proxyAddress}`,
    `VITE_CHAIN_ID=31337`,
    `VITE_RPC_URL=http://127.0.0.1:8545`,
    `VITE_TRACKER1_ADDRESS=${tracker1.address}`,
    `VITE_TRACKER2_ADDRESS=${tracker2.address}`,
  ].join("\n") + "\n";

  fs.writeFileSync(frontendEnv, envContent);
  console.log("💾 frontend/.env written with contract address:", proxyAddress);

  console.log("\n🎉 Deployment complete!\n");
  console.log("  Frontend  → http://localhost:5173");
  console.log("  Hardhat   → http://localhost:8545");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Deployment failed:", err);
    process.exit(1);
  });
