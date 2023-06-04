
import Config from "./config.json";
import FlightSuretyApp from "../../build/contracts/FlightSuretyApp.json";

import Web3 from 'web3';
import express from 'express';


const initialize = async () =>  {
    let oraclesIndexList = [];

    let config = Config['localhost'];
    let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
    web3.eth.defaultAccount = await web3.eth.accounts[0];
    console.log("Defaultaccount" + web3.eth.defaultAccount);
    let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);


    let accounts = await  web3.eth.getAccounts();

    let oracleRegistrationFee = await flightSuretyApp.methods.REGISTRATION_FEE().call();
    console.log(oracleRegistrationFee);
    let oracleAccounts = [];
    for (let a = 10; a < 30; a++) {
        console.log("oracle accounts " + accounts[a]);
        oracleAccounts.push(accounts[a]);
        flightSuretyApp.methods.registerOracle().send({
            "from": accounts[a],
            "value": oracleRegistrationFee,
            "gas": 5000000,
            "gasPrice": 20000000
        }).then(() => {
            // get indexes and save in a list
            flightSuretyApp.methods.getMyIndexes().call({
                "from": accounts[a]
            }).then(result => {
                console.log(`Oracle ${a} Registered at ${accounts[a]} with [${result}] indexes.`);
                // for each oracle save its indexes into the list
                oraclesIndexList.push(result);

            }).catch(err => {
            });
        }).catch(err => {
        });
    }



    const subscription = flightSuretyApp.events.OracleRequest();
    subscription.on("data", function (request) {
        console.log(request);

        let index = request.returnValues.index;
        console.log(`Triggered index: ${index}`);
        let idx = 0;
        oraclesIndexList.forEach((indexes) => {
            let oracle = oracleAccounts[idx];
            if (indexes[0] === index || indexes[1] === index || indexes[2] === index) {
                console.log(`Oracle: ${oracle} triggered. Indexes: ${indexes}.`);

                let randomStatus = 10 * (1 + Math.floor(Math.random() * 5)); // FOR TEST PURPOSES THIS IS NOT USED
                let testPurposeProblemIsAirlineIsLate = 20; // INSTEAD THIS ONE IS USED FOR TEST PURPOSES
                flightSuretyApp.methods
                    .submitOracleResponse(index, request.returnValues.airline, request.returnValues.flight, request.returnValues.timestamp, testPurposeProblemIsAirlineIsLate)
                    .send({
                        from: oracle,
                        gas: 500000,
                        gasPrice: 20000000
                    }, (error, result) => {
                        if (error) {
                            console.log(error);
                        }
                    });

            }
            idx++;
        });
    });

};

initialize().then(
    result => {
         console.log(result);
    },
    error => {
        console.log(error);
    }
)


const app = express();
//app.listen(3000);
app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

export default app;