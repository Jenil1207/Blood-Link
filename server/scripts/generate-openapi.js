const fs = require('node:fs');
const path = require('node:path');
const v = require('../lib/validation');
const schemas = {
  DonorRegistration: v.donorRegistration, DonorUpdate: v.donorUpdate, OrganizationRegistration: v.orgRegistration,
  Login: v.login, Camp: v.camp, Record: v.record, SOS: v.sos, Reward: v.reward,
  Inventory: v.z.object({ inventory: v.inventory }).strict(),
  Booking: v.z.object({ timeSlot: v.requiredText(80) }).strict(),
  PasswordChange: v.z.object({ currentPassword: v.z.string(), newPassword: v.password }).strict(),
  RedemptionRequest: v.z.object({ rewardItemId: v.z.string().regex(/^[a-f\d]{24}$/i) }).strict(),
  CampStatus: v.z.object({ status: v.z.enum(['Cancelled', 'Completed']) }).strict(),
  ScamReport: v.z.object({ reason: v.requiredText(1000) }).strict()
};
const components = {
  securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
  schemas: Object.fromEntries(Object.entries(schemas).map(([name, schema]) => {
    const json = v.z.toJSONSchema(schema, { io: 'input' }); delete json.$schema; return [name, json];
  }))
};
const paths = {};
const idHeader = { name: 'Idempotency-Key', in: 'header', required: true, schema: { type: 'string', pattern: '^[a-zA-Z0-9_-]{8,128}$' }, description: 'Reuse this key for retries of the same operation. A different payload under the same key returns 409.' };
const paging = [{ name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } }, { name: 'before', in: 'query', schema: { type: 'string' }, description: 'MongoDB _id of the last row on the previous page; history lists only.' }];
const geo = [{ name: 'lat', in: 'query', schema: { type: 'number', minimum: -90, maximum: 90 } }, { name: 'lng', in: 'query', schema: { type: 'number', minimum: -180, maximum: 180 } }, { name: 'radiusKm', in: 'query', schema: { type: 'number', exclusiveMinimum: 0, maximum: 200, default: 50 } }];
function route(method, url, summary, description, { body, public: isPublic = false, parameters = [], created = false, stream = false } = {}) {
  const params = [...url.matchAll(/{([^}]+)}/g)].map(match => ({ name: match[1], in: 'path', required: true, schema: { type: 'string' } }));
  paths[url] ||= {};
  paths[url][method] = {
    summary, description, tags: [url.split('/')[1] || 'health'], security: isPublic ? [] : [{ bearerAuth: [] }],
    ...(params.length || parameters.length ? { parameters: [...params, ...parameters] } : {}),
    ...(body ? { requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/' + body } } } } } : {}),
    responses: {
      [created ? '201' : '200']: { description: stream ? 'Live SSE stream. Events: connected, notification, sync-required.' : 'Success. See server/README.md for returned resource fields.', content: { [stream ? 'text/event-stream' : 'application/json']: { schema: stream ? { type: 'string' } : {} } } },
      ...(created && parameters.includes(idHeader) ? { 200: { description: 'Idempotent replay; original result returned without repeating side effects.' } } : {}),
      400: { description: 'Invalid JSON, fields, coordinates, ID, or missing idempotency key' },
      401: { description: 'Missing, expired, revoked or invalid bearer token' },
      403: { description: 'Role, ownership, verification or consent restriction' },
      404: { description: 'Resource not found' }, 409: { description: 'Conflict, duplicate, invalid state, insufficient balance/stock or scheduling restriction' },
      429: { description: 'Rate limit exceeded' }, 503: { description: 'MongoDB unavailable or replica set required' }
    }
  };
}
route('get', '/health', 'Database readiness', '200 when MongoDB is connected; otherwise 503.', { public: true });
route('get', '/health/live', 'Process liveness', 'Does not require a database connection.', { public: true });
route('get', '/docs', 'OpenAPI JSON', 'Import this document into Postman or an OpenAPI viewer.', { public: true });
route('post', '/auth/register-donor', 'Register donor', 'Public. Medical history and known abnormalities are self-reported. Returns user, token, role. Starts at zero coins and Pending screening.', { body: 'DonorRegistration', public: true, created: true });
route('post', '/auth/register-hospital-ngo', 'Register institution', 'Public. Requires coordinates. Admin verification required before login. No token issued.', { body: 'OrganizationRegistration', public: true, created: true });
route('post', '/auth/login', 'Sign in', 'accountType is donor, hospital-ngo or admin. Returns token, data, userType, role.', { body: 'Login', public: true });
route('get', '/auth/me', 'Current account', 'All authenticated roles. Returns data, userType and role.');
route('post', '/auth/logout', 'Revoke all sessions', 'Invalidates all existing access tokens for this account.');
route('put', '/auth/password', 'Change password', 'Invalidates all sessions. Sign in again after success.', { body: 'PasswordChange' });
route('get', '/donors/{identifier}', 'Read donor profile', 'Donor self, verified hospital or NGO. identifier is MongoDB _id or BL-ID. Medical fields only for self or a hospital with donor consent. Admin has no medical-profile access.');
route('put', '/donors/{id}', 'Update own donor profile', 'Donor only. Does not accept clinical results, coin balances or donation counters. Changed disclosures reset screening to Pending.', { body: 'DonorUpdate' });
route('get', '/hospitals/donors/search', 'Nearby donor search', 'Verified hospitals/NGOs. Exact locations and contact data are omitted. Escape blood type plus signs through URLSearchParams. Results sorted by proximity; limit is a cap.', { parameters: [...geo, { name: 'donorId', in: 'query', schema: { type: 'string' }, description: 'Literal name or BL-ID search' }, { name: 'bloodType', in: 'query', schema: { type: 'string' } }, paging[0]] });
route('get', '/hospitals/{id}', 'Own institution and stock', 'Verified institution, own account only.');
route('put', '/hospitals/{id}/inventory', 'Set blood inventory counts', 'Verified hospital, own account only. Partial blood-type updates. Nonnegative integers.', { body: 'Inventory' });
route('get', '/camps', 'Find upcoming camps', 'Authenticated users. Active organizers only. If no coordinates exist, returns upcoming camps with null distance. Booking roster omitted except for organizer.', { parameters: [...geo, { name: 'bloodType', in: 'query', schema: { type: 'string' } }, { name: 'mine', in: 'query', schema: { type: 'boolean' } }, paging[0]] });
route('post', '/camps', 'Create camp', 'Verified hospital/NGO. Organizer identity is derived from token. Start date must be future, end date after start. UTC ISO dates with timezone.', { body: 'Camp', created: true });
route('get', '/camps/{id}', 'Camp details', 'Roster visible only to organizing institution.');
route('patch', '/camps/{id}/status', 'Close own camp', 'Organizing institution only. Complete after endDate or cancel at any time while Scheduled.', { body: 'CampStatus' });
route('post', '/camps/{id}/register', 'Book camp slot', 'Donor self. Requires scheduling eligibility; Pending screening may book. Capacity is total across the camp, and one slot per donor.', { body: 'Booking' });
route('delete', '/camps/{id}/register', 'Cancel own booking', 'Donor self. Camp must not have started.');
route('get', '/records/donor/{donorBLId}', 'Donation and attendance history', 'Donor self. Hospitals see own records and consented history; NGOs see only own attendance records, without clinical values.', { parameters: paging });
route('post', '/records', 'Log verified visit and award coins', 'Verified hospitals: donation, screening or endorsement. NGOs: attendance only. Server controls facility identity, dates and points. Attendance requires owned camp, registered donor and started camp. One endorsement per hospital/donor. Whole-blood donation adds one inventory unit. Clinical donation requires quantity, hemoglobin and bloodPressure. Same scheduling interval used for all donation types as a lab policy.', { body: 'Record', parameters: [idHeader], created: true });
route('get', '/sos/nearby', 'Nearby live SOS alerts', 'Authenticated. Profile coordinates or lat/lng required. Donors default to their exact blood type. Includes Active and In Transit alerts until expiry; responders are private to creator.', { parameters: [...geo, { name: 'bloodType', in: 'query', schema: { type: 'string' } }, paging[0]] });
route('get', '/sos/mine', 'Own SOS history', 'Verified hospital only, including resolved/expired alerts.', { parameters: paging });
route('post', '/sos', 'Publish SOS and notify donors', 'Verified hospital only. Location/identity come from hospital account. Persists notifications for available matching-blood-type donors inside radius whose scheduling window permits volunteering. No medical clearance is inferred.', { body: 'SOS', created: true });
route('put', '/sos/{id}/accept', 'Volunteer for SOS', 'Available donor with matching blood type, location inside alert radius and scheduling eligibility. Does not award coins or create a donation.');
route('put', '/sos/{id}/resolve', 'Resolve own SOS', 'Creating hospital only. Marks resolved without transferring stock.');
route('put', '/sos/{id}/fulfill', 'Fulfill another hospital SOS', 'Verified source hospital only. Atomically moves full required stock to requesting hospital and resolves alert. Duplicate or insufficient-stock requests return 409.');
route('get', '/sos/stock-matches/{hospitalId}', 'Find nearby hospital stock', 'Own requesting hospital ID. Verified active partner hospitals only.', { parameters: [geo[2], { name: 'bloodType', in: 'query', schema: { type: 'string' } }, { name: 'units', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 1000 } }, paging[0]] });
route('get', '/rewards', 'Reward catalog', 'Authenticated roles. Active items, including stock counts.', { parameters: paging });
route('post', '/rewards', 'Create reward', 'Admin only.', { body: 'Reward', created: true });
route('put', '/rewards/{id}', 'Replace reward details', 'Admin only. Use isActive=false to retire a reward.', { body: 'Reward' });
route('post', '/rewards/redeem', 'Redeem Blood Coins', 'Donor self. Atomic balance deduction, stock decrement and durable voucher creation. Returns newBalance, voucherCode, redemptionId, replayed.', { body: 'RedemptionRequest', parameters: [idHeader], created: true });
route('get', '/rewards/redemptions', 'Own issued vouchers', 'Donor self. Returns persisted voucher codes and status.', { parameters: paging });
route('post', '/rewards/redemptions/{id}/use', 'Mark voucher used', 'Admin only, single use. Provider fulfillment is manual in this college project.');
route('get', '/notifications', 'Notification inbox', 'Current account only, newest first.', { parameters: [...paging, { name: 'unread', in: 'query', schema: { type: 'boolean' } }] });
route('get', '/notifications/stream', 'Real-time notification stream', 'Authenticated fetch streaming using Authorization header. Up to five streams per account. Heartbeats every 15 seconds. Reconnect with Last-Event-ID; latest 100 are replayed. Use history endpoint on sync-required. Single API process delivery.', { parameters: [{ name: 'Last-Event-ID', in: 'header', schema: { type: 'string' } }], stream: true });
route('put', '/notifications/{id}/read', 'Acknowledge notification', 'Recipient only.');
route('get', '/admin/organizations', 'Institution moderation queue', 'Admin only.', { parameters: [...paging, { name: 'pending', in: 'query', schema: { type: 'boolean' } }] });
route('put', '/admin/verify/{id}', 'Approve institution', 'Admin only. Clears scam flag and revokes old tokens; cannot enable disabled accounts.');
route('put', '/admin/report-scam/{id}', 'Suspend institution', 'Admin only. Revokes sessions, cancels camps and closes active SOS.', { body: 'ScamReport' });
route('delete', '/admin/org/{id}', 'Disable institution', 'Admin only. Soft deletion preserves records and audit trail.');
route('get', '/admin/audit', 'Moderation audit log', 'Admin only.', { parameters: paging });
const spec = { openapi: '3.1.0', info: { title: 'BloodLink MERN API', version: '1.0.0', description: 'College fullstack lab backend. JSON bodies use real numbers/booleans. Authentication is Bearer JWT. Medical data remains consent-restricted.' }, servers: [{ url: 'http://localhost:5000/api' }], paths, components };
fs.writeFileSync(path.join(__dirname, '../openapi.json'), JSON.stringify(spec, null, 2) + '\n');
console.log('Generated openapi.json');
