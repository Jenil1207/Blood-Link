# BloodLink backend

Express + Node.js REST API with MongoDB/Mongoose. The React client stays in `../client`. No SQL database, Firebase, Redis, Python service, or paid notification service is required.

## Run locally

Use Node.js 22+ and MongoDB Atlas (recommended for the lab) or a local MongoDB **replica set**. Donation records, coin redemption, moderation and stock transfers use MongoDB transactions. A standalone MongoDB server cannot provide those guarantees, so startup checks for transaction support.

From the repository root:

```sh
cd server
npm ci
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Edit `server/.env`:

- Set `JWT_SECRET` to the generated random value. The example placeholder is rejected.
- Set `MONGO_URI` to your Atlas connection string with a database name, or your local replica-set URI. In Atlas, allow your IP and create a database user with access to this development database.
- `CLIENT_ORIGINS` is a comma-separated list of exact React origins (default: localhost/127.0.0.1 on port 5173).
- Set `ADMIN_EMAIL`, `ADMIN_NAME`, and a strong `ADMIN_PASSWORD` before creating your admin.
- Optionally set `DEMO_PASSWORD` to a password of at least 8 characters for seeded demo accounts.

Then:

```sh
npm run create-admin
npm run seed
npm run dev
```

Seeding is optional. It inserts missing demo accounts, a future camp and reward items. It never deletes collections, resets existing passwords, or overwrites balances. It is disabled in production. Admins are created separately; there is no public admin-registration endpoint. Use a fresh development database for this version: the previous prototype's plaintext credentials and fabricated donor statistics are not automatically migrated.

API: `http://localhost:5000/api`. Readiness: `GET /api/health`. OpenAPI reference: `GET /api/docs`, or import [openapi.json](openapi.json) directly into Postman.

### Current-location detection

Donor and institution registration, My Profile, and Find Camps include a **Use my location** button. Nothing requests device location until that button is clicked. Allow the browser's location request to fill the coordinates; manual entry remains available if permission is denied, location services are unavailable, or detection times out. Device accuracy is displayed when supplied by the browser.

Registration saves the detected coordinates only when the account is submitted. My Profile saves them only after **Save profile**; saved donor coordinates are used for nearby camps and matching SOS alerts. Institution registration should use the institution's location, so the current-location button is appropriate only when the person registering is actually there.

On Find Camps, detection temporarily centres the map and filters camps from the detected position. It does not update the stored profile. **Use saved location** returns to the profile's coordinates. This is a one-time position lookup, not continuous tracking. Deployed pages require HTTPS; localhost works for development. There is no external geocoding API or API key involved.

Location tests use simulated device responses; they do not collect the developer's real location. Run them with `npm --prefix client test`, or run both client and backend tests with `npm test` from the repository root.

In another terminal:

```sh
cd client
npm ci
# Optional: cp .env.example .env and change VITE_API_URL
npm run dev
```

Open the URL printed by Vite. The default allowed frontend port is 5173; if Vite picks another port, add that exact origin to `CLIENT_ORIGINS` and restart the backend.

### Optional local MongoDB setup

If you already have MongoDB Community Server and mongosh installed, run these commands in separate terminals. Atlas users can skip this.

```sh
mkdir -p /tmp/bloodlink-mongo
mongod --dbpath /tmp/bloodlink-mongo --replSet rs0 --bind_ip 127.0.0.1 --port 27017
```

```sh
mongosh --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
```

Use `MONGO_URI=mongodb://127.0.0.1:27017/bloodlink?replicaSet=rs0`. Wait until the replica set elects a primary before starting the API.

## Demo accounts and walkthrough

After `npm run seed`, these accounts use your `DEMO_PASSWORD`:

| Account | Email | Login accountType |
| --- | --- | --- |
| Donor | donor@bloodlink.local | donor |
| Hospital | hospital@bloodlink.local | hospital-ngo |
| Partner hospital | partner@bloodlink.local | hospital-ngo |
| NGO | ngo@bloodlink.local | hospital-ngo |

