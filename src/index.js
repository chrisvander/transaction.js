require('babel-polyfill');

const request = require('request');
const rp = require('request-promise');

function handleRequestErrors(error, res, callback, callbackError) {
  if (!res) callbackError('No response received.');
  else if (error) callbackError(error);
  else callback();
}

function login(rh, callback, err) {
  if (rh.token) {
    callback({
      type: 'no_request',
      body: {
        token: rh.token
      }
    });
  } else {
    request({
      uri: 'https://api.robinhood.com/oauth2/token/',
      method: 'POST',
      form: {
        username: rh.username,
        password: rh.password,
        grant_type: 'password',
        scope: 'internal',
        client_id: 'c82SH0WZOsabOXGP2sxqcj34FxkvfnWRZBKlBjFS',
        device_token: rh.device_token
      },
      json: true
    }, (error, res) => handleRequestErrors(error, res, () => {
      if (res.body.access_token) callback(res);
      else if (res.body.mfa_type) err('Requires MFA');
      else err(res.body);
    }, err));
  }
}

function reqWithAuth(token, url, callback, err, type) {
  const rpMethod = (type) || 'GET';
  return rp({
    uri: url,
    method: rpMethod,
    headers: { Authorization: `Bearer ${token}` },
    json: true
  }).then(res => callback(res)).catch(error => err(error));
}

function getPaginated(token, url, callback, err) {
  return rp({
    uri: url,
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
    json: true
  }).then(async (res) => {
    if (res.next && res.next !== null) {
      callback(res.results.concat((await getPaginated(token, res.next, callback, err)).results));
    } else callback(res.results);
  }).catch(error => err(error));
}

let alphaVantage;
// let newsAPI;
let token;

