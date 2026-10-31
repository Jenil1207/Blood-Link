// A one-time, user-triggered location request. No background location tracking.
export function getCurrentLocation({
  geolocation = globalThis.navigator?.geolocation,
  secureContext = globalThis.isSecureContext,
} = {}) {
  return new Promise((resolve, reject) => {
    if (secureContext === false) {
      reject(new Error('Current location needs HTTPS or localhost. You can enter coordinates manually.'));
      return;
    }
    if (!geolocation?.getCurrentPosition) {
      reject(new Error('This browser does not support location detection. Enter coordinates manually.'));
      return;
    }
    geolocation.getCurrentPosition(position => {
      const { latitude, longitude, accuracy } = position?.coords || {};
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        reject(new Error('Your device returned an invalid location. Try again or enter coordinates manually.'));
        return;
      }
      resolve({
        latitude, longitude,
        accuracy: Number.isFinite(accuracy) && accuracy >= 0 ? accuracy : null,
      });
    }, error => {
      const messages = {
        1: 'Location access was denied. Allow location for this site in your browser, or enter coordinates manually.',
        2: 'Your device could not determine your location. Check location services or enter coordinates manually.',
        3: 'Location detection timed out. Try again or enter coordinates manually.',
      };
      reject(new Error(messages[error?.code] || 'Could not get your location. Try again or enter coordinates manually.'));
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
}

export function coordinatesFromPoint(location) {
  const [longitude, latitude] = location?.coordinates || [];
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export function addLocationToQuery(query, location) {
  if (location) {
    query.set('lat', String(location.latitude));
    query.set('lng', String(location.longitude));
  }
  return query;
}
