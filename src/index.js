const request = require('request');
const rp = require('request-promise');

function handleRequestErrors(error, res, callback, callbackError) {
  if (!res) callbackError('No response received.');
  else if (error) callbackError(error);
  else callback();
}

function login(user, pass, callback, err) {
  request({
    uri: 'https://api.robinhood.com/api-token-auth/',
    method: 'POST',
    form: {
      username: user,
      password: pass
    },
    json: true
  }, (error, res) => handleRequestErrors(error, res, () => {
    if (res.body.token) callback(res);
    else if (res.body.mfa_type) err('Requires MFA');
    else err(res.body);
  }, err));
}

function reqWithAuth(token, url, callback, err, type) {
  var _method = (type) ? type : 'GET';
  return rp({
    uri: url,
    method: _method,
    headers: { Authorization: `Token ${token}` },
    json: true
  }).then(res => callback(res)).catch(error => err(error));
}

function getPaginated(token, url, callback, err) {
  return rp({
    uri: url,
    method: 'GET',
    headers: { Authorization: `Token ${token}` },
    json: true
  }).then(async (res) => {
    if (res.next && res.next !== null) {
      callback(res.results.concat((await getPaginated(token, res.next, callback, err)).results));
    } else callback(res.results);
  }).catch(error => err(error));
}

var alpha_vantage, news_api, token;

var get = (url, callback, err) => reqWithAuth(token, url, (res) => {
  if (res.results) callback(res.results);
  else callback(res);
}, err);

module.exports = {
  Robinhood: function transaction() {
    this.portfolio = [];
    this.init = (opts, callback) => {
      const err = (error) => {
        if (error.error && error.error.detail === "Invalid Token.") this.authorize(opts,callback,this);
        else callback(error);
      };
      this.authorize(opts,callback,err);
    };

    this.logout = () => reqWithAuth(token, 'https://api.robinhood.com/api-token-logout/', ()=>undefined, (err) => {
      console.log(err)
    }, 'POST');

    this.authorize = (opts,callback,err) => {
      if (token) this.logout();
      if (opts.alpha_vantage) alpha_vantage = opts.alpha_vantage;
      if (opts.news_api) news_api = opts.news_api;
      login(opts.robinhood.username, opts.robinhood.password, (res) => {
        // Creates requests object to track multiple requests to the API
        const requests = [];

        // Saves the authorization token
        token = res.body.token;

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
      });
    }

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
        'name': name, 
        'func': callback 
      });
      // console.log(this.algorithms[this.algorithms.length-1])
    };

    this.algo = {
      sell: () => {
        // if (this.algo.passed_options.dry)
      },
      buy: () => {
        // if (this.algo.passed_options.dry)
      },
      getStockData: async (opts, callback, backtest) => {
        var instr, quote;

        await rp("https://api.robinhood.com/instruments/?symbol="+opts.symbol).then(res => {
          instr = JSON.parse(res).results[0];
        }).catch(err => {
          console.log(err);
        });

        if (!instr) throw new Error("Instrument was not found")

        await rp(instr.quote).then(res => {
          quote = JSON.parse(res);
        }).catch(err => {
          console.log(err);
        });

        this.algo.passed_options = opts;
        var data = {
          ema: {
            daily: (size) => data.ema_data.daily[size],
            weekly: (size) => data.ema_data.weekly[size],
            monthly: (size) => data.ema_data.monthly[size],
          },
          sma: {
            daily: (size) => data.sma_data.daily[size],
            weekly: (size) => data.sma_data.weekly[size],
            monthly: (size) => data.sma_data.monthly[size],
          },
          ema_data: {
            daily: {},
            weekly: {},
            monthly: {}
          },
          sma_data: {
            daily: {},
            weekly: {},
            monthly: {}
          }
        };
        var promise_array = [];
        var get_av = (func,interval,size,series_type,callback) => rp({
          url: "https://www.alphavantage.co/query",
          qs: {
            function: func,
            symbol: opts.symbol,
            interval: interval,
            time_period: size,
            series_type: (series_type) ? series_type : 'close',
            apikey: alpha_vantage
          }
        }).then((res) => {
          res = JSON.parse(res);
          var obj = res[Object.keys(res)[1]];
          var first_el = obj[Object.keys(obj)[0]];
          callback(first_el[Object.keys(first_el)[0]]);
        });
        var getters = {
          get invested_money() {

          },
          get available_money() {

          },
          get price() {
            data.price = quote.ask_price;
          },
          get sentiment() {

          },
          sma: {
            daily: (size) => {
              promise_array.push(get_av('SMA','daily',size,opts.sma_series_type, (res) => {
                data.sma_data.daily[size] = res;
              }));
            },
            weekly: (size) => {
              promise_array.push(get_av('SMA','weekly',size,opts.sma_series_type, (res) => {
                data.sma_data.weekly[size] = res;
              }));
            },
            monthly: (size) => {
              promise_array.push(get_av('SMA','monthly',size,opts.sma_series_type, (res) => {
                data.sma_data.monthly[size] = res;
              }));
            }
          },
          ema: {
            daily: (size) => {

            },
            weekly: (size) => {

            },
            monthly: (size) => {

            }
          }
        };

        callback(() => data, () => data, getters);
        await Promise.all(promise_array);
        callback(this.algo.buy, this.algo.sell, data);
      },
      // getCryptoData: async (opts, callback) => {
      //   this.algo.passed_options = opts;
      //   var data = {};
      //   var promise_array = [];
      //   var getters = {
      //     get invested_money() {

      //     },
      //     get available_money() {

      //     },
      //     get price() {
      //       return quote.ask_price;
      //     },
      //     get sentiment() {

      //     },
      //     get sma() {

      //     },
      //     get ema() {

      //     }
      //   };

      //   callback(() => data, () => data, getters);
      //   await Promise.all(promise_array);
      //   // callback(this.algo.buy, this.algo.sell, data);
      // }
    };

    this.execute = (opts, func) => {
      var toExec;
      if (opts.name && !func) toExec = this.algorithms.find(x => x.name === opts.name).func;
      else toExec = func;
      // if (opts.crypto) return this.algo.getCryptoData(opts, toExec).catch(err=>console.log(err));
      /*else*/ return this.algo.getStockData(opts, toExec).catch(err=>console.log(err));
    };

    // this.backtest = (opts, func) => {
    //   var toExec;
    //   if (opts.name && !func) toExec = this.algorithms.find(x => x.name === opts.name).func;
    //   else toExec = func;
    //   // if (opts.crypto) return this.algo.getCryptoData(opts, toExec).catch(err=>console.log(err));
    //   /*else*/ return this.algo.getStockData(opts, toExec, true).catch(err=>console.log(err));
    // };
  },
};
