import { useState, useEffect } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract'
import { Package, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import TrackerAuthorization from './TrackerAuthorization'

function CreateShipment({ onShipmentCreated }) {
  const { address: userAddress } = useAccount()
  const [batchNumber, setBatchNumber]     = useState('')
  const [trackerAddress, setTrackerAddress] = useState('')
  const [submitted, setSubmitted]         = useState(false)

  const { writeContract, data: hash, error, isPending } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // ✅ Side-effects on success go in useEffect, never during render
  useEffect(() => {
    if (!isSuccess) return
    setBatchNumber('')
    setTrackerAddress('')
    setSubmitted(false)
    onShipmentCreated?.()
  }, [isSuccess]) // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-fill tracker address with user's wallet on mount
  useEffect(() => {
    if (userAddress && !trackerAddress) {
      setTrackerAddress(userAddress)
    }
  }, [userAddress]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!batchNumber.trim() || !trackerAddress.trim()) return
    setSubmitted(true)
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'createShipment',
      args: [batchNumber.trim(), trackerAddress.trim()],
    })
  }

  const busy = isPending || isConfirming

  return (
    <div className="max-w-md space-y-5">
      {/* Tracker Authorization Status */}
      <TrackerAuthorization />

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Batch Number */}
        <div>
          <label htmlFor="batchNumber" className="block text-sm font-medium text-gray-700 mb-1">
            Batch Number
          </label>
          <input
            id="batchNumber"
            type="text"
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            placeholder="e.g., BATCH-002"
            disabled={busy}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                       disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        {/* Tracker Address */}
        <div>
          <label htmlFor="trackerAddress" className="block text-sm font-medium text-gray-700 mb-1">
            Tracker Device Address <span className="text-xs text-gray-400">(often your wallet)</span>
          </label>
          <input
            id="trackerAddress"
            type="text"
            value={trackerAddress}
            onChange={(e) => setTrackerAddress(e.target.value)}
            placeholder="0x..."
            disabled={busy}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm font-mono text-sm
                       focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                       disabled:bg-gray-50 disabled:text-gray-400"
          />
          <p className="mt-1 text-xs text-gray-400">
            ⭐ Tip: Use your current wallet address ({userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}) to update temperatures in the Sensor Simulator
          </p>
        </div>

        {/* Error */}
        {error && submitted && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-sm text-red-700">{error.shortMessage || error.message}</p>
          </div>
        )}

        {/* Success */}
        {isSuccess && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
            <p className="text-sm text-green-700">Shipment created successfully!</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={busy || !batchNumber.trim() || !trackerAddress.trim()}
          className="w-full btn-primary flex items-center justify-center gap-2
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isConfirming ? 'Confirming on chain…' : 'Sending transaction…'}
            </>
          ) : (
            <>
              <Package className="w-4 h-4" />
              Create Shipment
            </>
          )}
        </button>
      </form>

      {/* Info box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-md text-xs text-blue-700 space-y-1">
        <p className="font-semibold mb-1">Temperature Safety Limits</p>
        <p>• Minimum: −80 °C (ultra-low freezer)</p>
        <p>• Maximum: +8 °C (refrigerated transport)</p>
        <p>• Breach → automatic on-chain reversion + alert overlay</p>
      </div>
    </div>
  )
}

export default CreateShipment
