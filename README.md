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
├── PROJECT_PLAN.md      # Detailed step-by-step roadmap & specifications
└── README.md            # Project overview & documentation
```

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for the complete phase-by-phase implementation plan.
