// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

/**
 * @title ShipmentTracker
 * @dev Tracks vaccine shipments with temperature monitoring and automated reversion
 * @notice This contract is designed to be used behind a Transparent Proxy
 */
contract ShipmentTracker is 
    Initializable, 
    OwnableUpgradeable, 
    PausableUpgradeable
{
    // Reentrancy guard (proxy-safe: stored in proxy state, not constructor)
    uint256 private _reentrancyStatus;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    modifier nonReentrant() {
        require(_reentrancyStatus != _ENTERED, "ShipmentTracker: reentrant call");
        _reentrancyStatus = _ENTERED;
        _;
        _reentrancyStatus = _NOT_ENTERED;
    }

    // Structs
    struct Shipment {
        uint256 id;
        string batchNumber;
        address tracker;
        uint256 createdAt;
        uint256 lastUpdate;
        int256 currentTemperature;
        int256 minTemperature;
        int256 maxTemperature;
        ShipmentStatus status;
        string location;
        bool isActive;
    }

    enum ShipmentStatus {
        Created,
        InTransit,
        TemperatureBreach,
        Delivered,
        Reverted
    }

    // State variables
    mapping(uint256 => Shipment) public shipments;
    mapping(address => bool) public authorizedTrackers;
    mapping(address => uint256[]) public trackerShipments;
    
    uint256 public nextShipmentId;
    uint256 public totalShipments;
    uint256 public activeShipments;
    
    // Temperature thresholds (in Celsius * 100 for precision)
    int256 public constant MIN_SAFE_TEMPERATURE = -8000; // -80°C
    int256 public constant MAX_SAFE_TEMPERATURE = 800;   // 8°C
    
    // Events
    event ShipmentCreated(
        uint256 indexed shipmentId,
        string batchNumber,
        address indexed tracker,
        uint256 timestamp
    );
    
    event TemperatureUpdated(
        uint256 indexed shipmentId,
        int256 temperature,
        string location,
        uint256 timestamp
    );
    
    event TemperatureAlert(
        uint256 indexed shipmentId,
        int256 temperature,
        int256 threshold,
        string alertType,
        uint256 timestamp
    );
    
    event ShipmentReverted(
        uint256 indexed shipmentId,
        string reason,
        uint256 timestamp
    );
    
    event StatusUpdated(
        uint256 indexed shipmentId,
        ShipmentStatus oldStatus,
        ShipmentStatus newStatus,
        uint256 timestamp
    );
    
    event TrackerAuthorized(address indexed tracker, uint256 timestamp);
    event TrackerRevoked(address indexed tracker, uint256 timestamp);

    // Modifiers
    modifier onlyAuthorizedTracker() {
        require(authorizedTrackers[msg.sender], "ShipmentTracker: Not authorized tracker");
        _;
    }
    
    modifier shipmentExists(uint256 _shipmentId) {
        require(_shipmentId < nextShipmentId, "ShipmentTracker: Shipment does not exist");
        _;
    }
    
    modifier shipmentActive(uint256 _shipmentId) {
        require(shipments[_shipmentId].isActive, "ShipmentTracker: Shipment not active");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the contract (replaces constructor for upgradeable contracts)
     * @param _owner Initial owner of the contract
     */
    function initialize(address _owner) public initializer {
        __Ownable_init(_owner);
        __Pausable_init();
        
        _reentrancyStatus = _NOT_ENTERED;
        
        nextShipmentId = 1;
        totalShipments = 0;
        activeShipments = 0;
    }

    /**
     * @dev Create a new shipment
     * @param _batchNumber Unique batch identifier
     * @param _tracker Address of the IoT tracker device
     * @return shipmentId The ID of the created shipment
     */
    function createShipment(
        string memory _batchNumber,
        address _tracker
    ) external onlyOwner whenNotPaused returns (uint256) {
        require(_tracker != address(0), "ShipmentTracker: Invalid tracker address");
        require(bytes(_batchNumber).length > 0, "ShipmentTracker: Batch number required");
        
        uint256 shipmentId = nextShipmentId++;
        
        shipments[shipmentId] = Shipment({
            id: shipmentId,
            batchNumber: _batchNumber,
            tracker: _tracker,
            createdAt: block.timestamp,
            lastUpdate: block.timestamp,
            currentTemperature: 0,
            minTemperature: type(int256).max,
            maxTemperature: type(int256).min,
            status: ShipmentStatus.Created,
            location: "Origin",
            isActive: true
        });
        
        trackerShipments[_tracker].push(shipmentId);
        totalShipments++;
        activeShipments++;
        
        emit ShipmentCreated(shipmentId, _batchNumber, _tracker, block.timestamp);
        
        return shipmentId;
    }

    /**
     * @dev Update shipment status and temperature
     * @param _shipmentId ID of the shipment
     * @param _temperature Current temperature (Celsius * 100)
     * @param _location Current location
     */
    function updateStatus(
        uint256 _shipmentId,
        int256 _temperature,
        string memory _location
    ) external 
        onlyAuthorizedTracker 
        whenNotPaused 
        nonReentrant 
        shipmentExists(_shipmentId) 
        shipmentActive(_shipmentId) 
    {
        Shipment storage shipment = shipments[_shipmentId];
        require(shipment.tracker == msg.sender, "ShipmentTracker: Unauthorized for this shipment");
        
        // Check temperature thresholds
        if (_temperature < MIN_SAFE_TEMPERATURE || _temperature > MAX_SAFE_TEMPERATURE) {
            _handleTemperatureBreach(_shipmentId, _temperature);
            return; // Exit early after reversion
        }
        
        // Update shipment data
        ShipmentStatus oldStatus = shipment.status;
        shipment.currentTemperature = _temperature;
        shipment.location = _location;
        shipment.lastUpdate = block.timestamp;
        
        // Update temperature ranges
        if (_temperature < shipment.minTemperature) {
            shipment.minTemperature = _temperature;
        }
        if (_temperature > shipment.maxTemperature) {
            shipment.maxTemperature = _temperature;
        }
        
        // Update status to InTransit if still Created
        if (shipment.status == ShipmentStatus.Created) {
            shipment.status = ShipmentStatus.InTransit;
            emit StatusUpdated(_shipmentId, oldStatus, ShipmentStatus.InTransit, block.timestamp);
        }
        
        emit TemperatureUpdated(_shipmentId, _temperature, _location, block.timestamp);
    }

    /**
     * @dev Handle temperature breach and revert shipment
     * @param _shipmentId ID of the shipment
     * @param _temperature The temperature that caused the breach
     */
    function _handleTemperatureBreach(uint256 _shipmentId, int256 _temperature) internal {
        Shipment storage shipment = shipments[_shipmentId];
        ShipmentStatus oldStatus = shipment.status;
        
        shipment.status = ShipmentStatus.TemperatureBreach;
        shipment.currentTemperature = _temperature;
        shipment.lastUpdate = block.timestamp;
        
        // Determine which threshold was breached
        string memory alertType;
        int256 threshold;
        
        if (_temperature < MIN_SAFE_TEMPERATURE) {
            alertType = "CRITICAL_LOW";
            threshold = MIN_SAFE_TEMPERATURE;
        } else {
            alertType = "CRITICAL_HIGH";
            threshold = MAX_SAFE_TEMPERATURE;
        }
        
        emit TemperatureAlert(_shipmentId, _temperature, threshold, alertType, block.timestamp);
        emit StatusUpdated(_shipmentId, oldStatus, ShipmentStatus.TemperatureBreach, block.timestamp);
        
        // Automatically revert the shipment
        _revertShipment(_shipmentId, "Temperature threshold exceeded");
    }

    /**
     * @dev Revert a shipment due to safety concerns
     * @param _shipmentId ID of the shipment to revert
     * @param _reason Reason for reversion
     */
    function _revertShipment(uint256 _shipmentId, string memory _reason) internal {
        Shipment storage shipment = shipments[_shipmentId];
        ShipmentStatus oldStatus = shipment.status;
        
        shipment.status = ShipmentStatus.Reverted;
        shipment.isActive = false;
        activeShipments--;
        
        emit ShipmentReverted(_shipmentId, _reason, block.timestamp);
        emit StatusUpdated(_shipmentId, oldStatus, ShipmentStatus.Reverted, block.timestamp);
    }

    /**
     * @dev Mark shipment as delivered
     * @param _shipmentId ID of the shipment
     */
    function markDelivered(uint256 _shipmentId) 
        external 
        onlyAuthorizedTracker 
        whenNotPaused 
        shipmentExists(_shipmentId) 
        shipmentActive(_shipmentId) 
    {
        Shipment storage shipment = shipments[_shipmentId];
        require(shipment.tracker == msg.sender, "ShipmentTracker: Unauthorized for this shipment");
        require(shipment.status == ShipmentStatus.InTransit, "ShipmentTracker: Invalid status for delivery");
        
        ShipmentStatus oldStatus = shipment.status;
        shipment.status = ShipmentStatus.Delivered;
        shipment.isActive = false;
        shipment.lastUpdate = block.timestamp;
        activeShipments--;
        
        emit StatusUpdated(_shipmentId, oldStatus, ShipmentStatus.Delivered, block.timestamp);
    }

    /**
     * @dev Authorize a tracker device
     * @param _tracker Address of the tracker to authorize
     */
    function authorizeTracker(address _tracker) external onlyOwner {
        require(_tracker != address(0), "ShipmentTracker: Invalid tracker address");
        require(!authorizedTrackers[_tracker], "ShipmentTracker: Tracker already authorized");
        
        authorizedTrackers[_tracker] = true;
        emit TrackerAuthorized(_tracker, block.timestamp);
    }

    /**
     * @dev Revoke tracker authorization
     * @param _tracker Address of the tracker to revoke
     */
    function revokeTracker(address _tracker) external onlyOwner {
        require(authorizedTrackers[_tracker], "ShipmentTracker: Tracker not authorized");
        
        authorizedTrackers[_tracker] = false;
        emit TrackerRevoked(_tracker, block.timestamp);
    }

    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // View functions
    function getShipment(uint256 _shipmentId) external view returns (Shipment memory) {
        require(_shipmentId < nextShipmentId, "ShipmentTracker: Shipment does not exist");
        return shipments[_shipmentId];
    }

    function getTrackerShipments(address _tracker) external view returns (uint256[] memory) {
        return trackerShipments[_tracker];
    }

    function isTrackerAuthorized(address _tracker) external view returns (bool) {
        return authorizedTrackers[_tracker];
    }

    function getContractStats() external view returns (
        uint256 total,
        uint256 active,
        uint256 nextId
    ) {
        return (totalShipments, activeShipments, nextShipmentId);
    }
}