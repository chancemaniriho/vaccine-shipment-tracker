import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract'

/**
 * Service for simulating temperature data and sending to blockchain
 */

export const updateShipmentTemperature = async (
  publicClient,
  walletClient,
  shipmentId,
  temperature, // in Celsius * 100 (e.g., 250 = 2.5°C)
  location = 'Transit'
) => {
  try {
    if (!walletClient) {
      throw new Error('Wallet client not available')
    }

    const [account] = await walletClient.getAddresses()

    const { request } = await publicClient.simulateContract({
      address: CONTRACT_ADDRESS,
      abi: CONTRACT_ABI,
      functionName: 'updateStatus',
      args: [BigInt(shipmentId), BigInt(temperature), location],
      account,
    })

    const hash = await walletClient.writeContract(request)
    console.log('Temperature update transaction sent:', hash)

    // Poll for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    console.log('Temperature update confirmed:', receipt)

    return {
      success: true,
      hash,
      receipt,
    }
  } catch (error) {
    console.error('Error updating shipment temperature:', error)
    throw error
  }
}

/**
 * Generate realistic temperature fluctuations
 * Simulates IoT sensor reading patterns
 */
export const generateTemperatureReading = (baseTemp, variance = 50) => {
  // Adds ±variance fluctuation (in units of 0.01°C) to base temperature
  const randomVariance = (Math.random() - 0.5) * 2 * variance
  return Math.round(baseTemp + randomVariance)
}

/**
 * Generate a series of temperature readings over time
 */
export const generateTemperatureSequence = (startTemp, count = 10, variance = 50) => {
  const sequence = []
  let currentTemp = startTemp
  for (let i = 0; i < count; i++) {
    currentTemp = generateTemperatureReading(currentTemp, variance)
    sequence.push({
      index: i,
      temperature: currentTemp,
      timestamp: new Date(Date.now() + i * 1000), // 1 second apart
    })
  }
  return sequence
}

/**
 * Simulate a temperature breach scenario
 * Gradually increases temperature above safe limits
 */
export const generateBreachScenario = (startTemp, breachTemp, steps = 15) => {
  const sequence = []
  const tempDifference = breachTemp - startTemp
  const stepIncrement = tempDifference / steps

  for (let i = 0; i < steps; i++) {
    sequence.push({
      index: i,
      temperature: Math.round(startTemp + stepIncrement * (i + 1)),
      timestamp: new Date(Date.now() + i * 2000), // 2 seconds apart
      isBreach: i >= steps - 3, // Last 3 are breaches
    })
  }
  return sequence
}

export default {
  updateShipmentTemperature,
  generateTemperatureReading,
  generateTemperatureSequence,
  generateBreachScenario,
}
