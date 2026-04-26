import { AlertTriangle, X, Thermometer } from 'lucide-react'

function TemperatureAlertOverlay({ alerts, onDismiss }) {
  if (!alerts || alerts.length === 0) return null

  const latestAlert = alerts[0] // Show the most recent alert

  const formatTemperature = (temp) => {
    return (temp / 100).toFixed(1) + '°C'
  }

  const getAlertTypeInfo = (alertType) => {
    switch (alertType) {
      case 'CRITICAL_HIGH':
        return {
          title: 'CRITICAL HIGH TEMPERATURE',
          color: 'text-red-100',
          bgColor: 'bg-red-600',
          icon: '🔥'
        }
      case 'CRITICAL_LOW':
        return {
          title: 'CRITICAL LOW TEMPERATURE',
          color: 'text-blue-100',
          bgColor: 'bg-blue-600',
          icon: '🧊'
        }
      default:
        return {
          title: 'TEMPERATURE ALERT',
          color: 'text-red-100',
          bgColor: 'bg-red-600',
          icon: '⚠️'
        }
    }
  }

  const alertInfo = getAlertTypeInfo(latestAlert.alertType)

  return (
    <div className={`temperature-alert-overlay ${alertInfo.bgColor}`}>
      <div className="text-center text-white max-w-md mx-auto p-8">
        {/* Alert Icon */}
        <div className="text-6xl mb-4 animate-bounce-slow">
          {alertInfo.icon}
        </div>

        {/* Alert Title */}
        <h1 className={`text-3xl font-bold mb-4 ${alertInfo.color}`}>
          {alertInfo.title}
        </h1>

        {/* Alert Details */}
        <div className="bg-white bg-opacity-20 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-center mb-4">
            <Thermometer className="w-8 h-8 mr-2" />
            <span className="text-2xl font-bold">
              {formatTemperature(latestAlert.temperature)}
            </span>
          </div>
          
          <div className="space-y-2 text-sm">
            <p>
              <strong>Shipment ID:</strong> #{latestAlert.shipmentId}
            </p>
            <p>
              <strong>Threshold:</strong> {formatTemperature(latestAlert.threshold)}
            </p>
            <p>
              <strong>Time:</strong> {new Date(latestAlert.timestamp * 1000).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Alert Message */}
        <p className="text-lg mb-6 text-white">
          Vaccine shipment has exceeded safe temperature limits!
          <br />
          <span className="text-sm opacity-90">
            Shipment has been automatically reverted for safety.
          </span>
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          <button
            onClick={() => onDismiss(latestAlert.id)}
            className="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Acknowledge Alert
          </button>
          
          {alerts.length > 1 && (
            <p className="text-sm text-white opacity-75">
              {alerts.length - 1} more alert(s) pending
            </p>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={() => onDismiss(latestAlert.id)}
          className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}

export default TemperatureAlertOverlay