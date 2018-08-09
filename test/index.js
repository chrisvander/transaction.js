import { assert } from 'chai';
import robinhood from '../src';
const client = new robinhood();
require('dotenv').config();

describe('Login to Robinhood', function() {
  it('should test init function', function(done) {
    client.init({
			username: process.env.RH_USERNAME,
			password: process.env.RH_PASSWORD,
		}, () => {
			assert(client.user, 'User does not exist');
			assert(client.portfolio, 'Portfolio does not exist');
			assert(client.positions, 'Positions does not exist');
			done();
		});
  });

  it('should get instrument data from server', function(done) {
  	client.get('https://api.robinhood.com/instruments/39ff611b-84e7-425b-bfb8-6fe2a983fcf3/', (res) => {
  		assert(res, 'Response is null');
  		done();
  	}, () => {
  		assert(false, 'Request did not complete.');
  		done();
  	})
  })
});
