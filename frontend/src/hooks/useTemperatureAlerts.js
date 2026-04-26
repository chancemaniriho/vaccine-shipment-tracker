import { useState, useEffect } from 'react'
import { useWatchContractEvent } from 'wagmi'
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract'

export function useTemperatureAlerts() {
  const [alerts, setAlerts] = useState([])

  // Watch for TemperatureAlert events
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: 'TemperatureAlert',
    onLogs(logs) {
      console.log('New temperature alerts!', logs)
      
      const newAlerts = logs.map(log => ({
        id: `${log.transactionHash}-${log.logIndex}`,
        shipmentId: Number(log.args.shipmentId),
        temperature: Number(log.args.temperature),
        threshold: Number(log.args.threshold),
        alertType: log.args.alertType,
        timestamp: Number(log.args.timestamp),
        blockNumber: log.blockNumber,
        transactionHash: log.transactionHash,
      }))

      setAlerts(prev => [...newAlerts, ...prev])
    },
  })

  // Watch for ShipmentReverted events (related to temperature breaches)
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: 'ShipmentReverted',
    onLogs(logs) {
      console.log('Shipments reverted!', logs)
      
      // You could add additional logic here to correlate with temperature alerts
      logs.forEach(log => {
        console.log(`Shipment ${log.args.shipmentId} reverted: ${log.args.reason}`)
      })
    },
  })

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }

  const dismissAllAlerts = () => {
    setAlerts([])
  }

  // Auto-dismiss alerts after 30 seconds (optional)
  useEffect(() => {
    if (alerts.length === 0) return

    const timer = setTimeout(() => {
      setAlerts(prev => prev.slice(0, -1)) // Remove oldest alert
    }, 30000)

    return () => clearTimeout(timer)
  }, [alerts])

  return {
    alerts,
    dismissAlert,
    dismissAllAlerts,
    hasAlerts: alerts.length > 0,
  }
}