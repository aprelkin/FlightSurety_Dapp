import Web3 from "web3";
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';

var web3Provider;

(async() => {
    let web3;

    let contract = new Contract('localhost', () => {

        let airlines = contract.airlines;
        // Read transaction
        contract.isOperational((error, result) => {
            console.log(error,result);
            display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: error, value: result} ]);
        });


        DOM.elid('register-airline-name').addEventListener('change',  async() => {
            let airlineName = document.getElementById('register-airline-name').value;

            if (airlineName === "AIR2") {
                document.getElementById('register-airline-address').value = "0xCe5144391B4aB80668965F2Cc4f2CC102380Ef0A";
            } else if (airlineName === "AIR3") {
                document.getElementById('register-airline-address').value = "0x460c31107DD048e34971E57DA2F99f659Add4f02";
            } else if (airlineName === "AIR4") {
                document.getElementById('register-airline-address').value ="0xD37b7B8C62BE2fdDe8dAa9816483AeBDBd356088";
            }

        });

        DOM.elid('flight-number-info-get').addEventListener('change',  async() => {
            let flightNumber = document.getElementById('flight-number-info-get').value;

            if (flightNumber === "LH123") {
                document.getElementById('airline-info-address').value = "0x018C2daBef4904ECbd7118350A0c54DbeaE3549A"
                document.getElementById('airline-info').value = "AIR1"
            } else if (flightNumber === "UA456") {
                document.getElementById('airline-info-address').value = "0xCe5144391B4aB80668965F2Cc4f2CC102380Ef0A";
                document.getElementById('airline-info').value = "AIR2"
            } else if (flightNumber === "MV789") {
                document.getElementById('airline-info-address').value = "0x460c31107DD048e34971E57DA2F99f659Add4f02";
                document.getElementById('airline-info').value = "AIR3"
            } else if (flightNumber === "JK012") {
                document.getElementById('airline-info-address').value ="0xD37b7B8C62BE2fdDe8dAa9816483AeBDBd356088";
                document.getElementById('airline-info-address').value = "AIR4";
            }
        });

        DOM.elid('fund-airline').addEventListener('click',  async() => {
            let fundAirlineName = document.getElementById('fund-airline-name').value;
            let airlineAddress;
            if (fundAirlineName === "AIR1") {
                airlineAddress ="0x018C2daBef4904ECbd7118350A0c54DbeaE3549A";
            } else if (fundAirlineName === "AIR2") {
                 airlineAddress = "0xCe5144391B4aB80668965F2Cc4f2CC102380Ef0A";
            } else if (fundAirlineName === "AIR3") {
                airlineAddress = "0x460c31107DD048e34971E57DA2F99f659Add4f02";
            } else if (fundAirlineName === "AIR4") {
                airlineAddress ="0xD37b7B8C62BE2fdDe8dAa9816483AeBDBd356088";
            }

            await contract.fundAirline(fundAirlineName, airlineAddress );

            let balance = await contract.getBalance()
            balance = parseInt(balance);
            balance = balance / Math.pow(10,18);
        });

        DOM.elid('register-airline-btn').addEventListener('click',  async() => {
            let airlineAddress = document.getElementById('register-airline-address').value;
            let airlineName = document.getElementById('register-airline-name').value;
            await contract.registerAirline(airlineName, airlineAddress);
        });

        DOM.elid('buy-flight-name').addEventListener('change', () => {

            let flight = DOM.elid('buy-flight-name').value;
            if (flight === "LH123") {
                document.getElementById("buy-airline-name").value = "AIR1"
                document.getElementById("buy-airline-address").value = airlines[0];
            } else if (flight === "UA456"){
                document.getElementById("buy-airline-name").value = "AIR2"
                document.getElementById("buy-airline-address").value = airlines[1];
            } else if (flight === "MV789"){
                document.getElementById("buy-airline-name").value = "AIR3"
                document.getElementById("buy-airline-address").value = airlines[2];
            } else if (flight === "JK012"){
                document.getElementById("buy-airline-name").value = "AIR4"
                document.getElementById("buy-airline-address").value = airlines[3];
            }
        });

        // User-submitted transaction
        DOM.elid('submit-oracle').addEventListener('click', () => {

            let flight = document.getElementById('flight-number-info-get').value;
            let airline = document.getElementById('airline-info-address').value;
            contract.fetchFlightStatus( flight, airline,  (error, result) => {
         //       display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp } ]);
            });
        })

        DOM.elid('buy-insurance-btn').addEventListener('click', () => {
            let flight = DOM.elid('buy-flight-name').value;
            let value =  DOM.elid('buy-insurance-amount').value
            let airlineAddress = document.getElementById("buy-airline-address").value;
            // Write transaction
             contract.buyInsurance(flight, value, airlineAddress,(error, result) => {
             //   display('Oracles', 'Trigger oracles', [ { label: 'Fetch Flight Status', error: error, value: result.flight + ' ' + result.timestamp} ]);
            });
        })

        DOM.elid('get-balance-btn').addEventListener('click', async() => {
            let flight = DOM.elid('buy-flight-name').value;
            let message =await contract.isBought(flight);
            console.log("credit amount "+message.creditAmount);
            await contract.oracleReport();
            let balanceOfCustomer = await contract.getMyCredit();
            document.getElementById("balance").value =  parseInt(balanceOfCustomer)  / Math.pow(10,18);
        });


        DOM.elid('withdraw-balance-btn').addEventListener('click', async() => {
            let balanceToWithdraw = document.getElementById("balance").value;
            await contract.withdraw(balanceToWithdraw)
            await contract.oracleReport();

            let balanceOfCustomer = await contract.getMyCredit();
            document.getElementById("balance").value =  parseInt(balanceOfCustomer)  / Math.pow(10,18);
        });
    });

})();


function display(title, description, results) {
    let displayDiv = DOM.elid("display-wrapper");
    let section = DOM.section();
    section.appendChild(DOM.h2(title));
    section.appendChild(DOM.h5(description));
    results.map((result) => {
        let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-sm-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-sm-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    })
    displayDiv.append(section);

}