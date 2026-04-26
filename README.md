# 🧬 Vaccine Shipment Tracker

A blockchain-based logistics tracking system for high-value vaccine shipments with real-time temperature monitoring, automated on-chain reversion on safety breaches, and a full observability stack.

---

## How the App Runs

### Architecture at a glance

```
Browser (MetaMask)
      │
      ▼
React Frontend  ──── wagmi / viem ────►  Hardhat Local Node  (port 8545)
(Vite, port 5173)                              │
      │                                        │  Transparent Proxy
      │  useWatchContractEvent                 ▼
      │  (TemperatureAlert)          ShipmentTracker.sol
      │                                        │
      ▼                                        ▼
Red Alert Overlay                   Events → Prometheus Exporter (port 8080)
                                               │
                                               ▼
                                         Prometheus (port 9090)
                                               │
                                               ▼
                                         Grafana (port 3001)
                                    (Alerting: 3+ reverts / 10 min → Slack)
```

### What happens end-to-end

1. **Hardhat node** starts and mines blocks locally on `http://127.0.0.1:8545`.
2. **Deploy script** deploys the `ShipmentTracker` implementation, wraps it in a **Transparent Proxy**, authorizes two tracker wallets, seeds one shipment, and writes the proxy address into `frontend/.env`.
3. **Vite dev server** starts on port 5173. On first run it pre-bundles all heavy deps (wagmi, viem, RainbowKit) into `.vite/deps/` — subsequent starts take ~4 s.
4. **User connects MetaMask** (Hardhat Local, chain 31337) and the dashboard reads live contract state via `useReadContract` / `useReadContracts`.
5. **Tracker device** (or test script) calls `updateStatus(shipmentId, temperature, location)`.
   - If temperature is within −80 °C → +8 °C: state updates normally.
   - If temperature breaches the threshold: the contract emits `TemperatureAlert`, auto-reverts the shipment, and emits `ShipmentReverted`.
6. **Frontend** listens with `useWatchContractEvent` — the red overlay appears instantly, no page refresh needed.
7. **Prometheus exporter** scrapes block height, gas price, and contract counters every 15 s.
8. **Grafana** evaluates the alert rule: if `increase(shipment_tracker_reverted_shipments_total[10m]) > 3` fires, a Slack notification is sent.

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18 + | Contracts & frontend |
| npm | 9 + | Package management |
| MetaMask | any | Browser wallet |
| Docker + Compose | any | Monitoring stack (optional) |

---

## Running the Project

### Step 1 — Install dependencies

```bash
# Contracts
cd contracts
npm install --legacy-peer-deps

# Frontend
cd ../frontend
npm install --legacy-peer-deps
```

> **Windows note:** use `--legacy-peer-deps` to avoid the npm v11 semver bug with `@scure/bip32`.

---

### Step 2 — Start the local blockchain

Open a terminal and keep it running:

```bash
cd contracts
node node_modules/hardhat/internal/cli/cli.js node
```

You will see 20 funded accounts printed. The node listens on `http://127.0.0.1:8545`.

---

### Step 3 — Deploy the contracts

In a second terminal:

```bash
cd contracts
node node_modules/hardhat/internal/cli/cli.js run scripts/deploy.js --network localhost
```

The script will:
- Deploy the `ShipmentTracker` implementation + Transparent Proxy
- Authorize two tracker wallets
- Create a seed shipment (`BATCH-001`)
- Write `frontend/.env` with the live proxy address automatically

Expected output:
```
✅ Proxy deployed to      : 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
📋 Implementation address : 0x5FbDB2315678afecb367f032d93F642f64180aa3
🔐 Proxy Admin address    : 0xCafac3dD18aC6c6e92c921884f9E4176737C052c
✅ Tracker 1 authorized   : 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
✅ Tracker 2 authorized   : 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
✅ Shipment created, ID   : 1
💾 frontend/.env written
🎉 Deployment complete!
```

---

### Step 4 — Start the frontend

```bash
cd frontend
node_modules/.bin/vite
```

First run pre-bundles all heavy deps (~40 s one-time). Every subsequent start takes ~4–5 s.

Open **http://localhost:5173**

---

### Step 5 — Connect MetaMask

1. Open MetaMask → **Add a network manually**
2. Fill in:

   | Field | Value |
   |-------|-------|
   | Network name | Hardhat Local |
   | RPC URL | `http://127.0.0.1:8545` |
   | Chain ID | `31337` |
   | Currency symbol | ETH |

3. Import a test account — copy any **Private Key** from the Hardhat node output (Step 2).
4. Click **Connect** in the dashboard.

---

### Step 6 — Run the contract tests

```bash
cd contracts
node node_modules/hardhat/internal/cli/cli.js test
```

Expected: **24 passing**

