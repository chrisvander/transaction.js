/* eslint-disable no-console */
require('dotenv').config();

const Robinhood = require('../src');
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

  client.addAlgorithm('ema', emaAlgorithm);

  client.execute('ema');

  console.log(client);
	}

// An algorithm that will take in data and reply with buy or sell signals
function emaAlgorithm() {
	console.log("started")


}