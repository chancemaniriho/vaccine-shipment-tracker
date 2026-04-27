import { useState, useEffect } from 'react'
import { useAccount, useBalance } from 'wagmi'
import ShipmentList from './ShipmentList'
import CreateShipment from './CreateShipment'
import GasBudgetTracker from './GasBudgetTracker'
import ContractStats from './ContractStats'
import SensorSimulator from './SensorSimulator'
import { Activity, Package, Thermometer, Wallet, Radio } from 'lucide-react'

function Dashboard() {
  const { address } = useAccount()
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleShipmentCreated = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'shipments', label: 'Shipments', icon: Package },
    { id: 'create', label: 'Create Shipment', icon: Thermometer },
    { id: 'simulator', label: 'Sensor Simulator', icon: Radio },
    { id: 'gas-budget', label: 'Gas Budget', icon: Wallet },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome to Vaccine Shipment Tracker</h2>
        <p className="text-primary-100">
          Monitor your vaccine shipments in real-time with automated temperature alerts
        </p>
        <div className="mt-4 text-sm text-primary-200">
          Connected as: <span className="font-mono">{address}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <ContractStats refreshTrigger={refreshTrigger} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <ShipmentList limit={5} refreshTrigger={refreshTrigger} />
              </div>
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Gas Budget Overview</h3>
                <GasBudgetTracker />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'shipments' && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">All Shipments</h3>
            <ShipmentList refreshTrigger={refreshTrigger} />
          </div>
        )}

        {activeTab === 'create' && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Create New Shipment</h3>
            <CreateShipment onShipmentCreated={handleShipmentCreated} />
          </div>
        )}

        {activeTab === 'simulator' && (
          <SensorSimulator />
        )}

        {activeTab === 'gas-budget' && (
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Gas Budget Management</h3>
            <GasBudgetTracker detailed={true} />
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard