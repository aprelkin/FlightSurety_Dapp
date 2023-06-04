
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {

  var config;
  before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address);
  });

  /****************************************************************************************/
  /* Operations and Settings                                                              */
  /****************************************************************************************/

  it(`(multiparty) has correct initial isOperational() value`, async function () {

    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    assert.equal(status, true, "Incorrect initial operating status value");

  });


    it(`Only existing airline may register a new airline until there are at least four airlines registered`, async function() {

        const valueInEther = web3.utils.toWei('10', 'ether');
        console.log(config.airline1);
        await config.flightSuretyApp.addFundsAirline(config.airline1Name,{from: config.firstAirline, value: valueInEther, gas: 5000000});
        //await config.flightSuretyApp.registerAirline(config.airline1Name, config.airline1,{from: config.firstAirline});
        await config.flightSuretyApp.registerAirline(config.airline2Name, config.airline2,{from: config.firstAirline});
        await config.flightSuretyApp.registerAirline(config.airline3Name, config.airline3,{from: config.firstAirline});
        await config.flightSuretyApp.registerAirline(config.airline4Name, config.airline4,{from: config.firstAirline});

        // registration of the 5th airline should not be possible
        await config.flightSuretyApp.registerAirline(config.airline5Name, config.airline5,{from: config.firstAirline});


        assert.equal(await config.flightSuretyData.isRegisteredAirlineName(config.airline1Name),true)
        assert.equal(await config.flightSuretyData.isRegisteredAirlineName(config.airline2Name),true)
        assert.equal(await config.flightSuretyData.isRegisteredAirlineName(config.airline3Name),true)
        assert.equal(await config.flightSuretyData.isRegisteredAirlineName(config.airline4Name),true)

        assert.equal(await config.flightSuretyData.isRegisteredAirlineName(config.airline5Name),false)

    });

    it(`Registration of fifth and subsequent airlines requires multi-party consensus of 50% of registered airlines`, async  function() {


        assert.equal(await config.flightSuretyData.isRegisteredAirlineName(config.airline1Name),true)
        assert.equal(await config.flightSuretyData.isRegisteredAirlineName(config.airline2Name),true)
        assert.equal(await config.flightSuretyData.isRegisteredAirlineName(config.airline3Name),true)
        assert.equal(await config.flightSuretyData.isRegisteredAirlineName(config.airline4Name),true)

        assert.equal(await config.flightSuretyData.isRegisteredAirlineName(config.airline5Name),false)
        assert.equal(await config.flightSuretyData.isPendingRegistrationAirlineName(config.airline5Name),true)

//        await config.flightSuretyApp.voteForAirline(config.airline5Name,{from: config.airline2}); // airlines 1 and 2 voted for airline 5.
        const valueInEther = web3.utils.toWei('10', 'ether');
        await config.flightSuretyApp.addFundsAirline(config.airline2Name,{from: config.airline2, value: valueInEther, gas: 5000000});
        await config.flightSuretyApp.voteForAirline( config.airline5Name,{from: config.airline2});

        assert.equal(await config.flightSuretyData.isRegisteredAirlineName(config.airline5Name),true)
        assert.equal(await config.flightSuretyData.isFundedAirline(config.airline5),false)

     //   assert.equal(true, false);
    });

    it(`Airline can be registered, but does not participate in contract until it submits funding of 10 ether (make sure it is not 10 wei)`, async  function() {
        await config.flightSuretyApp.registerAirline(config.airline6Name, config.airline6,{from: config.airline2});
        // airline 6 is pending registration. There are currently 1,2,3,4 and 5 are registered.
        // 1 and 2 are funded. Airline 3 is not funded. So, it can note vote.
        // 3 votes of funded airlines are required to register airline 6.
        try {
            await config.flightSuretyApp.voteForAirline(config.airline6Name, {from: config.airline3});
            assert.equal(true, false);
        } catch (e) {
            assert.equal(true, true);
        }
        const valueInEther = web3.utils.toWei('10', 'ether');
        await config.flightSuretyApp.addFundsAirline(config.airline3Name,{from: config.airline3, value: valueInEther, gas: 5000000});

        try {
            await config.flightSuretyApp.voteForAirline(config.airline6Name, {from: config.airline3});
            assert.equal(true , true);
        } catch (e) {
            assert.equal(true, false);
        }

    });




  it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
      let accessDenied = false;
      try 
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
  });

  it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
      let accessDenied = false;
      try
      {
          await config.flightSuretyData.setOperatingStatus(false, { from: config.owner });
      }
      catch(e) {
          accessDenied = true;
      }
      assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
      
  });

  it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

      await config.flightSuretyData.setOperatingStatus(false, { from: config.owner });

      let reverted = false;

      // Set it back for other tests to work
  //    await config.flightSuretyData.setOperatingStatus(true);


      try
      {
          await config.flightSuretyData.testFunction({ from: config.firstAirline });
      }
      catch(e) {
          reverted = true;
      }
      assert.equal(reverted, true, "Access not blocked for requireIsOperational");

      // Set it back for other tests to work
      reverted = false;
      try {
          await config.flightSuretyData.setOperatingStatus(true);
      }catch(e) {
          reverted = true;
      }
      assert.equal(reverted, false, "Reset operational status failed");

  });

  it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {
    
    // ARRANGE
    let newAirline = accounts[7]; // airline 7 , which is not registered

      assert.equal( await config.flightSuretyData.isFundedAirline( config.airline5), false);


    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.airline5}); // airline 5 which is not funded
    }
    catch(e) {

    }
    let result = await config.flightSuretyData.isRegisteredAirline.call(newAirline);

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

  });
 

});
