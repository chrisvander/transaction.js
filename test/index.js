import { assert } from 'chai';
import { Robinhood } from '../src';
const client = new Robinhood();
require('dotenv').config();

describe('Login to Robinhood', function() {
  it('should test init function', function(done) {
    client.init({
      robinhood: {
        username: process.env.RH_USERNAME,
        password: process.env.RH_PASSWORD,
        device_token: process.env.RH_DEVICE_TOKEN
      },
      alphaVantage: process.env.ALPHA_VANTAGE,
		}, () => {
			assert(client.user, 'User does not exist');
			assert(client.portfolio, 'Portfolio does not exist');
			assert(client.positions, 'Positions does not exist');
			done();
		});
  });
});

describe('Gather Robinhood Data', function() {

  it('should get instrument data from server', function(done) {
  	client.get('https://api.robinhood.com/instruments/39ff611b-84e7-425b-bfb8-6fe2a983fcf3/', (res) => {
  		assert(res, 'Response is null');
  		done();
  	}, () => {
  		assert(false, 'Request did not complete.');
  		done();
  	});
  });

  it('should add algorithm to library', function(done) {
    client.addAlgorithm('algo', (buy, sell, data) => {
      console.log("  ")
      console.log(data.price);
      console.log(data.ema.daily(50));
      console.log(data.macd.daily);
    });
    assert(client.algorithms.find(x => x.name === "algo"), 'could not find algorithm');
    done();
  });

  it('should run algorithm with AAPL', function(done) {
    this.timeout(10000);
    client.execute({
      name: 'algo',
      symbol: 'AAPL',
      max_usd: '200.00',
      dry: true
    }).then(() => {
      assert(true, "som");
      done();
    })
  });
});
