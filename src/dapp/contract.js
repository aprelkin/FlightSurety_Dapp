import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from '../server/config.json';
import Web3 from 'web3';

export default class Contract {
    constructor(network, callback) {

        this.config = Config[network];
        //this.config
        this.web3 = new Web3(window.ethereum);
        //  this.web3 = new Web3(new Web3.providers.HttpProvider(config.url));
        this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, this.config.appAddress);
        this.flightSuretyData = new this.web3.eth.Contract(FlightSuretyData.abi, this.config.dataAddress);
        this.initialize(callback)
            .then(
                result => {
                    console.log(result);
                },
                error => {
                    console.log(error);
                }
            )
        this.owner = "0x27D8D15CbC94527cAdf5eC14B69519aE23288B95";
        this.accounts = [
            "0x018C2daBef4904ECbd7118350A0c54DbeaE3549A",
            "0xCe5144391B4aB80668965F2Cc4f2CC102380Ef0A",
            "0x460c31107DD048e34971E57DA2F99f659Add4f02",
            "0xD37b7B8C62BE2fdDe8dAa9816483AeBDBd356088",
            "0x27f184bdc0E7A931b507ddD689D76Dba10514BCb"]

    }


    async initialize(callback) {
        if (window.ethereum) {
            try {
                this.web3 = new Web3(window.ethereum);
                // Request account access
                await window.ethereum.enable();
            } catch (error) {
                // User denied account access...
                console.error("User denied account access")
            }
        }
        if (typeof this.web3 == "undefined") {

            //.web3 = new Web3(new Web3.providers.WebsocketProvider("ws://localhost:8545"));
            this.web3 = new Web3(new Web3.providers.HttpProvider("http://127.0.0.1:8545"));
            console.log("local ganache provider");
        }

        callback();
    }

    async getMyAccount() {
        let accounts = await this.web3.eth.getAccounts();
        return accounts[0];
    }

    async registerAirline(airline, airlineAddr, callback) {
        let self = this;
        let myAccount = await this.getMyAccount();
        await self.flightSuretyApp.methods
            .registerAirline(airline, airlineAddr)
            .send({
                from: myAccount,
                "gas": 3721974,
                "gasPrice": 50000000000
            });
    }

    async getBalance() {
        let balance = await window.ethereum.request({
            method: "eth_getBalance",
            params: [this.config.dataAddress]
        }).catch((err) => console.log(err));
        return balance;
    }

    async fundAirline(airline, airlineAddr, callback) {
        let self = this;
        let fundsInWei = this.web3.utils.toWei("10", "ether");
        let myAccount = await this.getMyAccount();
        await self.flightSuretyApp.methods
            .addFundsAirline(airline)
            .send({
                from: myAccount, value: fundsInWei,
                "gas": 4712388,
                "gasPrice": 100000000000
            }, (error, result) => {
            });

    }


    async isBought(flight, callback) {
        let self = this;
        let result = await self.flightSuretyApp.methods.isBought(flight).call(callback);
        return result;
    }

    async isOperational(callback) {

        let self = this;
        await self.flightSuretyApp.methods
            .isOperational()
            .call({from: self.owner}, callback);
    }

    async fetchFlightStatus(flight, airline, callback) {
        let self = this;
        let account = await this.getMyAccount();
        let payload = {
            airline: airline,
            flight: flight,
            timestamp: Math.floor(Date.now() / 1000)
        }
        await self.flightSuretyApp.methods
            .fetchFlightStatus(payload.airline, payload.flight, payload.timestamp)
            .send({from: account}, (error, result) => {
                callback(error, payload);
            });
    }


    async getMyCredit(callback) {

        let self = this;
        let myAccount = await this.getMyAccount();
        let balance = await self.flightSuretyApp.methods
            .getUserCredit()
            .call({from: myAccount});
        balance = parseInt(balance);
        return balance;
    }

    async oracleReport(callback) {
        let self = this;
        await self.flightSuretyApp.events.FlightStatusInfo({}, function (error, event) {
            if (error) {
                console.log(error);
            } else {
                console.log(event.returnValues);
            }
        })
    }

    async getPassengerCredits(passenger, callback) {
        let self = this;

        self.flightSuretyApp.methods
            .getPassengerCredits(passenger)
            .call({from: passenger}, (error, result) => {
                if (error) {
                    console.log(error);
                } else {
                    console.log(result);
                    callback(result);
                }
            });
    }

    async flightStatusInfo(callback) {
        let self = this;

        await self.flightSuretyApp.events.FlightStatusInfo({}, function (error, event) {
            if (error) {
                console.log(error);
            } else {
                callback(event.returnValues);
            }
        })
    }

    async withdraw(value) {
        let priceInWei = await this.web3.utils.toWei(value.toString(), "ether");
        let account = await this.getMyAccount();
        await this.flightSuretyApp.methods.withdraw(priceInWei).send({
            from: account, "gas": 4712388,
            "gasPrice": 100000000000
        }, (error, result) => {
        });
    }


    async buyInsurance(flight, priceInEther, airlineAddress, callback) {
        let self = this;
        let priceInWei = this.web3.utils.toWei(priceInEther.toString(), "ether");
        let myAccount = await this.getMyAccount();
        let payload = {
            flight: flight,
            price: priceInWei,
            passenger: self.accounts[6]
        }
        await self.flightSuretyApp.methods
            .buy(flight, airlineAddress)
            .send({
                from: myAccount, value: priceInWei,
                "gas": 4712388,
                "gasPrice": 100000000000
            }, (error, result) => {
                callback(error, payload);
            });
        await this.isBought(flight);
    }
}