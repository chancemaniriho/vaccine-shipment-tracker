const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

// Increase timeout for proxy deployments on slow machines
const TIMEOUT = 120000;

describe("ShipmentTracker", function () {
  this.timeout(TIMEOUT);

  let shipmentTracker;
  let owner, tracker1, tracker2, unauthorized;
  let proxyAddress, implementationAddress;

  beforeEach(async function () {
    [owner, tracker1, tracker2, unauthorized] = await ethers.getSigners();

    const ShipmentTracker = await ethers.getContractFactory("ShipmentTracker");

    shipmentTracker = await upgrades.deployProxy(
      ShipmentTracker,
      [owner.address],
      { initializer: "initialize", kind: "transparent" }
    );
    await shipmentTracker.waitForDeployment();

    proxyAddress = await shipmentTracker.getAddress();
    implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);

    await shipmentTracker.authorizeTracker(tracker1.address);
    await shipmentTracker.authorizeTracker(tracker2.address);
  });

  // ─── Proxy Architecture ───────────────────────────────────────────────────
  describe("Proxy Architecture", function () {
    it("Should deploy with correct proxy pattern", async function () {
      expect(proxyAddress).to.not.equal(implementationAddress);
      expect(
        await upgrades.erc1967.getImplementationAddress(proxyAddress)
      ).to.equal(implementationAddress);
    });

    it("Should initialize correctly", async function () {
      expect(await shipmentTracker.owner()).to.equal(owner.address);
      expect(await shipmentTracker.nextShipmentId()).to.equal(1n);
      expect(await shipmentTracker.totalShipments()).to.equal(0n);
    });

    it("Should prevent re-initialization of implementation", async function () {
      const ShipmentTracker = await ethers.getContractFactory("ShipmentTracker");
      const impl = await ShipmentTracker.deploy();
      await impl.waitForDeployment();
      await expect(impl.initialize(owner.address)).to.be.revertedWithCustomError(impl, "InvalidInitialization");
    });
  });

  // ─── Shipment Management ─────────────────────────────────────────────────
  describe("Shipment Management", function () {
    it("Should create shipment successfully", async function () {
      const tx = await shipmentTracker.createShipment("BATCH-001", tracker1.address);
      await tx.wait();

      const shipment = await shipmentTracker.getShipment(1);
      expect(shipment.batchNumber).to.equal("BATCH-001");
      expect(shipment.tracker).to.equal(tracker1.address);
      expect(shipment.isActive).to.be.true;
    });

    it("Should emit ShipmentCreated event", async function () {
      await expect(
        shipmentTracker.createShipment("BATCH-001", tracker1.address)
      ).to.emit(shipmentTracker, "ShipmentCreated");
    });

    it("Should reject empty batch number", async function () {
      await expect(
        shipmentTracker.createShipment("", tracker1.address)
      ).to.be.revertedWith("ShipmentTracker: Batch number required");
    });

    it("Should reject zero tracker address", async function () {
      await expect(
        shipmentTracker.createShipment("BATCH-001", ethers.ZeroAddress)
      ).to.be.revertedWith("ShipmentTracker: Invalid tracker address");
    });

    it("Should only allow owner to create shipments", async function () {
      await expect(
        shipmentTracker.connect(tracker1).createShipment("BATCH-001", tracker1.address)
      ).to.be.revertedWithCustomError(shipmentTracker, "OwnableUnauthorizedAccount");
    });
  });

  // ─── Temperature Monitoring ───────────────────────────────────────────────
  describe("Temperature Monitoring", function () {
    beforeEach(async function () {
      await shipmentTracker.createShipment("BATCH-001", tracker1.address);
    });

    it("Should update temperature within safe range", async function () {
      await expect(
        shipmentTracker.connect(tracker1).updateStatus(1, -500, "Warehouse A")
      ).to.emit(shipmentTracker, "TemperatureUpdated");

      const shipment = await shipmentTracker.getShipment(1);
      expect(shipment.currentTemperature).to.equal(-500n);
      expect(shipment.location).to.equal("Warehouse A");
    });

    it("Should trigger TemperatureAlert on HIGH breach (>8°C)", async function () {
      await expect(
        shipmentTracker.connect(tracker1).updateStatus(1, 1000, "Hot Zone")
      )
        .to.emit(shipmentTracker, "TemperatureAlert")
        .and.to.emit(shipmentTracker, "ShipmentReverted");

      const shipment = await shipmentTracker.getShipment(1);
      expect(shipment.status).to.equal(4n); // Reverted
      expect(shipment.isActive).to.be.false;
    });

    it("Should trigger TemperatureAlert on LOW breach (<-80°C)", async function () {
      await expect(
        shipmentTracker.connect(tracker1).updateStatus(1, -9000, "Freezer Malfunction")
      ).to.emit(shipmentTracker, "TemperatureAlert");
    });

    it("Should reject updates from unauthorized address", async function () {
      await expect(
        shipmentTracker.connect(unauthorized).updateStatus(1, -500, "Warehouse A")
      ).to.be.revertedWith("ShipmentTracker: Not authorized tracker");
    });

    it("Should reject updates from wrong tracker", async function () {
      await expect(
        shipmentTracker.connect(tracker2).updateStatus(1, -500, "Warehouse A")
      ).to.be.revertedWith("ShipmentTracker: Unauthorized for this shipment");
    });

    it("Should update status to InTransit on first update", async function () {
      await expect(
        shipmentTracker.connect(tracker1).updateStatus(1, -500, "In Transit")
      ).to.emit(shipmentTracker, "StatusUpdated");

      const shipment = await shipmentTracker.getShipment(1);
      expect(shipment.status).to.equal(1n); // InTransit
    });
  });

  // ─── Delivery Management ─────────────────────────────────────────────────
  describe("Delivery Management", function () {
    beforeEach(async function () {
      await shipmentTracker.createShipment("BATCH-001", tracker1.address);
      await shipmentTracker.connect(tracker1).updateStatus(1, -500, "In Transit");
    });

    it("Should mark shipment as delivered", async function () {
      await expect(
        shipmentTracker.connect(tracker1).markDelivered(1)
      ).to.emit(shipmentTracker, "StatusUpdated");

      const shipment = await shipmentTracker.getShipment(1);
      expect(shipment.status).to.equal(3n); // Delivered
      expect(shipment.isActive).to.be.false;
    });

    it("Should reject delivery of Created (not InTransit) shipment", async function () {
      await shipmentTracker.createShipment("BATCH-002", tracker1.address);
      await expect(
        shipmentTracker.connect(tracker1).markDelivered(2)
      ).to.be.revertedWith("ShipmentTracker: Invalid status for delivery");
    });
  });

  // ─── Tracker Authorization ────────────────────────────────────────────────
  describe("Tracker Authorization", function () {
    it("Should authorize a new tracker", async function () {
      await expect(
        shipmentTracker.authorizeTracker(unauthorized.address)
      ).to.emit(shipmentTracker, "TrackerAuthorized");

      expect(await shipmentTracker.isTrackerAuthorized(unauthorized.address)).to.be.true;
    });

    it("Should revoke tracker authorization", async function () {
      await expect(
        shipmentTracker.revokeTracker(tracker1.address)
      ).to.emit(shipmentTracker, "TrackerRevoked");

      expect(await shipmentTracker.isTrackerAuthorized(tracker1.address)).to.be.false;
    });

    it("Should reject duplicate authorization", async function () {
      await expect(
        shipmentTracker.authorizeTracker(tracker1.address)
      ).to.be.revertedWith("ShipmentTracker: Tracker already authorized");
    });
  });

  // ─── Pausable ─────────────────────────────────────────────────────────────
  describe("Pausable Functionality", function () {
    it("Should pause and unpause contract", async function () {
      await shipmentTracker.pause();
      expect(await shipmentTracker.paused()).to.be.true;

      await expect(
        shipmentTracker.createShipment("BATCH-001", tracker1.address)
      ).to.be.revertedWithCustomError(shipmentTracker, "EnforcedPause");

      await shipmentTracker.unpause();
      expect(await shipmentTracker.paused()).to.be.false;
    });
  });

  // ─── View Functions ───────────────────────────────────────────────────────
  describe("View Functions", function () {
    beforeEach(async function () {
      await shipmentTracker.createShipment("BATCH-001", tracker1.address);
      await shipmentTracker.createShipment("BATCH-002", tracker1.address);
    });

    it("Should return correct contract stats", async function () {
      const stats = await shipmentTracker.getContractStats();
      expect(stats.total).to.equal(2n);
      expect(stats.active).to.equal(2n);
      expect(stats.nextId).to.equal(3n);
    });

    it("Should return tracker shipments", async function () {
      const shipments = await shipmentTracker.getTrackerShipments(tracker1.address);
      expect(shipments).to.have.length(2);
      expect(shipments[0]).to.equal(1n);
      expect(shipments[1]).to.equal(2n);
    });
  });

  // ─── Gas Usage ────────────────────────────────────────────────────────────
  describe("Gas Usage", function () {
    it("Should have reasonable gas costs for createShipment", async function () {
      const tx = await shipmentTracker.createShipment("BATCH-001", tracker1.address);
      const receipt = await tx.wait();
      console.log("    createShipment gas:", receipt.gasUsed.toString());
      expect(Number(receipt.gasUsed)).to.be.below(400000);
    });

    it("Should have reasonable gas costs for updateStatus", async function () {
      await shipmentTracker.createShipment("BATCH-001", tracker1.address);
      const tx = await shipmentTracker.connect(tracker1).updateStatus(1, -500, "Location A");
      const receipt = await tx.wait();
      console.log("    updateStatus gas:", receipt.gasUsed.toString());
      expect(Number(receipt.gasUsed)).to.be.below(200000);
    });
  });
});
