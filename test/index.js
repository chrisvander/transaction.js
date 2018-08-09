import { assert } from 'chai';
import robinhood from '../src';

describe('Login to Robinhood', () => {
  it('should test default awesome function', () => {
    const expectedVal = 'I am the Default Awesome Function, fellow comrade! - Dinesh';
    assert(defaultAwesomeFunction('Dinesh') === expectedVal, 'Default not awesome :(');
  });
});
