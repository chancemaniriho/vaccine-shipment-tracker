import { useState, useEffect } from 'react'
import { usePublicClient, useWalletClient, useAccount } from 'wagmi'
import {
  updateShipmentTemperature,
  generateTemperatureReading,
  generateTemperatureSequence,
  generateBreachScenario,
} from '../services/temperatureSensorService'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract'
import {
  Thermometer,
  Play,
  Zap,
  AlertTriangle,
  CheckCircle,
  Loader2,
  TrendingUp,
  RefreshCw,
} from 'lucide-react'

function SensorSimulator() {
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()

  const { address: userAddress } = useAccount()
  
  const [shipments, setShipments] = useState([])
  const [selectedShipmentId, setSelectedShipmentId] = useState(null)
  const [temperature, setTemperature] = useState(250) // 2.5°C
  const [location, setLocation] = useState('Transit')
  const [isLoading, setIsLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState('') // 'success', 'error', 'info'
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationSpeed, setSimulationSpeed] = useState(1000) // ms between updates
  const [isFetchingShipments, setIsFetchingShipments] = useState(true)

  // Fetch active shipments - re-run whenever publicClient is available
  useEffect(() => {
    if (!publicClient) return
    
    fetchShipments()
  }, [publicClient])

  const fetchShipments = async () => {
    if (!publicClient) {
      setStatusMessage('Wallet not connected')
      setStatusType('error')
      setIsFetchingShipments(false)
      return
    }

    try {
      setIsFetchingShipments(true)
      const stats = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'getContractStats',
      })

      const [totalShipments] = stats
      
      if (totalShipments === 0) {
        setShipments([])
        setStatusMessage('No shipments found. Create one first.')
        setStatusType('info')
        setIsFetchingShipments(false)
        return
      }

      const activeShipments = []

      // Fetch each shipment starting from ID 1
      for (let i = 1; i < totalShipments; i++) {
        try {
          const shipment = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'getShipment',
            args: [BigInt(i)],
          })

          // Include active shipments
          if (shipment.isActive) {
            activeShipments.push({
              id: Number(shipment.id),
              batchNumber: shipment.batchNumber,
              currentTemp: Number(shipment.currentTemperature),
              trackerAddress: shipment.tracker,
            })
          }
        } catch (shipmentError) {
          console.warn(`Failed to fetch shipment ${i}:`, shipmentError)
        }
      }

      setShipments(activeShipments)
      
      if (activeShipments.length > 0 && !selectedShipmentId) {
        setSelectedShipmentId(activeShipments[0].id)
        setStatusMessage(`Loaded ${activeShipments.length} active shipment(s)`)
        setStatusType('success')
      } else if (activeShipments.length === 0) {
        setStatusMessage('No active shipments available')
        setStatusType('info')
      }

      setIsFetchingShipments(false)
    } catch (error) {
      console.error('Error fetching shipments:', error)
      setStatusMessage(`Failed to load shipments: ${error.shortMessage || error.message}`)
      setStatusType('error')
      setIsFetchingShipments(false)
    }
  }

  const handleUpdateTemperature = async () => {
    if (!selectedShipmentId) {
      setStatusMessage('Please select a shipment')
      setStatusType('error')
      return
    }
// Check if user's wallet matches the tracker address
    const shipment = shipments.find(s => s.id === selectedShipmentId)
    if (shipment && shipment.trackerAddress.toLowerCase() !== userAddress?.toLowerCase()) {
      setStatusMessage(
        `❌ Wallet mismatch: Your wallet (${userAddress?.slice(0, 6)}...) is not the tracker for this shipment (${shipment.trackerAddress.slice(0, 6)}...). ` +
        `Make sure your wallet address matches the tracker address specified when creating the shipment.`
      )
      setStatusType('error')
      return
    }

    setIsLoading(true)
    setStatusMessage('')

    try {
      await updateShipmentTemperature(
        publicClient,
        walletClient,
        selectedShipmentId,
        temperature,
        location
      )

      setStatusMessage(
        `✓ Temperature updated to ${(temperature / 100).toFixed(1)}°C`
      )
      setStatusType('success')

      // Refresh shipments
      setTimeout(() => fetchShipments(), 2000)
    } catch (error) {
      const errorMsg = error.shortMessage || error.message
      
      // Parse authorization errors
      if (errorMsg.includes('Not authorized tracker')) {
        setStatusMessage(
          `❌ Tracker not authorized: The tracker address for this shipment is not authorized. ` +
          `The contract owner must call authorizeTracker() first.`
        )
      } else if (errorMsg.includes('Unauthorized for this shipment')) {
        setStatusMessage(
          `❌ Your wallet is not the tracker: Your wallet doesn't match the shipment's tracker address. ` +
          `When creating a shipment, use your current wallet address as the tracker address.`
        )
      } else {
        setStatusMessage(`Error: ${errorMsg}`)
      }
      setStatusMessage(`Error: ${error.shortMessage || error.message}`)
      setStatusType('error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSimulateNormal = async () => {
    if (!selectedShipmentId) return

    const readings = generateTemperatureSequence(
      temperature,
      5,
      50 // variance
    )

    setIsSimulating(true)
    setStatusMessage('Simulating normal operation...')
    setStatusType('info')

    for (const reading of readings) {
      if (!isSimulating) break

      try {
        setTemperature(reading.temperature)
        await updateShipmentTemperature(
          publicClient,
          walletClient,
          selectedShipmentId,
          reading.temperature,
          'Transit'
        )
        await new Promise((resolve) => setTimeout(resolve, simulationSpeed))
      } catch (error) {
        console.error('Simulation error:', error)
        break
      }
    }

    setIsSimulating(false)
    setStatusMessage('Simulation completed')
    setStatusType('success')
    await fetchShipments()
  }

  const handleSimulateBreach = async () => {
    if (!selectedShipmentId) return

    // Safe range: -80°C to 8°C, so breach is >800 (8°C)
    const breachTemp = 1200 // 12°C - above safe limit
    const readings = generateBreachScenario(temperature, breachTemp, 8)

    setIsSimulating(true)
    setStatusMessage('⚠️ Simulating temperature breach scenario...')
    setStatusType('error')

    for (const reading of readings) {
      if (!isSimulating) break

      try {
        setTemperature(reading.temperature)
        await updateShipmentTemperature(
          publicClient,
          walletClient,
          selectedShipmentId,
          reading.temperature,
          'Transit - Temperature Alert!'
        )
        await new Promise((resolve) => setTimeout(resolve, simulationSpeed))
      } catch (error) {
        console.error('Simulation error:', error)
        break
      }
    }

    setIsSimulating(false)
    setStatusMessage('🔥 Breach simulation completed - temperature exceeded limits')
    setStatusType('error')
    await fetchShipments()
  }

  const handleRandomFluctuation = async () => {
    const newTemp = generateTemperatureReading(temperature, 100)
    setTemperature(newTemp)
    setStatusMessage(`Temperature fluctuated to ${(newTemp / 100).toFixed(1)}°C`)
    setStatusType('info')
  }

  const formatTemp = (temp) => {
    return (temp / 100).toFixed(1)
  }

  const isCritical = temperature > 800 || temperature < -8000

  return (
    <div className="card max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Thermometer className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold">Temperature Sensor Simulator</h3>
      </div>

      <div className="space-y-5">
        {/* Shipment Selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Shipment
            </label>
            <button
              onClick={fetchShipments}
              disabled={isFetchingShipments || isSimulating || isLoading}
              className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400 flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
          <select
            value={selectedShipmentId || ''}
            onChange={(e) => setSelectedShipmentId(Number(e.target.value))}
            disabled={isFetchingShipments || isSimulating || isLoading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       disabled:bg-gray-50 disabled:text-gray-400"
          >
        {isFetchingShipments ? (
              <option>Loading shipments...</option>
            ) : shipments.length === 0 ? (
              <option>No active shipments available</option>
            ) : (
              <>
                <option value="">-- Select a shipment --</option>
                {shipments.map((shipment) => {
                  const isTrackerMatch = shipment.trackerAddress?.toLowerCase() === userAddress?.toLowerCase()
                  const icon = isTrackerMatch ? '✓' : '⚠️'
                  return (
                    <option key={shipment.id} value={shipment.id}>
                      {icon} #{shipment.id} - {shipment.batchNumber} ({formatTemp(shipment.currentTemp)}°C)
                    </option>
                  )
                })}
              </>
            )}
          </select>
        </div>

        {/* Temperature Input */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature (°C)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={formatTemp(temperature)}
                onChange={(e) => setTemperature(Math.round(parseFloat(e.target.value) * 100))}
                step={0.1}
                disabled={isSimulating || isLoading}
                className={`flex-1 px-3 py-2 border rounded-md shadow-sm text-sm
                           focus:outline-none focus:ring-2 focus:border-blue-500
                           disabled:bg-gray-50 disabled:text-gray-400
                           ${isCritical ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'}`}
              />
              <span className="text-xs text-gray-500 font-mono">
                {temperature > 800 ? '⚠️' : temperature < -8000 ? '❄️' : '✓'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isSimulating || isLoading}
              placeholder="e.g., Warehouse A"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                         disabled:bg-gray-50 disabled:text-gray-400"
            />
          </div>
        </div>

        {/* Temperature Range Info */}
        <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-md">
          <p className="font-semibold mb-1">Safe Range: -80°C to 8°C</p>
          <p>Current: {formatTemp(temperature)}°C {isCritical && '❌ OUT OF RANGE'}</p>
        </div>

        {/* Simulation Speed Control */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Simulation Speed (ms between updates)
          </label>
          <input
            type="range"
            min="500"
            max="5000"
            step="500"
            value={simulationSpeed}
            onChange={(e) => setSimulationSpeed(Number(e.target.value))}
            disabled={isSimulating}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">{simulationSpeed}ms</p>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`flex items-start gap-3 p-3 rounded-md text-sm ${
              statusType === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : statusType === 'error'
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-blue-50 border border-blue-200 text-blue-700'
            }`}
          >
            {statusType === 'success' && <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            {statusType === 'error' && <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
            {statusType === 'info' && <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />}
            <p>{statusMessage}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleUpdateTemperature}
            disabled={isSimulating || isLoading || !selectedShipmentId}
            className="btn-primary flex items-center justify-center gap-2 py-2 text-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Send Reading
              </>
            )}
          </button>

          <button
            onClick={handleRandomFluctuation}
            disabled={isSimulating || isLoading || !selectedShipmentId}
            className="btn-secondary flex items-center justify-center gap-2 py-2 text-sm"
          >
            <TrendingUp className="w-4 h-4" />
            Random Flux
          </button>

          <button
            onClick={handleSimulateNormal}
            disabled={isSimulating || isLoading || !selectedShipmentId}
            className="btn-secondary flex items-center justify-center gap-2 py-2 text-sm"
          >
            {isSimulating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Simulating...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Normal Op
              </>
            )}
          </button>

          <button
            onClick={handleSimulateBreach}
            disabled={isSimulating || isLoading || !selectedShipmentId}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-4 py-2 rounded-md font-medium text-sm
                       flex items-center justify-center gap-2 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Trigger Breach
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-blue-50 rounded-md text-xs text-blue-700 border border-blue-200 space-y-2">
          <p className="font-semibold">📌 Authorization Requirements:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <strong>Your wallet must be the tracker:</strong> When creating a shipment, use your current wallet address as the tracker ({userAddress?.slice(0, 6)}...{userAddress?.slice(-4)})
            </li>
            <li>
              <strong>Tracker must be authorized:</strong> Ask the contract owner to call <code className="bg-blue-100 px-1 rounded">authorizeTracker(yourAddress)</code>
            </li>
            <li>
              ✓ = your wallet owns this shipment | ⚠️ = use a different wallet to update
            </li>
          </ul>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-md text-xs text-gray-600 space-y-1">
          <p className="font-semibold">How to use:</p>
          <ul className="list-disc list-inside">
            <li>
              <strong>Send Reading:</strong> Send a single temperature update to blockchain
            </li>
            <li>
              <strong>Random Flux:</strong> Simulate a random temperature fluctuation
            </li>
            <li>
              <strong>Normal Op:</strong> Simulate realistic sensor readings over time
            </li>
            <li>
              <strong>Trigger Breach:</strong> Simulate a critical temperature breach scenario
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default SensorSimulator
