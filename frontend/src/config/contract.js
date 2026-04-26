// Contract address — injected by deploy script via .env
export const CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Full ABI (matches ShipmentTracker.sol exactly)
export const CONTRACT_ABI = [
  // ── Read ──────────────────────────────────────────────────────────────────
  {
    inputs: [],
    name: "getContractStats",
    outputs: [
      { internalType: "uint256", name: "total",  type: "uint256" },
      { internalType: "uint256", name: "active", type: "uint256" },
      { internalType: "uint256", name: "nextId", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_shipmentId", type: "uint256" }],
    name: "getShipment",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "id",                  type: "uint256" },
          { internalType: "string",  name: "batchNumber",         type: "string"  },
          { internalType: "address", name: "tracker",             type: "address" },
          { internalType: "uint256", name: "createdAt",           type: "uint256" },
          { internalType: "uint256", name: "lastUpdate",          type: "uint256" },
          { internalType: "int256",  name: "currentTemperature",  type: "int256"  },
          { internalType: "int256",  name: "minTemperature",      type: "int256"  },
          { internalType: "int256",  name: "maxTemperature",      type: "int256"  },
          { internalType: "uint8",   name: "status",              type: "uint8"   },
          { internalType: "string",  name: "location",            type: "string"  },
          { internalType: "bool",    name: "isActive",            type: "bool"    },
        ],
        internalType: "struct ShipmentTracker.Shipment",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_tracker", type: "address" }],
    name: "getTrackerShipments",
    outputs: [{ internalType: "uint256[]", name: "", type: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_tracker", type: "address" }],
    name: "isTrackerAuthorized",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },

  // ── Write ─────────────────────────────────────────────────────────────────
  {
    inputs: [
      { internalType: "string",  name: "_batchNumber", type: "string"  },
      { internalType: "address", name: "_tracker",     type: "address" },
    ],
    name: "createShipment",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "_shipmentId",  type: "uint256" },
      { internalType: "int256",  name: "_temperature", type: "int256"  },
      { internalType: "string",  name: "_location",    type: "string"  },
    ],
    name: "updateStatus",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "_shipmentId", type: "uint256" }],
    name: "markDelivered",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_tracker", type: "address" }],
    name: "authorizeTracker",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "_tracker", type: "address" }],
    name: "revokeTracker",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },

  // ── Events ────────────────────────────────────────────────────────────────
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "shipmentId",  type: "uint256" },
      { indexed: false, internalType: "string",  name: "batchNumber", type: "string"  },
      { indexed: true,  internalType: "address", name: "tracker",     type: "address" },
      { indexed: false, internalType: "uint256", name: "timestamp",   type: "uint256" },
    ],
    name: "ShipmentCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "shipmentId",  type: "uint256" },
      { indexed: false, internalType: "int256",  name: "temperature", type: "int256"  },
      { indexed: false, internalType: "string",  name: "location",    type: "string"  },
      { indexed: false, internalType: "uint256", name: "timestamp",   type: "uint256" },
    ],
    name: "TemperatureUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "shipmentId", type: "uint256" },
      { indexed: false, internalType: "int256",  name: "temperature", type: "int256" },
      { indexed: false, internalType: "int256",  name: "threshold",   type: "int256" },
      { indexed: false, internalType: "string",  name: "alertType",   type: "string" },
      { indexed: false, internalType: "uint256", name: "timestamp",   type: "uint256"},
    ],
    name: "TemperatureAlert",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "shipmentId", type: "uint256" },
      { indexed: false, internalType: "string",  name: "reason",     type: "string"  },
      { indexed: false, internalType: "uint256", name: "timestamp",  type: "uint256" },
    ],
    name: "ShipmentReverted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "uint256", name: "shipmentId", type: "uint256" },
      { indexed: false, internalType: "uint8",   name: "oldStatus",  type: "uint8"   },
      { indexed: false, internalType: "uint8",   name: "newStatus",  type: "uint8"   },
      { indexed: false, internalType: "uint256", name: "timestamp",  type: "uint256" },
    ],
    name: "StatusUpdated",
    type: "event",
  },
];

// Temperature thresholds (Celsius × 100)
export const MIN_SAFE_TEMPERATURE = -8000; // -80 °C
export const MAX_SAFE_TEMPERATURE =   800; //   8 °C

export const SHIPMENT_STATUS = {
  CREATED:           0,
  IN_TRANSIT:        1,
  TEMPERATURE_BREACH:2,
  DELIVERED:         3,
  REVERTED:          4,
};

export const STATUS_LABELS = {
  0: "Created",
  1: "In Transit",
  2: "Temperature Breach",
  3: "Delivered",
  4: "Reverted",
};