The admin uses the credentials you supplied to `npm run create-admin`. Login shortcuts in React fill the email/account type; they still require the real password.

1. Register a donor with blood group, date of birth, medical history, known abnormalities and location. Consent to share medical history is optional and off by default.
2. Register a hospital/NGO with real coordinates. Sign in as the admin to verify it, then log in to the institution account.
3. Keep a donor window and hospital window open in separate browser profiles (tokens are held per tab session).
4. Publish an O+ SOS from the demo hospital. An available nearby O+ donor receives a persisted notification and a live SSE event. A donor may volunteer; this does not create a donation or award coins.
5. The hospital searches the donor's BL-ID, reviews consented disclosures, performs screening and records the visit. Donation completion awards 100 coins. A first endorsement from that hospital awards 75 more. Server timestamps, facility identity and rewards cannot be supplied by the donor.
6. Book a future camp as a donor. When the camp starts, its organizing hospital/NGO can record attendance using its camp ID; this awards 50 coins once. The API supports creating and closing camps; the current React map provides discovery and booking.
7. Redeem a catalog item. The backend atomically deducts coins, decrements stock and saves a voucher. Reopen `GET /rewards/redemptions` to retrieve issued codes.
8. A partner hospital can fulfill another hospital's SOS if it has enough stock. Full requested units are debited and credited together; a repeated fulfillment cannot transfer them again.

New donors have zero coins/donations/endorsements, no invented clinical results, and Pending screening. Demo donors also begin with zero coins; earn coins through verified records before redeeming.

## Authentication and authorization

Send `Authorization: Bearer <token>` on every endpoint except registration, login, health and docs. Login returns `{ token, userType, role, data }`; donor registration returns `{ token, role, user }`. Organization registration issues no token.

- Donors can update only their own profile, book/cancel their own camp slot, view their own records, volunteer for SOS, redeem coins and retrieve their vouchers.
- Verified active hospitals can search nearby donors, read consented medical details, log clinical donations/screening/endorsements, manage their own inventory/camps/SOS, and fulfill another hospital's SOS.
- Verified active NGOs can discover donors, organize camps and confirm attendance at their own camps. They cannot update clinical results, log clinical donations, endorse donors, manage hospital inventory, or create SOS.
- Admins verify/suspend/disable institutions, maintain reward items and mark vouchers used. Admin access does not grant access to donor medical profiles.
- Passwords use bcrypt hashes. Password fields and token versions are excluded from responses. Account roles are reloaded from MongoDB on every authenticated request.
- `POST /auth/logout` revokes all tokens for the current account. `PUT /auth/password` also revokes all tokens; sign in again afterward.
- Suspension/verification/disable actions invalidate old organization tokens. Disabling retains donation and moderation records.

Authentication is rate limited to 30 attempts per IP per 15 minutes; the API allows 300 requests per IP per minute. Rate limits and live stream connections are stored in one Node process. If deploying behind a trusted reverse proxy, configure Express's trust proxy setting for that exact deployment.

The included React adapter keeps the token in sessionStorage and medical/account data in memory. Production hosting should use HTTPS, an explicit CORS allowlist and secret environment values.

## Medical profile and scheduling

Donor registration and updates support:

```json
{
  "name": "Example Donor",
  "email": "donor@example.com",
  "password": "choose-a-strong-password",
  "bloodType": "O+",
  "dob": "2000-05-15",
  "address": "Mumbai",
  "phone": "",
  "latitude": 19.076,
  "longitude": 72.8777,
  "healthProblems": "Self-reported health information",
  "medicalHistory": {
    "conditions": ["Self-reported condition"],
    "medications": [],
    "allergies": [],
    "surgeries": [],
    "notes": "Additional information for the screening clinician"
  },
  "knownAbnormalities": ["Self-reported abnormality"],
  "shareMedicalHistory": true,
  "availableForSOS": true
}
```

Only the donor and verified hospitals with the donor's consent receive medical disclosures/clinical values. NGOs receive a limited coordination view. Other donors cannot read the profile. Donor search never returns exact donor coordinates, address, phone, email or date of birth. Donation histories are also scoped: a hospital can see its own records and consented history; an NGO only its own attendance records without clinical measurements.

