pragma solidity >=0.6.2;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/
    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;

    uint8 private constant CREDIT_NOMINATOR = 3;
    uint8 private constant CREDIT_DENOMINATOR = 2;

    uint8 private constant VOTING_MAJORITY_PERCENT = 50;
    uint256 private INITIAL_FUNDING_AIRLINE = 10 ether;

    uint256 private constant MAX_PRICE_INSURANCE = 1 ether;
    uint8 private constant MIN_NUMBER_AIRLINES_CONTRACT = 4;


    address private contractOwner;          // Account used to deploy contract
    FlightSuretyDataContract dataContract;

    struct Flight {
        uint8 statusCode;
        uint256 updatedTimestamp;
        address airline;
    }

    mapping(bytes32 => Flight) private flights;


    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational()
    {
        require(isOperationalFalue, "Contract is currently not operational");
        _;
        // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor
    (
        address payable dataContractParam
    )
    public
    {

        contractOwner = msg.sender;
        dataContract = FlightSuretyDataContract(dataContractParam);
        dataContractAccount = dataContractParam;

    }

    address payable dataContractAccount;


    bool isOperationalFalue = true;
    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational()
    public view
    requireContractOwner
    returns (bool)
    {
        return dataContract.isOperational();
        // Modify to call data contract's status;

    }

    modifier requireCallerIsRegisteredAirline{
        require(dataContract.isRegisteredAirline(msg.sender) == true);
        _;
    }

    modifier requireCallerIsFundedAirline{
        require(dataContract.isFundedAirline(msg.sender) == true);
        _;
    }

    modifier requireAirlineUnknown(string  memory airlineName) {
        require(dataContract.isRegisteredAirlineName(airlineName) == false && dataContract.isPendingRegistrationAirlineName(airlineName) == false);
        _;
    }

    modifier requireAirlineNotRegisteredButPending(string memory airlineName) {
        require(dataContract.isRegisteredAirlineName(airlineName) == false && dataContract.isPendingRegistrationAirlineName(airlineName) == true);
        _;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    mapping(address => bool) registeredAirlines;

    /**
     * @dev Add an airline to the registration queue
    *
    */
    function registerAirline(string calldata airlineName, address account) requireCallerIsRegisteredAirline requireCallerIsFundedAirline external
    {
        dataContract.registerAirline(account, airlineName);
    }

    /**
     * @dev Called after oracle has updated flight status
    *
    */
    function processFlightStatus
    (
        address airline,
        string memory flight,
        uint256 timestamp,
        uint8 statusCode
    )
    internal

    {

        bytes32 flightKey = getFlightKey(airline, flight, timestamp);
        flights[flightKey].statusCode = statusCode;
        if (statusCode == STATUS_CODE_LATE_AIRLINE) {
            dataContract.creditInsurees(flight);
        }
    }

    // click in the UI dapp triggers this call, which triggers request in the backend
    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
    (
        address airline,
        string calldata flight,
        uint256 timestamp
    )
    external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
        requester : msg.sender,
        isOpen : true
        });

        emit OracleRequest(index, airline, flight, timestamp);
    }


    /**
     * @dev Buy insurance for a flight
    *
    */
    function buy(string calldata flight, address airline)
    external
    payable
    {

        require(dataContract.isFundedAirline(airline) == true, "Airline must be registered and funded");
        require(msg.value <= 1 ether);

        uint256 amount = msg.value;

        uint256 creditAmount = amount.mul(CREDIT_NOMINATOR).div(CREDIT_DENOMINATOR);
        dataContract.buy{value : msg.value}(flight, msg.sender, creditAmount);
    }



    // region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
        // This lets us group responses and identify
        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, string flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, string flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, string flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle
    (
    )
    external
    payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
        isRegistered : true,
        indexes : indexes
        });

    }

    function getMyIndexes
    (
    )
    view
    external
    returns (uint8[3] memory)
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }

    function withdraw(uint256 valueToWithdraw) payable public {

        address  payable user = msg.sender;
        dataContract.pay(valueToWithdraw, user);

    }



    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
    (
        uint8 index,
        address airline,
        string calldata flight,
        uint256 timestamp,
        uint8 statusCode
    )
    external
    {

        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        if (!oracleResponses[key].isOpen) {
            //require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

            oracleResponses[key].responses[statusCode].push(msg.sender);

            // Information isn't considered verified until at least MIN_RESPONSES
            // oracles respond with the *** same *** information
            emit OracleReport(airline, flight, timestamp, statusCode);
            if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

                emit FlightStatusInfo(airline, flight, timestamp, statusCode);

                // Handle flight status as appropriate
                processFlightStatus(airline, flight, timestamp, statusCode);

                oracleResponses[key].isOpen = false;
            }
        }

    }


    function getFlightKey
    (
        address airline,
        string memory flight,
        uint256 timestamp
    )
    pure
    internal
    returns (bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
    (
        address account
    )
    internal
    returns (uint8[3] memory)
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);

        indexes[1] = indexes[0];
        while (indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while ((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
    (
        address account
    )
    internal
    returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;
            // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }


    function isBought(string calldata flight) external returns (address addr, uint256 creditAmount){
        return dataContract.isBought(flight);
    }

    function getBalance() external returns (uint256 result) {
        address myAddress = dataContractAccount;
        uint256 balance = myAddress.balance;
        return balance;
    }

    function getUserCredit() external view returns (uint256 result){
        address userAddress = msg.sender;
        return dataContract.getCreditFor(userAddress);
    }

    function addFundsAirline(string calldata airlineName)
    external
    payable
    requireIsOperational
    requireCallerIsRegisteredAirline
    {
        require(
            msg.value >= INITIAL_FUNDING_AIRLINE,
            "Airline funding requires 10 Ether"
        );
        dataContract.fund{value : msg.value}(msg.sender, airlineName);
        uint256 back = msg.value - INITIAL_FUNDING_AIRLINE;
        msg.sender.transfer(back);
    }

    modifier requireNotYetVoted(address voter, string memory airlineName) {
        bool result = dataContract.hasAlreadyVotedFor(voter, airlineName);
        require(result == false,
            "you already voted this airline");
        _;
    }

    function voteForAirline(string memory voteForAirline) public requireCallerIsRegisteredAirline requireCallerIsFundedAirline requireAirlineNotRegisteredButPending(voteForAirline) requireNotYetVoted(msg.sender, voteForAirline) {
        dataContract.voteForAirline(msg.sender, voteForAirline, VOTING_MAJORITY_PERCENT);
    }
}

abstract contract FlightSuretyDataContract {
    function creditInsurees(string calldata flightCode) external pure virtual;
    function registerAirline(address account, string calldata airlineName) external virtual;
    function updateFlightStatus(uint8 statusCode, bytes32 flightKey) public virtual;
    function pay(uint256 amount, address passengerAddress) public virtual;
    function buy(string calldata flight, address passenderAddress, uint256 creditAmount) external payable virtual;
    function fund(address addressOfAirline, string calldata airlineName) external payable virtual;
    function isOperational() view public virtual returns (bool);
    function voteForAirline(address voterAddress, string  calldata airlineName, uint8 votingMajorityPercent) external  virtual;
    function isRegisteredAirline(address address1) public view virtual returns (bool);
    function isFundedAirline(address address1) public view virtual returns (bool);
    function isRegisteredAirlineName(string memory address1) public view virtual returns (bool);
    function isPendingRegistrationAirline(address airlineAddress) public view virtual returns (bool);
    function isPendingRegistrationAirlineName(string  memory airlineAddress) public view virtual returns (bool);
    function hasAlreadyVotedFor(address voter, string memory votingForAirlineName) public view virtual returns (bool);
    function isBought(string calldata flight) external view virtual returns (address, uint256);
    function getCreditFor(address userAddress) external view virtual returns (uint256 result);
}