module.exports = {
  Robinhood: function transaction() {
    this.portfolio = [];
    this.init = (opts, callback) => {
      const err = (error) => {
        if (error.error && error.error.detail === 'Invalid Token.') this.authorize(opts, callback, this);
        else callback(error);
      };
      this.authorize(opts, callback, err);
    };

    this.authorize = (opts, callback, err) => {
      if (opts.alphaVantage) alphaVantage = opts.alphaVantage;
      // if (opts.newsAPI) newsAPI = opts.newsAPI;
      login(opts.robinhood, (res) => {
        // Creates requests object to track multiple requests to the API
        const requests = [];

        // Saves the authorization token
        token = res.body.access_token;

        // Gathers the current account's past and present positions
        getPaginated(token, 'https://api.robinhood.com/positions/', (pos) => {
          this.positions = pos;

          // Finds just current positions (with purchased shares)
          // Then this grabs the instrument of each live position, and saves each symbol
          pos.forEach((obj) => {
            if (obj.quantity > 0) {
              requests.push(reqWithAuth(token, obj.instrument, (ticker) => {
                this.portfolio.push(ticker.symbol);
              }, err));
            }
          });

          // Gets user information, saves it to object
          requests.push(reqWithAuth(token, 'https://api.robinhood.com/user/', (info) => {
            this.user = info;
          }, err));

          // Gets account information, saves it to object
          requests.push(reqWithAuth(token, 'https://api.robinhood.com/accounts/', (accounts) => {
            [this.account] = accounts.results;
          }, err));

          // Awaits all requests to complete, and then replies to the callback
          Promise.all(requests).then(() => {
            callback();
          });
        }, err);
      }, err);
    };

    this.get = (url, callback, err) => reqWithAuth(token, url, (res) => {
      if (res.results) callback(res.results);
      else callback(res);
    }, err);

    this.post = (url, callback, err) => reqWithAuth(token, url, (res) => {
      if (res.results) callback(res.results);
      else callback(res);
    }, err, 'POST');

    this.getPaginated = (url, callback, err) => getPaginated(token, url, callback, err);

    // ALL ABOUT ALGORITHMS

    this.algorithms = [];

    this.addAlgorithm = (name, callback) => {
      this.algorithms.push({
        name,
        func: callback
      });
    };

    this.algo = {
      sell: (instr, price, quant) => {
        if (quant !== 0) {
          return rp({
            uri: 'https://api.robinhood.com/orders/',
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            json: true,
            form: {
              account: this.account.url,
              instrument: instr.url,
              symbol: instr.symbol,
              type: 'market',
              time_in_force: 'gtc',
              trigger: 'immediate',
              price,
              quantity: quant,
              side: 'sell'
            }
          });
        }
        return undefined;
      },
      buy: (instr, price, quant) => {
        if (quant !== 0) {
          return rp({
            uri: 'https://api.robinhood.com/orders/',
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            json: true,
            form: {
              account: this.account.url,
              instrument: instr.url,
              symbol: instr.symbol,
              type: 'market',
              time_in_force: 'gtc',
              trigger: 'immediate',
              price,
              quantity: quant,
              side: 'buy'
            }
          });
        }
        return undefined;
      },
      getStockData: async (opts, callback) => {
        let instr;
        let quote;

        await rp(`https://api.robinhood.com/instruments/?symbol=${opts.symbol}`).then((res) => {
          instr = JSON.parse(res).results[0];
        }).catch((err) => {
          throw new Error(err);
        });

        if (!instr) throw new Error('Instrument was not found');

        await rp(instr.quote).then((res) => {
          quote = JSON.parse(res);
        }).catch((err) => {
          throw new Error(err);
        });

        this.algo.passed_options = opts;
        const data = {
          buy: () => {
            if (!opts.dry &&
              parseFloat(quote.last_trade_price) < parseFloat(this.account.buying_power)) {
              this.algo.buy(
                data.instrument, quote.last_trade_price,
                parseInt(
                  parseFloat(this.account.buying_power) /
                  parseFloat(quote.last_trade_price),
                  10
                )
              );
            }
          },
          sell: () => {
            if (!opts.dry && parseFloat(data.investment) > 0) {
              this.algo.sell(data.instrument, quote.last_trade_price, parseFloat(data.investment));
            }
          },
          ema: {
            daily: size => data.ema_data.daily[size],
            weekly: size => data.ema_data.weekly[size],
            monthly: size => data.ema_data.monthly[size],
          },
          sma: {
            daily: size => data.sma_data.daily[size],
            weekly: size => data.sma_data.weekly[size],
            monthly: size => data.sma_data.monthly[size],
          },
          macd: {},
          available_money: this.account.buying_power,
          price: quote.last_trade_price,
          instrument: instr
        };
        const promiseArray = [];
        const getAV = (func, interval, size, seriesType, cback) => {
          const qs = {
            function: func,
            symbol: opts.symbol,
            interval,
            series_type: (seriesType) || 'close',
            apikey: alphaVantage
          };
          if (size) qs.time_period = size;
          return rp({
            url: 'https://www.alphavantage.co/query',
            qs
          }).then((res) => {
            const resParsed = JSON.parse(res);
            if (resParsed.Information) {
              throw new Error('Alpha Vantage Call volume exceeded - try decreasing how often the API is called');
            }
            if (resParsed['Error Message']) {
              throw new Error(res['Error Message']);
            }
            const obj = resParsed[Object.keys(resParsed)[1]];
            if (!obj) throw new Error(obj);
            const firstEl = obj[Object.keys(obj)[0]];
            cback(firstEl[Object.keys(firstEl)[0]]);
          });
        };
        const positions = this.positions;

        const stock = positions.find(st => st.instrument === instr.url);
        if (stock) data.investment = stock.quantity;
        else data.investment = '0.0000';

        await Promise.all(promiseArray);
        callback(data.buy, data.sell, data);
      },
    };

    this.execute = (opts, func) => {
      let toExec;
      if (opts.name && !func) toExec = this.algorithms.find(x => x.name === opts.name).func;
      else toExec = func;
      return this.algo.getStockData(opts, toExec);
    };
  },
};
