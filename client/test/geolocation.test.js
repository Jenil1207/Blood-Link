import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getCurrentLocation, coordinatesFromPoint, addLocationToQuery } from '../src/lib/geolocation.js';

test('requests a fresh one-time device location and preserves zero coordinates', async () => {
  let calls = 0;
  const location = await getCurrentLocation({ secureContext: true, geolocation: {
    getCurrentPosition(success, _failure, options) {
      calls++;
      assert.equal(options.maximumAge, 0);
      assert.ok(options.timeout > 0 && options.timeout <= 15000);
      success({ coords: { latitude: 0, longitude: 0, accuracy: 23 } });
    }
  } });
  assert.equal(calls, 1);
  assert.deepEqual(location, { latitude: 0, longitude: 0, accuracy: 23 });
});

for (const [code, message] of [[1, /denied.*manually/i], [2, /could not determine.*manually/i], [3, /timed out.*manually/i]]) {
  test(`device error ${code} gives an actionable error with manual fallback`, async () => {
    await assert.rejects(getCurrentLocation({ secureContext: true, geolocation: {
      getCurrentPosition(_success, failure) { failure({ code }); }
    } }), message);
  });
}

test('unsupported browsers can still use manual coordinates', async () => {
  await assert.rejects(getCurrentLocation({ secureContext: true, geolocation: null }), /does not support.*manually/i);
});

test('insecure pages fail before asking for a device position', async () => {
  let asked = false;
  await assert.rejects(getCurrentLocation({ secureContext: false, geolocation: {
    getCurrentPosition() { asked = true; }
  } }), /HTTPS or localhost/);
  assert.equal(asked, false);
});

test('invalid device positions never become search coordinates', async () => {
  for (const coords of [{ latitude: NaN, longitude: 0 }, { latitude: 91, longitude: 0 }, { latitude: 0, longitude: -181 }, {}, { latitude: 0, longitude: Infinity }]) {
    await assert.rejects(getCurrentLocation({ secureContext: true, geolocation: {
      getCurrentPosition(success) { success({ coords }); }
    } }), /invalid location/);
  }
});

test('missing device accuracy is not invented', async () => {
  const location = await getCurrentLocation({ secureContext: true, geolocation: {
    getCurrentPosition(success) { success({ coords: { latitude: 19.076, longitude: 72.8777 } }); }
  } });
  assert.equal(location.accuracy, null);
});

test('GeoJSON longitude/latitude order converts correctly and missing locations stay unknown', () => {
  assert.deepEqual(coordinatesFromPoint({ type: 'Point', coordinates: [72.8777, 19.076] }), { latitude: 19.076, longitude: 72.8777 });
  assert.deepEqual(coordinatesFromPoint({ type: 'Point', coordinates: [0, 0] }), { latitude: 0, longitude: 0 });
  for (const value of [null, {}, { coordinates: [] }, { coordinates: [0, 91] }]) assert.equal(coordinatesFromPoint(value), null);
});

test('nearby queries use the detected coordinates and retain blood group encoding', () => {
  const query = addLocationToQuery(new URLSearchParams({ radiusKm: '5', bloodType: 'O+' }), { latitude: 0, longitude: -73.9857 });
  assert.equal(query.get('lat'), '0');
  assert.equal(query.get('lng'), '-73.9857');
  assert.equal(query.get('radiusKm'), '5');
  assert.match(query.toString(), /bloodType=O%2B/);
  const withoutLocation = addLocationToQuery(new URLSearchParams({ radiusKm: '50' }), null);
  assert.equal(withoutLocation.has('lat'), false);
  assert.equal(withoutLocation.has('lng'), false);
});
