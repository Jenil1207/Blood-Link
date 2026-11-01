const { test } = require('node:test');
const assert = require('node:assert/strict');
const { getConfig } = require('../config');

test('proxy configuration defaults to direct access and rejects unbounded trust', () => {
  const original = process.env.TRUST_PROXY_HOPS;
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'configuration-test-secret-at-least-32-characters';
  try {
    delete process.env.TRUST_PROXY_HOPS;
    assert.equal(getConfig().trustProxyHops, 0);
    process.env.TRUST_PROXY_HOPS = '1';
    assert.equal(getConfig().trustProxyHops, 1);
    for (const value of ['true', '-1', '1.5', '6', 'NaN']) {
      process.env.TRUST_PROXY_HOPS = value;
      assert.throws(() => getConfig(), /TRUST_PROXY_HOPS/);
    }
  } finally {
    if (original === undefined) delete process.env.TRUST_PROXY_HOPS;
    else process.env.TRUST_PROXY_HOPS = original;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  }
});
