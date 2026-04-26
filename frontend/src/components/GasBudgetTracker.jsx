import { useBalance, useAccount } from 'wagmi'
import { Wallet, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

// Tracker addresses injected by the deploy script via .env
const TRACKER_ADDRESSES = [
  import.meta.env.VITE_TRACKER1_ADDRESS,
  import.meta.env.VITE_TRACKER2_ADDRESS,
].filter(Boolean)

function GasBudgetTracker({ detailed = false }) {
  const { address } = useAccount()

  const { data: balance, isLoading } = useBalance({ address })

  const formatEth = (b) => (b ? parseFloat(b.formatted).toFixed(4) : '0.0000')
  const formatUsd = (b) => (b ? (parseFloat(b.formatted) * 2000).toFixed(2) : '0.00')

  const statusOf = (b) => {
    if (!b) return 'unknown'
    const v = parseFloat(b.formatted)
    if (v < 0.01) return 'critical'
    if (v < 0.05) return 'warning'
    return 'good'
  }

  const statusStyle = {
    critical: 'text-red-700 bg-red-50 border-red-200',
    warning:  'text-yellow-700 bg-yellow-50 border-yellow-200',
    good:     'text-green-700 bg-green-50 border-green-200',
    unknown:  'text-gray-600 bg-gray-50 border-gray-200',
  }

  const status = statusOf(balance)

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-16 bg-gray-100 rounded-lg" />
        <div className="h-10 bg-gray-100 rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Connected wallet balance */}
      <div className={`p-4 rounded-lg border ${statusStyle[status]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            <span className="font-medium text-sm">Connected Wallet</span>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{formatEth(balance)} ETH</p>
            <p className="text-xs opacity-70">≈ ${formatUsd(balance)} USD</p>
          </div>
        </div>

        {status === 'critical' && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            <AlertCircle className="w-3 h-3" />
            Critical — top up to continue tracking
          </div>
        )}
        {status === 'warning' && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            <AlertCircle className="w-3 h-3" />
            Low balance — consider topping up
          </div>
        )}
        {status === 'good' && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            <CheckCircle className="w-3 h-3" />
            Sufficient gas budget
          </div>
        )}
      </div>

      {/* Tracker wallet balances */}
      {detailed && TRACKER_ADDRESSES.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Authorized Tracker Wallets</h4>
          <div className="space-y-2">
            {TRACKER_ADDRESSES.map((addr, i) => (
              <TrackerBalance key={addr} address={addr} index={i + 1} />
            ))}
          </div>
        </div>
      )}

      {/* Gas stats */}
      {detailed && (
        <>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Estimated Gas Costs
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-500 text-xs">createShipment</p>
                <p className="font-semibold">~334k gas</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">updateStatus</p>
                <p className="font-semibold">~111k gas</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">markDelivered</p>
                <p className="font-semibold">~60k gas</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">authorizeTracker</p>
                <p className="font-semibold">~46k gas</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-blue-700 space-y-1">
            <p className="font-semibold">Recommendations</p>
            <p>• Keep at least 0.05 ETH per tracker wallet</p>
            <p>• Monitor gas prices during high network activity</p>
            <p>• Set up auto top-up for unattended tracker devices</p>
          </div>
        </>
      )}
    </div>
  )
}

function TrackerBalance({ address, index }) {
  const { data: balance, isLoading } = useBalance({ address })

  if (isLoading) {
    return <div className="h-8 bg-gray-100 rounded animate-pulse" />
  }

  const eth = balance ? parseFloat(balance.formatted) : 0
  const low = eth < 0.01

  return (
    <div className="flex items-center justify-between p-2 bg-white border border-gray-200 rounded text-sm">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${low ? 'bg-red-400' : 'bg-green-400'}`} />
        <span className="font-mono text-xs text-gray-600">
          Tracker {index}: {address.slice(0, 6)}…{address.slice(-4)}
        </span>
      </div>
      <span className={`font-medium text-xs ${low ? 'text-red-600' : 'text-gray-700'}`}>
        {eth.toFixed(4)} ETH
      </span>
    </div>
  )
}

export default GasBudgetTracker
