pragma solidity >=0.6.2;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../node_modules/openzeppelin-solidity/contracts/utils/Strings.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    mapping(address => uint256) private creditAmountsForUsers;
    mapping(address => uint256) private debitAmountForUsers;
    mapping(string => PurchasedInsuranceForFlight[]) private allInsurancesForFlight;
    uint256 totalFunds;

    mapping(string => Airline) private nameToRegisteredAirlineMapping;
    mapping(address => Airline) private addressToRegisteredAirlineMapping;
    mapping(address => PendingRegistrationAirline) private addressToPendingRegisteredAirlineMapping;
    mapping(string => PendingRegistrationAirline) private nameToPendingRegistration;
    Airline[] registeredAirlines;
    Airline[] fundedContractAirlines;

    function authorizeCaller
    (
        address contractAddress
    )
    external
    requireContractOwner
    {
        authorizedContracts[contractAddress] = 1;
    }

    function isAuthorized
    (
        address contractAddress
    )
    external
    view
    returns (bool)
    {
        return (authorizedContracts[contractAddress] == 1);
    }

    function getBalance() external view returns (uint256 balance) {
        return address(this).balance;
    }

    function getCreditFor(address userAddress) external view returns (uint256 result){
        return creditAmountsForUsers[userAddress];
    }

    function deauthorizeCaller
    (
        address contractAddress
    )
    external
    requireContractOwner
    {
        delete authorizedContracts[contractAddress];
    }

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/
    struct Flight {
        string flightNumber;
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;
        address payable airline;
    }

    struct PurchasedInsuranceForFlight {
        address user;
        uint256 price;
        bool credited;
        uint256 creditAmount;
    }

    struct Airline {
        address wallet;
        string name;
        bool isFunded;
    }

    struct PendingRegistrationAirline {
        Airline base;
        uint256 votes;
        mapping(address => bool) votedBy;
    }


    address private contractOwner;                                      // Account used to deploy contract
    bool private operational = true;                                    // Blocks all state changes throughout the contract if false
    mapping(address => uint256) private authorizedContracts;
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
    (
        address firstAirlineAddress
    )
    public
    {
        contractOwner = msg.sender;
        operational = true;
        authorizedContracts[msg.sender] = 1;
        Airline storage firstAirline = nameToRegisteredAirlineMapping["AIR1"];
        firstAirline.wallet = firstAirlineAddress;
        firstAirline.name = "AIR1";
        firstAirline.isFunded = false;

        addressToRegisteredAirlineMapping[firstAirlineAddress] = firstAirline;

        registeredAirlines.push(firstAirline);
    }

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
        require(operational, "Contract is currently not operational");
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
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */
    function isOperational()
    public
    view
    returns (bool)
    {
        return operational;
    }



    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */
    function setOperatingStatus
    (
        bool mode
    )
    external
    requireContractOwner
    {
        operational = mode;
    }

    //    modifier  requireUniqueName(string name) {
    //        require(bytes(nameToRegisteredAirlineMapping[name]).length == 0);
    //        _;
    //    }
    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

    function isRegisteredAirline(address airlineAddress) public view returns (bool)  {
        return addressToRegisteredAirlineMapping[airlineAddress].wallet != address(0x0);
    }

    function isFundedAirline(address address1) public view virtual returns (bool) {
        return addressToRegisteredAirlineMapping[address1].isFunded == true;
    }

    function isRegisteredAirlineName(string  memory airlineName) public view returns (bool)  {
        return nameToRegisteredAirlineMapping[airlineName].wallet != address(0x0);
    }

    function isPendingRegistrationAirline(address address1) public view returns (bool) {
        return addressToPendingRegisteredAirlineMapping[address1].base.wallet != address(0x0);
    }

    function isPendingRegistrationAirlineName(string  memory address1) public view returns (bool) {
        return nameToPendingRegistration[address1].base.wallet != address(0x0);
    }

    function isFundedAirlineName(string memory airlineName) public view returns (bool) {

        return nameToRegisteredAirlineMapping[airlineName].wallet != address(0x0) && nameToRegisteredAirlineMapping[airlineName].isFunded == true;
    }

    function addressToString(address _addr) public pure returns (string memory)
    {
        bytes32 value = bytes32(uint256(uint160(_addr)));
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(51);
        str[0] = '0';
        str[1] = 'x';
        for (uint256 i = 0; i < 20; i++) {
            str[2 + i * 2] = alphabet[uint8(value[i + 12] >> 4)];
            str[3 + i * 2] = alphabet[uint8(value[i + 12] & 0x0f)];
        }
        return string(str);
    }

    /**
     * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function registerAirline
    (
    //   address voter,
        address account, string calldata airlineName
    )
    external

    {
        // require(nameToRegisteredAirlineMapping[airlineName].wallet == address(0x0));
        if (registeredAirlines.length < 4) {
            Airline storage airline = nameToRegisteredAirlineMapping[airlineName];
            airline.wallet = account;
            airline.name = airlineName;
            airline.isFunded = false;
            registeredAirlines.push(airline);

            addressToRegisteredAirlineMapping[account] = airline;
        } else {
            require(nameToPendingRegistration[airlineName].base.wallet == address(0x0));

            PendingRegistrationAirline storage newValue = nameToPendingRegistration[airlineName];

            newValue.base = Airline(account, airlineName, false);
            newValue.votes = 1;
            nameToPendingRegistration[airlineName] = newValue;
        }
    }

    function voteForAirline
    (
        address voter,
        string  calldata airlineName, uint8 votingMajorityPercent
    )
    external

    {
        PendingRegistrationAirline storage p = nameToPendingRegistration[airlineName];
        p.votedBy[voter] = true;
        nameToPendingRegistration[airlineName].votes += 1;
        if (nameToPendingRegistration[airlineName].votes.mul(100).div(registeredAirlines.length) >= votingMajorityPercent) {
            address addrOfAirline = p.base.wallet;
            delete nameToPendingRegistration[airlineName];

            //registeredAirlines.push(Airline( p.base.wallet,airlineName, false));
            Airline storage registeredAirline = addressToRegisteredAirlineMapping[addrOfAirline];
            registeredAirline.wallet = addrOfAirline;
            registeredAirline.name = airlineName;
            registeredAirline.isFunded = false;

            addressToRegisteredAirlineMapping[addrOfAirline] = registeredAirline;
            nameToRegisteredAirlineMapping[airlineName] = registeredAirline;
        }
    }


    /**
     * @dev Buy insurance for a flight
    *
    */
    function buy(string calldata flight, address passenderAddress, uint256 creditAmount)
    external
    payable
    {
        allInsurancesForFlight[flight].push(PurchasedInsuranceForFlight(passenderAddress, msg.value, false, creditAmount));

        uint256 old = creditAmountsForUsers[passenderAddress];
        creditAmountsForUsers[passenderAddress] = old.add(creditAmount);
        totalFunds = totalFunds.add(msg.value);
    }

    function isBought(string calldata flight) external view returns (address addr, uint256 creditAmount) {
        return (allInsurancesForFlight[flight][0].user, allInsurancesForFlight[flight][0].creditAmount);
    }

    function hasAlreadyVotedFor(address voter, string memory votingForAirlineName) public view returns (bool) {
        return nameToPendingRegistration[votingForAirlineName].votedBy[voter] == true;
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
    (
        string calldata flight
    )
    external
    payable
    {
        uint counter = allInsurancesForFlight[flight].length;

        for (uint i = 0; i < counter; i++) {
            address passengerAddress = allInsurancesForFlight[flight][i].user;
            uint256 creditAmount = allInsurancesForFlight[flight][i].creditAmount;
            allInsurancesForFlight[flight][i].credited = true;

            uint256 oldCreditAmouont = creditAmountsForUsers[passengerAddress];

            uint256 newResult = oldCreditAmouont.add(creditAmount);
            creditAmountsForUsers[passengerAddress] = newResult;

        }
    }

    /**
     *  @dev Transfers eligible payout funds to insuree. Users pay themselves. Withdraw funds
     *
    */
    function pay
    (
        uint256 amount, address payable passengerAddress
    )
    external
    payable
    {
        uint256 amountToWithdraw = amount;
        uint256 credit = creditAmountsForUsers[passengerAddress];
        require(totalFunds > amountToWithdraw, "The contract does not have enough funds to pay the credit");
        creditAmountsForUsers[passengerAddress] = credit.sub(amountToWithdraw);
        totalFunds = totalFunds.sub(amountToWithdraw);
        passengerAddress.transfer(amountToWithdraw);
    }

    /**
     * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */
    function fund
    (
        address addressOfAirline, string memory airlineName
    )
    public
    payable
    {
        addressToRegisteredAirlineMapping[addressOfAirline].isFunded = true;
        nameToRegisteredAirlineMapping[airlineName].isFunded = true;
        totalFunds = totalFunds.add(msg.value);

    }

    function updateFlightStatus(uint8 statusCode, bytes32 flightKey) public {

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
}