# transactionJS

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A simple way to set up automated trading using tools like Robinhood, Alpha Vantage, and others - while making it easy to write code that doesn't become cumbersome or hard to maintain.

# Installation

To install, run
```
npm install transaction --save
```

# Contributing

Any issues should be directed to the issues page. Pull requests are welcome.

## Commands

- `npm run clean` - Remove `lib/` directory
- `npm test` - Run tests with linting and coverage results.
- `npm test:only` - Run tests without linting or coverage.
- `npm test:watch` - You can even re-run tests on file changes!
- `npm test:prod` - Run tests with minified code.
- `npm run test:examples` - Test written examples on pure JS for better understanding module usage.
- `npm run lint` - Run ESlint with airbnb-config
- `npm run cover` - Get coverage report for your code.
- `npm run build` - Babel will transpile ES6 => ES5 and minify the code.
- `npm run prepublish` - Hook for npm. Do all the checks before publishing your module.

# Credits

I used the awesome [NPM Module Boilerplate](https://github.com/flexdinesh/npm-module-boilerplate) by [flexdinesh](https://github.com/flexdinesh) to get this module going.

Also, currently using the [unofficial Robinhood API](https://github.com/sanko/Robinhood), kindly compiled by [sanko](https://github.com/sanko/Robinhood)

# License

MIT © Chris Vanderloo
