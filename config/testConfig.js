
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [


        "0x27D8D15CbC94527cAdf5eC14B69519aE23288B95",
        "0x018C2daBef4904ECbd7118350A0c54DbeaE3549A",
        "0xCe5144391B4aB80668965F2Cc4f2CC102380Ef0A",
        "0x460c31107DD048e34971E57DA2F99f659Add4f02",
        "0xD37b7B8C62BE2fdDe8dAa9816483AeBDBd356088",
        "0x27f184bdc0E7A931b507ddD689D76Dba10514BCb",
        "0xFe0df793060c49Edca5AC9C104dD8e3375349978",
        "0xBd58a85C96cc6727859d853086fE8560BC137632",
        "0xe07b5Ee5f738B2F87f88B99Aac9c64ff1e0c7917",
        "0xBd3Ff2E3adEd055244d66544c9c059Fa0851Da44",
        "0xEF40e53cB249a5eFc159D5aFd88bb02E2B7e8F39",
        "0xCAd45f0cf1985E943098953D395d9712a656ab03",
        "0xE09D28457b841701210020aa30EB3F46689Cb271",
        "0xCdC1B730A7EB4Fa3A64999F3063821Aa5e2e8387",
        "0xA3584fAbb2Fc5983dc39d2B56060DBB0635d47C1",
        "0xEf7e24f6ff53CB0Bd06F6Fb21BE403c90CdD1ed7",
        "0x4607636Caf072d12CFe94b782186AaC7867b4DF5",
        "0x2897cFcAE9eD64B3bd1de3f58d377DC6d67D2d59",
        "0x93F37B308E13EF9507e9eF79685B16290A5a48f5",
        "0x11e28Ad71875bF788eA9B845B63192FC9754BF3a",
        "0xaFDD6c9449d9Cb80F7Bd763E0f0C392571CcD2e3",
        "0xb183705eE6Ec61527fda3160ff2535d3D44cE128",
        "0x4fC7bF995e89e49e8B0671808f0EC38Cc6df9D13",
        "0x9706c7a4f3A3EB0A1F283ce78E07951AA44AE9cA",
        "0x2753E353f152E44A2F67931ECCc10F556e75E377",
        "0x47b3724De8b41C8bD7e29B0B4301068C70220ea8",
        "0x5613C61E2A8bC0dc7eD00573c96b77794fEF193b",
        "0x957533ee2c478183D3cb21615634bb4271f1E1eb",
        "0x8ACdc91CE4C4FCD9C2eD856f535A1d3243b6AE1f",
        "0xb26d4BD9322Acd67FB9AE035D9109f20C6De362d"

    ];


    let owner = accounts[0];
    let firstAirline = accounts[1];

    let flightSuretyData = await FlightSuretyData.new(accounts[1]);
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);

    let airline1 = accounts[1];
    let airline1Name = "AIR1";
    let airline2 = accounts[2];
    let airline2Name = "AIR2";
    let airline3 = accounts[3];
    let airline3Name = "AIR3";
    let airline4 = accounts[4];
    let airline4Name = "AIR4";
    let airline5 = accounts[5];
    let airline5Name = "AIR5";
    let airline6 = accounts[6];
    let airline6Name = "AIR6";
    
    return {
        owner: owner,
        firstAirline: firstAirline,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp,
         airline1 : airline1,
         airline1Name : airline1Name,
         airline2 : airline2,
        airline2Name : airline2Name,
        airline3 : airline3,
         airline3Name : airline3Name,
         airline4 : airline4,
        airline4Name : airline4Name,
        airline5 : airline5,
        airline5Name :airline5Name,
        airline6 : airline6,
        airline6Name :airline6Name
    }
}

module.exports = {
    Config: Config
};