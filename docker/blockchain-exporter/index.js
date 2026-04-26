const express = require('express');
const client = require('prom-client');
const { ethers } = require('ethers');
const cron = require('node-cron');

const app = express();
const port = process.env.EXPORTER_PORT || 8080;
const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545';
const contractAddress = process.env.CONTRACT_ADDRESS;

// Create a Registry to register the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'vaccine-shipment-tracker'
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const blockHeight = new client.Gauge({
  name: 'blockchain_block_height',
  help: 'Current block height of the blockchain',
  registers: [register]
});

const blockTime = new client.Gauge({
  name: 'blockchain_block_time_seconds',
  help: 'Time between blocks in seconds',
  registers: [register]
});

const gasPrice = new client.Gauge({
  name: 'blockchain_gas_price_gwei',
  help: 'Current gas price in Gwei',
  registers: [register]
});

const totalShipments = new client.Gauge({
  name: 'shipment_tracker_total_shipments',
  help: 'Total number of shipments created',
  registers: [register]
});

const activeShipments = new client.Gauge({
  name: 'shipment_tracker_active_shipments',
  help: 'Number of active shipments',
  registers: [register]
});

const temperatureAlerts = new client.Counter({
  name: 'shipment_tracker_temperature_alerts_total',
  help: 'Total number of temperature alerts',
  labelNames: ['alert_type'],
  registers: [register]
});

const revertedShipments = new client.Counter({
  name: 'shipment_tracker_reverted_shipments_total',
  help: 'Total number of reverted shipments',
  labelNames: ['reason'],
  registers: [register]
});

// Initialize provider and contract
let provider;
let contract;

const contractABI = [
  "function getContractStats() view returns (uint256 total, uint256 active, uint256 nextId)",
  "event TemperatureAlert(uint256 indexed shipmentId, int256 temperature, int256 threshold, string alertType, uint256 timestamp)",
  "event ShipmentReverted(uint256 indexed shipmentId, string reason, uint256 timestamp)"
];

async function initializeBlockchain() {
  try {
    provider = new ethers.JsonRpcProvider(rpcUrl);
    
    if (contractAddress) {
      contract = new ethers.Contract(contractAddress, contractABI, provider);
      
      // Listen for events
      contract.on('TemperatureAlert', (shipmentId, temperature, threshold, alertType, timestamp) => {
        console.log(`Temperature alert: Shipment ${shipmentId}, Type: ${alertType}`);
        temperatureAlerts.labels(alertType).inc();
      });
      
      contract.on('ShipmentReverted', (shipmentId, reason, timestamp) => {
        console.log(`Shipment reverted: ${shipmentId}, Reason: ${reason}`);
        revertedShipments.labels(reason).inc();
      });
    }
    
    console.log('Blockchain connection initialized');
  } catch (error) {
    console.error('Failed to initialize blockchain connection:', error);
  }
}

async function updateMetrics() {
  try {
    // Get latest block
    const latestBlock = await provider.getBlock('latest');
    if (latestBlock) {
      blockHeight.set(latestBlock.number);
      
      // Calculate block time (time since previous block)
      const previousBlock = await provider.getBlock(latestBlock.number - 1);
      if (previousBlock) {
        const timeDiff = latestBlock.timestamp - previousBlock.timestamp;
        blockTime.set(timeDiff);
      }
    }
    
    // Get gas price
    const feeData = await provider.getFeeData();
    if (feeData.gasPrice) {
      const gasPriceGwei = parseFloat(ethers.formatUnits(feeData.gasPrice, 'gwei'));
      gasPrice.set(gasPriceGwei);
    }
    
    // Get contract stats if contract is available
    if (contract) {
      try {
        const stats = await contract.getContractStats();
        totalShipments.set(Number(stats[0]));
        activeShipments.set(Number(stats[1]));
      } catch (contractError) {
        console.warn('Could not fetch contract stats:', contractError.message);
      }
    }
    
  } catch (error) {
    console.error('Error updating metrics:', error);
  }
}

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    rpcUrl: rpcUrl,
    contractAddress: contractAddress || 'not configured'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Blockchain Metrics Exporter',
    version: '1.0.0',
    endpoints: {
      metrics: '/metrics',
      health: '/health'
    }
  });
});

// Update metrics every 15 seconds
cron.schedule('*/15 * * * * *', updateMetrics);

// Initialize and start server
async function start() {
  await initializeBlockchain();
  
  app.listen(port, '0.0.0.0', () => {
    console.log(`Blockchain exporter listening on port ${port}`);
    console.log(`Metrics available at http://localhost:${port}/metrics`);
    
    // Initial metrics update
    updateMetrics();
  });
}

start().catch(console.error);