The lab scheduling rule uses ages 18–65 and `DONATION_INTERVAL_DAYS` (default 90) since the last recorded donation. All donation types currently share this interval. This is a project scheduling policy, not a clinical suitability decision or an official eligibility standard. Actual screening is recorded by verified hospital staff; clinical donation requires a Passed screening, quantity, hemoglobin and blood pressure. Medical disclosures edited by the donor reset screening to Pending. Pending donors can book/volunteer if their scheduling window permits; Deferred donors cannot.

Eligibility responses separate `scheduleEligible`, `requiresScreening`, `isEligible`, `daysRemaining`, `nextEligibleDate` and `statusText`. Each visit still requires clinical screening. Updating a profile cannot set screening results, last donation time, counters or coins.

## API reference

The complete request schemas, roles, query parameters and error responses are in [openapi.json](openapi.json). All bodies are JSON. Use JSON numbers and booleans, not strings. Dates use ISO 8601 with a timezone; date of birth uses YYYY-MM-DD. IDs are MongoDB ObjectIds unless a route explicitly takes a BL-ID.

| Method | Path under /api | Purpose |
| --- | --- | --- |
| POST | /auth/register-donor | Donor registration, medical disclosures and token |
| POST | /auth/register-hospital-ngo | Pending institution registration |
| POST | /auth/login | Donor, hospital/NGO or admin sign-in |
| GET | /auth/me | Current authenticated account |
| POST | /auth/logout | Revoke all account sessions |
| PUT | /auth/password | Change password |
| GET / PUT | /donors/:identifier | Read / update permitted donor profile |
| GET | /hospitals/donors/search | Nearby donor discovery and literal BL-ID/name search |
| GET | /hospitals/:id | Own institution and inventory |
| PUT | /hospitals/:id/inventory | Partial inventory count update |
| GET / POST | /camps | Discover / create camps |
| GET | /camps/:id | Camp details; roster only for organizer |
| PATCH | /camps/:id/status | Organizer cancellation or completion |
| POST / DELETE | /camps/:id/register | Book / cancel own slot |
| GET | /records/donor/:donorBLId | Authorized donation/attendance history |
| POST | /records | Verified visit and transactional rewards |
| GET | /sos/nearby | Nearby unexpired Active / In Transit SOS |
| GET | /sos/mine | Own hospital SOS history |
| POST | /sos | Publish emergency request |
| PUT | /sos/:id/accept | Donor volunteers |
| PUT | /sos/:id/resolve | Creator resolves without stock movement |
| PUT | /sos/:id/fulfill | Partner hospital transfers stock and resolves |
| GET | /sos/stock-matches/:hospitalId | Nearby verified hospital stock |
| GET / POST | /rewards | Catalog / admin creates item |
| PUT | /rewards/:id | Admin edits or retires item |
| POST | /rewards/redeem | Transactional coin redemption |
| GET | /rewards/redemptions | Own saved vouchers |
| POST | /rewards/redemptions/:id/use | Admin marks a voucher used, once |
| GET | /notifications | Own persistent notification inbox |
| GET | /notifications/stream | Authenticated SSE connection |
| PUT | /notifications/:id/read | Acknowledge own notification |
| GET | /admin/organizations | Verification/moderation queue |
| PUT | /admin/verify/:id | Approve institution |
| PUT | /admin/report-scam/:id | Suspend institution with reason |
| DELETE | /admin/org/:id | Disable institution, retain history |
| GET | /admin/audit | Moderation audit history |

History lists support `limit` (1–100, default 50) and `before=<last-row-_id>` for cursor pagination, newest first. Proximity lists use a `limit` cap and distance ordering. Geo search uses `lat`, `lng` and `radiusKm` (greater than zero, at most 200, default 50). Without query coordinates the account location is used. Missing donor location is not silently replaced with Mumbai. Longitude/latitude zero is valid. MongoDB GeoJSON stores **[longitude, latitude]** with `2dsphere` indexes.

Use URLSearchParams or percent-encode blood groups in query strings: `O%2B` represents O+, whereas a raw plus in a query string becomes a space.

### Idempotency and rewards

`POST /records` and `POST /rewards/redeem` require an `Idempotency-Key` header: 8–128 letters, digits, underscores or hyphens (a UUID works). Reuse the same key and payload after a timeout. Success returns 201 the first time and 200 with `replayed: true` on retry. Reusing a key for another payload returns 409.

A donation record example, sent by a hospital:

```json
{
  "donorBLId": "BL-DEMO-00001",
  "donationType": "Whole Blood",
  "isDonation": true,
  "isCampAttendance": false,
  "isEndorsement": true,
  "screeningStatus": "Passed",
  "quantityMl": 450,
  "hemoglobin": 14,
  "bloodPressure": "120/80",
  "attendingStaff": "Demo Clinician"
}
```

These sample measurements are demonstration inputs. The hospital must supply values from its actual screening workflow.

Rewards are calculated only on the server: donation +100, attendance +50, endorsement +75. Attendance needs `campId`, an owned started camp, and a registered donor; a unique key permits credit once per camp/donor. Endorsements are limited to once per hospital/donor. Donation writes, donor counters/coins, whole blood inventory and notifications commit together. Plasma/platelets are logged but do not add to the whole-blood inventory buckets.

Redemption uses `{ "rewardItemId": "<MongoDB reward ID>" }`. Identity comes from the token, and the response contains `newBalance`, `voucherCode`, `redemptionId` and `replayed`. Stock, coins and persisted vouchers commit together. The issued code survives restarts and can be marked used once by an admin. These are project-managed vouchers; provider fulfillment is manual, with no real movie-ticket or retailer integration.

### Real-time notifications

Live notifications use Server-Sent Events over Express; persisted inbox rows use MongoDB. The included [React API helper](../client/src/lib/api.js) uses fetch streaming so it can send the Authorization header. Native EventSource cannot attach that bearer header.

Streams emit `connected`, `notification` and `sync-required`. Heartbeats run every 15 seconds, account access is rechecked, and streams close at token expiry. There are at most five streams per account. Reconnect with `Last-Event-ID`; up to the latest 100 messages are replayed. Read older messages through `GET /notifications?before=...`, including after a `sync-required` event. Keep the inbox as the source of truth after disconnection.

Live fanout is scoped to **one Node API process**; do not use multiple API workers expecting cross-process delivery. MongoDB inbox history remains persistent. An offline donor sees saved notifications on the next login. This provides in-app alerts; SMS, email, browser background push and dispatch-rider integration are not included.

SOS targets exact blood-group matches and opted-in donors within the radius; it does not infer clinical blood-component compatibility. Volunteers are private to the requesting hospital. Acceptance marks In Transit, but a hospital must still resolve or fulfill the request. Expired alerts disappear from nearby results and cannot be accepted/fulfilled; hospital history retains them.

## Tests and maintenance

```sh
cd server
npm test
npm run docs
```

Tests use a temporary MongoDB replica set through mongodb-memory-server; they never connect to `MONGO_URI` or alter your Atlas/development database. The first run may download a MongoDB binary and needs local listening ports.

The integration suite covers password hashing, validation/operator injection, authorization/consent, account verification/revocation, geospatial filtering, duplicate/capacity booking races, idempotent donation and coin writes, attendance/endorsement deduplication, concurrent redemption/rollback, persisted voucher use, live SSE delivery, stock transfer races, notification ownership, moderation audit and elapsed-time scheduling.

Frontend checks: `npm --prefix client run build` and `npm --prefix client run lint`.

OpenAPI is generated from the request-validation schemas plus route descriptions in `scripts/generate-openapi.js`. Regenerate it after changing an API contract.

Implementation follows [Mongoose transaction guidance](https://mongoosejs.com/docs/transactions.html) and the [SSE event format](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events). Transaction database operations run sequentially within each session, while independent requests can run concurrently.
