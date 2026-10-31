# BloodLink - Community Blood Donation & Hospital SOS Management Platform

A modern MERN stack web application designed to connect voluntary blood donors, non-governmental organizations (NGOs), and healthcare institutions. BloodLink provides real-time emergency SOS coordination, location-based camp discovery, transparent patient donation records, and an endorsement-backed donor reward system.

---

## Key Features

- **Donor Dashboard**: Instant eligibility countdown, nearby active SOS alerts, total donation counters, and endorsement stamps.
- **Nearby Camps & Mobile Drives**: Interactive map powered by Leaflet & OpenStreetMap with radius filtering and instant slot booking.
- **Hospital Emergency SOS Management**: Real-time depot stock tracking (O+, O-, A+, A-, B+, B-, AB+, AB-), SOS broadcast alerts, and surplus stock matching across nearby medical centers.
- **Hospital Donor Verification & Record Logging**: Search donors by unique Donor BL-ID, review health credentials before blood draw, and submit donation / camp attendance records.
- **Clinical Endorsement Mechanism**: Only verified hospitals possess the authority to award clinical endorsements (+75 PTS) to donors.
- **Rewards Store**: Redeem hard-earned Blood Coins for health vouchers, movie tickets, and fitness accessories.
- **Admin Portal**: Verification system for newly registered NGOs and hospitals, with scam moderation controls.
- **MongoDB Geospatial Search**: High-performance `2dsphere` location indexing for proximity calculations.

---

## Tech Stack

- **Frontend**: React.js, React Router DOM, Leaflet, Custom Vanilla CSS
- **Backend**: Node.js, Express.js
- **Database**: MongoDB with Mongoose (GeoJSON 2dsphere indexing)

---

## Project Structure

```
BloodLink/
├── client/              # React frontend application
├── server/              # Express & MongoDB backend API
└── README.md            # Project overview & documentation
```

---

## Backend setup and API documentation

After the local environment has been configured, start MongoDB, Express and React together from this folder:

```sh
npm run dev
```

On macOS, you can also double-click `Start BloodLink.command`. The launcher initializes the local MongoDB replica set when needed, waits for the API to become ready, and opens the React development server on port 5173. Press Ctrl+C in that terminal to stop the stack. MongoDB data is preserved in `.local/mongodb`; local login details are saved in `.local/credentials.txt` during setup. Both `.local/` and `.env` files are excluded from Git.

The launcher uses MongoDB Community installed with Homebrew and the Node dependencies in `server` and `client`. It reads the API port and database URI from `server/.env`. If you change the API port, update `client/.env` to match. The React server uses port 5173 without silently moving to another port.

The Express/MongoDB backend now includes authenticated donor/hospital/NGO/admin access, medical history and known abnormalities, consent-aware donor profiles, geospatial donor/camp discovery, camp booking, clinical donation records, inventory, SOS alerts with live notifications, and transactional Blood Coin/voucher redemption.

Start with **[server/README.md](server/README.md)** for environment setup, MongoDB Atlas/local replica-set instructions, admin/demo creation, example requests and the demo walkthrough. Import **[server/openapi.json](server/openapi.json)** into Postman for the full API reference. The server also exposes it at `GET /api/docs`.

The React client now attaches authentication tokens and uses saved API results for its main donor, institution, booking, record and reward workflows. Camp creation/management and reward administration are available through the documented API for further frontend work.

**Current location:** registration, donor profiles, and camp discovery now have a **Use my location** button. Browser permission is requested on click. Profile coordinates are saved on form submission, while camp-page detection applies only to that search. Manual coordinate entry and permission-error guidance are included. Use HTTPS when deploying this feature; localhost is supported during development.

```sh
npm --prefix server ci
# Copy server/.env.example to server/.env and fill in your own database URI and JWT secret.
npm --prefix server run create-admin
# Optional: set DEMO_PASSWORD in server/.env, then:
npm --prefix server run seed
npm --prefix server run dev
```

Run React separately with `npm --prefix client ci` and `npm --prefix client run dev`. Backend integration tests: `npm --prefix server test`.
