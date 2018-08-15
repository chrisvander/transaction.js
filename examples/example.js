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
	alpha_vantage: process.env.ALPHA_VANTAGE,
	news_api: process.env.NEWS_API
}, (error) => {
	if (error) {
		console.log(error);
		return;
	}

	console.log('Ready to trade!');

	// Adds an algorithm to run later
	//
	// These algorithms should be designed to take data from ONE
	// source, aka AAPL or BTC, and not try to balance multiple.
	//
	// Algorithms will automatically be wrapped with data getters
	// Before the algorithm runs, it will fetch the data necessary
	//
	// Validate algorithm before running by doing a "dry" run of provided 
	// functions - those that need data requested will be added to 
	// the dependencies for the algorithm automatically	

  client.addAlgorithm('algoOne', emaAlgorithm);

  // client.execute returns a Promise

  // Execute a saved algorithm
  client.execute({
  	name: 'algoOne',
  	symbol: 'AAPL',
  	max_usd: '134.32',
  	dry: true
  });

  client.logout();
});

// An algorithm that will take in data based on a particular signal
function emaAlgorithm(buy, sell, data) {
	console.log("  ")
	console.log(data.price);
	console.log(data.sma.daily(50));
	console.log(data.sma.daily(200));
}