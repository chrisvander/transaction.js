/* eslint-disable no-console */
require('dotenv').config();

const { Robinhood } = require('../src');
const client = new Robinhood();

// pass username, password, and trade function
client.init({
	username: process.env.RH_USERNAME,
	password: process.env.RH_PASSWORD,
}, trade);

// Callback where all trading happens
function trade(error) {
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
	// Any algorithm function should return a Promise

  client.addAlgorithm('ema', emaAlgorithm);

  // Execute a saved algorithm
  client.execute({
  	name: 'ema',
  	symbol: 'BTC',
  	max_usd: '134.32'
  });

  // or execute one in command by omitting 'name' from options
  client.execute({
  	symbol: 'BTC',
  	max_usd: '134.32'
  }, emaAlgorithm);
}

// An algorithm that will take in data and reply with performance data or 
function emaAlgorithm(buy,sell) {
	console.log("started");


}