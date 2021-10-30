/* eslint-disable no-console */
require('dotenv').config();

const { Robinhood } = require('../src');
const client = new Robinhood();

// pass username, password, and trade function
client.init({
	robinhood: {
		username: process.env.RH_USERNAME,
		password: process.env.RH_PASSWORD,
    device_token: process.env.RH_DEVICE_TOKEN
	},
	alphaVantage: process.env.ALPHA_VANTAGE,
	newsAPI: process.env.NEWS_API
}, (error) => {
	// Main trading function

	// Don't forget to handle any initialization errors
	if (error) {
		console.log(error);
		return;
	}

	// Adds an algorithm to run later
	//
	// These algorithms should be designed to take data from ONE
	// source, aka AAPL or GE, and not try to balance multiple.

  client.addAlgorithm('algoOne', emaAlgorithm);

  // Execute a saved algorithm
  // client.execute returns a Promise
  client.execute({
  	name: 'algoOne',
  	symbol: 'AAPL',
  	max_usd: '134.32',
  	dependencies: { 
  		intraday: {
  			
  		}
  	},
  }).catch((err) => {
    console.log(err);
  });

  
});

// An algorithm that will take in data based on a particular signal
// This algorithm is meant to be run once, straight throw. Multiple executions
// should be defined in the main trading method.
function emaAlgorithm(buy, sell, data) {

	var ema_40 = data.ema.daily(40);		// current EMA over 15 day period
	var ema_120 = data.ema.daily(120);	// current EMA over 60 day period

	// write algorithm inside this if statement, which is false when 
	// the algorithm isn't being checked for dependencies but is being 
	// delivered necessary functions

	if (ema_40 < ema_120) sell();
	else buy();
}