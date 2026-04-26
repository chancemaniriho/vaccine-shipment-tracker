import { useState, useEffect } from 'react'
import { useReadContract, useReadContracts } from 'wagmi'
import { Package, Thermometer, MapPin, Clock } from 'lucide-react'
import { CONTRACT_ADDRESS, CONTRACT_ABI, STATUS_LABELS } from '../config/contract'

function ShipmentList({ limit, refreshTrigger }) {
  const [shipmentIds, setShipmentIds] = useState([])

  // Get total shipment count
  const { data: stats, refetch: refetchStats } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getContractStats',
  })

  // Build list of IDs to fetch
  useEffect(() => {
    if (!stats) return
    const total = Number(stats[2]) - 1  // nextShipmentId - 1 = last id
    const count = limit ? Math.min(limit, total) : total
    const ids = Array.from({ length: count }, (_, i) => i + 1)
    setShipmentIds(ids)
  }, [stats, limit, refreshTrigger])

  // Refetch when refreshTrigger changes
  useEffect(() => { refetchStats() }, [refreshTrigger])

  // Batch-read all shipments
  const { data: shipmentsData, isLoading } = useReadContracts({
    contracts: shipmentIds.map(id => ({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'getShipment',
      args: [BigInt(id)],
    })),
    query: { enabled: shipmentIds.length > 0 },
  })

  const shipments = (shipmentsData || [])
    .map(r => r.result)
    .filter(Boolean)
    .reverse() // newest first

  const formatTemp = (raw) => (Number(raw) / 100).toFixed(1) + ' °C'
  const formatTime = (ts)  => new Date(Number(ts) * 1000).toLocaleString()

  const statusClass = (s) => {
    const n = Number(s)
    if (n === 0) return 'bg-gray-100 text-gray-700'
    if (n === 1) return 'bg-blue-100 text-blue-700'
    if (n === 2) return 'bg-red-100 text-red-700 animate-pulse'
    if (n === 3) return 'bg-green-100 text-green-700'
    if (n === 4) return 'bg-orange-100 text-orange-700'
    return 'bg-gray-100 text-gray-700'
  }

  if (isLoading || (shipmentIds.length > 0 && !shipmentsData)) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-20" />
        ))}
      </div>
    )
  }

  if (shipments.length === 0) {
    return (
      <div className="text-center py-10 text-gray-400">
        <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">No shipments yet</p>
        <p className="text-sm">Create your first shipment to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {shipments.map((s) => (
        <div
          key={s.id.toString()}
          className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="font-semibold text-gray-900">Shipment #{s.id.toString()}</p>
              <p className="text-xs text-gray-500">Batch: {s.batchNumber}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusClass(s.status)}`}>
              {STATUS_LABELS[Number(s.status)] ?? 'Unknown'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <Thermometer className="w-3 h-3 text-blue-400" />
              {s.currentTemperature !== 0n ? formatTemp(s.currentTemperature) : '—'}
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-green-400" />
              <span className="truncate">{s.location || '—'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-gray-400" />
              {formatTime(s.lastUpdate)}
            </div>
          </div>

          {Number(s.status) === 2 && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
              ⚠️ Temperature breach — shipment automatically reverted
            </div>
          )}
        </div>
      ))}

      {limit && shipments.length >= limit && (
        <p className="text-center text-xs text-primary-600 pt-2 cursor-pointer hover:underline">
          View all shipments →
        </p>
      )}
    </div>
  )
}

export default ShipmentList
