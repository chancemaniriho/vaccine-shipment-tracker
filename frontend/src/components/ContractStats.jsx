import { useReadContract } from 'wagmi'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract'
import { Package, Activity, CheckCircle, Hash } from 'lucide-react'

function ContractStats({ refreshTrigger }) {
  const { data: stats, isLoading, error } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getContractStats',
    query: {
      refetchInterval: 5_000,   // poll every 5 s — replaces deprecated watch:true
      staleTime: 3_000,
    },
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="card bg-red-50 border-red-200 text-red-700 text-sm">
        Could not load contract stats — is the Hardhat node running?
        <br />
        <span className="text-xs opacity-70">{error.message}</span>
      </div>
    )
  }

  const total     = stats ? Number(stats[0]) : 0
  const active    = stats ? Number(stats[1]) : 0
  const nextId    = stats ? Number(stats[2]) : 1
  const completed = total - active

  const cards = [
    { label: 'Total Shipments',  value: total,     icon: Package,       color: 'text-blue-600',   bg: 'bg-blue-50'   },
    { label: 'Active',           value: active,    icon: Activity,      color: 'text-green-600',  bg: 'bg-green-50'  },
    { label: 'Completed',        value: completed, icon: CheckCircle,   color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Next Shipment ID', value: nextId,    icon: Hash,          color: 'text-gray-600',   bg: 'bg-gray-50'   },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map(({ label, value, icon: Icon, color, bg }) => (
        <div key={label} className={`card ${bg} border-0`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </div>
            <Icon className={`w-8 h-8 ${color} opacity-70`} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default ContractStats
