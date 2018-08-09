const request = require('request');
const rp = require('request-promise');

function handleRequestErrors(error, res, callback, callback_error) {
  if (!res) callback_error("No response received.");
  else if (error) callback_error(error);
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
    else if (res.body.mfa_type) err("Requires MFA");
    else err(res.body);
  }, err));
}

function getWithAuth(token, url, callback, err) {
  return rp({
    uri: url,
    method: 'GET',
    headers: { 'Authorization': 'Token ' + token },
    json: true
  }).then(res => callback(res)).catch(error => err(error));
}

function getPaginated(token, url, callback, err) {
  return rp({
    uri: url,
    method: 'GET',
    headers: { 'Authorization': 'Token ' + token },
    json: true
  }).then(async res => {
    if (res.next && res.next !== null) callback(res.results.concat((await getPaginated(token,res.next,callback,err)).results))
    else callback(res.results);
  }).catch(error => err(error));

}

module.exports = function () {
  this.portfolio = [];
  this.init = (opts, callback) => {
    // For error handling
    var err = (error) => {
      callback(error);
    }

    // Logs in with client credentials listed in options
    login(opts.username, opts.password, res => {
      // Creates requests object to track multiple requests to the API
      var requests = [];

      // Saves the authorization token
      this.token = res.body.token;

      // Gathers the current account's past and present positions
      getPaginated(this.token, 'https://api.robinhood.com/positions/', pos => {
        this.positions = pos;

        // Finds just current positions (with purchased shares)
        // Then this grabs the instrument of each live position, and saves each symbol
        pos.forEach(obj => {
          if (obj.quantity > 0)
            requests.push(getWithAuth(this.token, obj.instrument, ticker => {
              this.portfolio.push(ticker.symbol);
            }, err));
        });

        // Gets user information, saves it to object
        requests.push(getWithAuth(this.token, 'https://api.robinhood.com/user/', res => this.user = res, err));

        // Gets account information, saves it to object
        requests.push(getWithAuth(this.token, 'https://api.robinhood.com/accounts/', res => this.account = res.results[0], err));

        // Awaits all requests to complete, and then replies to the callback
        Promise.all(requests).then(() => {
          callback();
        });
      });

    });

  };

  this.get = (url,callback,err) => getWithAuth(this.token,url, (res) => {
    if (res.results) callback(res.results)
    else callback(res);
  },err);

  this.getPaginated = (url,callback,err) => getPaginated(this.token,url,callback,err);

  // ALL ABOUT ALGORITHMS

  this.algorithms = [];

  this.addAlgorithm = (name, callback) => {
    this.algorithms.push({"name":name, "func":callback});
  }

  this.execute = (name) => {
    this.algorithms.find(x => x.name === name).func();
  }
};
