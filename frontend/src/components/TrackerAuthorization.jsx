import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract'
import { CheckCircle, Loader2, AlertCircle, Shield } from 'lucide-react'

function TrackerAuthorization() {
  const { address: userAddress } = useAccount()
  const [isSubmitted, setIsSubmitted] = useState(false)

  // Check if current user is authorized
  const {
    data: isAuthorized,
    refetch: refetchStatus,
  } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'isTrackerAuthorized',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  })

  const { writeContract, data: hash, error, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    if (isSuccess) {
      setIsSubmitted(false)
      refetchStatus()
    }
  }, [isSuccess, refetchStatus])

  const handleAuthorize = async () => {
    if (!userAddress) return
    setIsSubmitted(true)

    writeContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'authorizeTracker',
      args: [userAddress],
    })
  }

  const isBusy = isPending || isConfirming

  // Already authorized
  if (isAuthorized) {
    return (
      <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-green-900">Tracker Authorized ✓</p>
          <p className="text-xs text-green-700 truncate">
            {userAddress} can now update temperatures
          </p>
        </div>
      </div>
    )
  }

  // Not authorized
  return (
    <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <Shield className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-yellow-900 mb-2">Authorize Tracker Address</p>
        <p className="text-xs text-yellow-700 mb-3">
          Your wallet address needs to be authorized before you can update temperatures.
        </p>
        
        {error && isSubmitted && (
          <div className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 mb-3">
            <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
            <span>{error.shortMessage || error.message}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <code className="text-xs bg-yellow-100 px-2 py-1 rounded flex-1 truncate">
            {userAddress}
          </code>
          <button
            onClick={handleAuthorize}
            disabled={isBusy}
            className="whitespace-nowrap px-3 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white text-xs rounded font-medium transition-colors flex items-center gap-1"
          >
            {isBusy ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                {isConfirming ? 'Confirming...' : 'Authorizing...'}
              </>
            ) : (
              'Authorize'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default TrackerAuthorization
