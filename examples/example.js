/* eslint-disable no-console */
require('dotenv').config();

const { Robinhood } = require('../src');
const client = new Robinhood();

// pass username, password, and trade function
client.init({
	robinhood: {
		username: process.env.RH_USERNAME,
		password: process.env.RH_PASSWORD
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
	//
	// Algorithms will automatically be wrapped with data getters
	// Before the algorithm runs, it will fetch the data necessary
	// using getters in a dataset. Because of the way dependencies
	// are grabbed, and to keep down the amount of requests being made
	// to Alpha Vantage and other APIs, the data for each should be
	// grabbed at the beginning and not live in the function.

  client.addAlgorithm('algoOne', emaAlgorithm);

  // Execute a saved algorithm
  // client.execute returns a Promise
  client.execute({
  	name: 'algoOne',
  	symbol: 'AAPL',
  	max_usd: '134.32', // maximum amount of capital in your account the
  										 // algorithm will be allowed utilize
  }).catch((err) => {
    console.log(err);
  }).then(() => {
  	client.logout();
  });

  
});

// An algorithm that will take in data based on a particular signal
// This algorithm is meant to be run once, straight throw. Multiple executions
// should be defined in the main trading method.
function emaAlgorithm(buy, sell, data, is_check) {

	var ema_40 = data.ema.daily(40);		// current EMA over 15 day period
	var ema_120 = data.ema.daily(120);	// current EMA over 60 day period

	// write algorithm inside this if statement, which is false when 
	// the algorithm isn't being checked for dependencies but is being 
	// delivered necessary functions

	if (!is_check) {
		if (ema_40 < ema_120) sell();
		else buy();
	}
}