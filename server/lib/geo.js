const { fail } = require('./http');
function point(longitude, latitude) { return { type: 'Point', coordinates: [longitude, latitude] }; }
function searchLocation(query, fallback) {
  const lat = query.lat ?? query.hospitalLat;
  const lng = query.lng ?? query.hospitalLng;
  if ((lat === undefined) !== (lng === undefined)) fail(400, 'Supply both lat and lng');
  if (lat === undefined) return fallback;
  if (typeof lat !== 'string' || typeof lng !== 'string' || !lat.trim() || !lng.trim()) fail(400, 'Invalid coordinates');
  const [latitude, longitude] = [Number(lat), Number(lng)];
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) fail(400, 'Invalid coordinates');
  return point(longitude, latitude);
}
function radius(query) {
  const value = query.radiusKm === undefined ? 50 : Number(query.radiusKm);
  if (!Number.isFinite(value) || value <= 0 || value > 200) fail(400, 'radiusKm must be greater than 0 and at most 200');
  return value;
}
function near(location, radiusKm) {
  return { $nearSphere: { $geometry: location, $maxDistance: radiusKm * 1000 } };
}
function distanceKm(a, b) {
  if (!a || !b) return null;
  const [lon1, lat1] = a.coordinates, [lon2, lat2] = b.coordinates;
  const rad = x => x * Math.PI / 180;
  const h = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h))) * 10) / 10;
}
module.exports = { point, searchLocation, radius, near, distanceKm };