```
Proxy Architecture        ✓ 3 tests
Shipment Management       ✓ 5 tests
Temperature Monitoring    ✓ 6 tests
Delivery Management       ✓ 2 tests
Tracker Authorization     ✓ 3 tests
Pausable Functionality    ✓ 1 test
View Functions            ✓ 2 tests
Gas Usage                 ✓ 2 tests   (createShipment: 333k gas, updateStatus: 111k gas)

24 passing
```

---

### Step 7 — Trigger a temperature breach (optional demo)

```bash
cd contracts
node node_modules/hardhat/internal/cli/cli.js run scripts/../scripts/test-temperature-breach.js --network localhost
```

This sends a temperature of **+12 °C** (above the +8 °C limit) to shipment #1. The contract reverts the shipment and emits `TemperatureAlert`. The frontend red overlay fires immediately.

---

### Step 8 — Start the monitoring stack (optional)

Requires Docker Desktop running:

```bash
docker-compose up -d
```

| Service | URL | Credentials |
|---------|-----|-------------|
| Grafana | http://localhost:3001 | admin / admin123 |
| Prometheus | http://localhost:9090 | — |
| Blockchain Exporter | http://localhost:8080/metrics | — |

---

## Deployed Contract Addresses (localhost)

| Contract | Address |
|----------|---------|
| Proxy (use this) | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| Implementation | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| Proxy Admin | `0xCafac3dD18aC6c6e92c921884f9E4176737C052c` |

| Account | Address | Role |
|---------|---------|------|
| Deployer / Owner | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | Contract owner |
| Tracker 1 | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | Authorized IoT tracker |
| Tracker 2 | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | Authorized IoT tracker |

> These are the standard Hardhat test accounts. Private keys are in the node output. **Never use on mainnet.**

---

## Temperature Safety Limits

| Threshold | Value | Alert type |
|-----------|-------|------------|
| Minimum | −80 °C (`-8000` in contract units) | `CRITICAL_LOW` |
| Maximum | +8 °C (`800` in contract units) | `CRITICAL_HIGH` |

Temperatures are stored as **Celsius × 100** (integer) for precision without floating point.

---

## Project Structure

```
vaccine-shipment-tracker/
├── contracts/
│   ├── contracts/
│   │   └── ShipmentTracker.sol      # Upgradeable contract (Transparent Proxy)
│   ├── scripts/
│   │   ├── deploy.js                # Deploys proxy + seeds data + writes frontend/.env
│   │   └── test-temperature-breach.js
│   ├── test/
│   │   └── ShipmentTracker.test.js  # 24 tests
│   ├── aderyn.toml                  # Security audit config
│   └── hardhat.config.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ShipmentList.jsx         # useReadContracts batch reads
│   │   │   ├── CreateShipment.jsx       # useWriteContract
│   │   │   ├── ContractStats.jsx        # useReadContract (polls every 5 s)
│   │   │   ├── GasBudgetTracker.jsx     # useBalance
│   │   │   └── TemperatureAlertOverlay.jsx  # Red full-screen overlay
│   │   ├── hooks/
│   │   │   └── useTemperatureAlerts.js  # useWatchContractEvent
│   │   ├── config/
│   │   │   └── contract.js             # ABI + address from .env
│   │   ├── App.jsx
│   │   └── main.jsx                    # Wagmi + RainbowKit setup
│   ├── .env                            # Written by deploy script
│   └── vite.config.js                  # optimizeDeps + warmup + manualChunks
│
├── docker/
│   ├── blockchain-exporter/
│   │   └── index.js                    # Prometheus exporter (prom-client + ethers)
│   └── Dockerfile.*
│
├── monitoring/
│   ├── prometheus.yml
│   ├── rules/
│   │   └── shipment-alerts.yml         # Alert: 3+ reverts in 10 min → Slack
│   └── grafana/
│       ├── datasources/
│       └── dashboards/
│
├── scripts/
│   └── test-temperature-breach.js
│
├── docker-compose.yml
├── tenderly.yaml
└── CHECKLIST_COMPLIANCE.md

## Common Issues

**`EADDRINUSE: address already in use 127.0.0.1:8545`**
Another Hardhat node is already running. Kill it:
```bash
# Windows PowerShell
Get-NetTCPConnection -LocalPort 8545 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

**Frontend takes 40 s to open the first time**
Normal — Vite is pre-bundling wagmi + RainbowKit + viem into `.vite/deps/`. Every subsequent start takes ~4–5 s.

**MetaMask shows "wrong network"**
Add Hardhat Local manually: RPC `http://127.0.0.1:8545`, Chain ID `31337`.

**`Invalid Version` error during `npm install`**
Use `--legacy-peer-deps`. The `overrides` block in `contracts/package.json` pins `@scure/bip32` to avoid the npm v11 semver bug.

---

*Built with Hardhat · OpenZeppelin · Wagmi · Vite · React · Prometheus · Grafana*
