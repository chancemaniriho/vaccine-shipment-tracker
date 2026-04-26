import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import Dashboard from './components/Dashboard'
import TemperatureAlertOverlay from './components/TemperatureAlertOverlay'
import { useTemperatureAlerts } from './hooks/useTemperatureAlerts'

function App() {
  const { isConnected } = useAccount()
  const { alerts, dismissAlert } = useTemperatureAlerts()

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Temperature Alert Overlay (fixed, full-screen) ── */}
      {alerts.length > 0 && (
        <TemperatureAlertOverlay alerts={alerts} onDismiss={dismissAlert} />
      )}

      {/* ── Header ── */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧬</span>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                Vaccine Shipment Tracker
              </h1>
              <p className="text-xs text-gray-400 hidden sm:block">
                Real-time cold-chain monitoring
              </p>
            </div>
          </div>
          <ConnectButton />
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isConnected ? (
          <Dashboard />
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-6">🔗</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Your Wallet</h2>
            <p className="text-gray-500 mb-8 max-w-sm">
              Connect MetaMask (Hardhat Local, chain&nbsp;31337) to access the
              vaccine shipment tracking dashboard.
            </p>
            <ConnectButton />
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 max-w-sm text-left">
              <p className="font-semibold mb-1">Quick setup</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Open MetaMask → Add Network</li>
                <li>RPC URL: <code className="bg-yellow-100 px-1 rounded">http://127.0.0.1:8545</code></li>
                <li>Chain ID: <code className="bg-yellow-100 px-1 rounded">31337</code></li>
                <li>Import a Hardhat account private key</li>
              </ol>
            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 mt-12 py-6 text-center text-xs text-gray-400">
        Vaccine Shipment Tracker — ensuring cold-chain integrity on-chain
      </footer>
    </div>
  )
}

export default App
