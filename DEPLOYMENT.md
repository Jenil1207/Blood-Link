# Deploy BloodLink with Render and MongoDB Atlas

The root `render.yaml` defines a free Express web service and a React static site.
The database remains MongoDB, hosted in Atlas. Node.js 24 is selected for both builds.
Render provides HTTPS, which the browser location feature requires outside localhost.

## Current college demonstration

- Website: https://bloodlink-web-ls34.onrender.com
- Backend readiness: https://bloodlink-api-ecqv.onrender.com/api/health
- Render Blueprint: BloodLink (`exs-dbjns4mtlv9c73dps470`)
- Atlas project / cluster: BloodLink / bloodlink (Free, Singapore)

Both services deploy from `main`. The service URLs differ from their short names;
the actual URLs above are configured in `CLIENT_ORIGINS` and `VITE_API_URL`.
Initial online administrator and demo passwords are stored only on the setup Mac
in `.local/hosting-credentials.txt`, excluded from Git. They differ from the local
development credentials. The new database contains sample demonstration data.

The deployed checks covered five account logins, sessions, CORS, geospatial camp
discovery, profile/history/reward reads, direct React routes and a complete sample
SOS create/notify/volunteer/resolve workflow over live SSE. The sample SOS was
resolved; the checks did not modify blood inventory or donation counters.

## 1. Database

Create a separate Atlas Free/M0 cluster and a database user with read/write access
to the `bloodlink` database. Copy its Node.js connection string, including the database
name. URL-encode special characters in the username/password. Keep it out of Git.

In Atlas Network Access, allow all outbound CIDR ranges listed under the Render API
service's Connect > Outbound tab. Do not open the database to every IP. Temporarily
allow your laptop's current public IP when running setup scripts from your laptop.

## 2. Hosting

Push the deployment changes to GitHub and merge into `main`. In Render, create a
Blueprint from this repository and select `render.yaml`. Authorize access to this
repository if needed. Review the service names and confirm that the API plan is Free.

Enter these values when prompted:

| Service / key | Value |
| --- | --- |
| API / `MONGO_URI` | Private Atlas connection string for the new database |
| API / `CLIENT_ORIGINS` | Actual React HTTPS origin, with no trailing slash |
| React / `VITE_API_URL` | Actual API HTTPS origin followed by `/api` |

Names in `render.yaml` are service names, not guaranteed public hostnames. Render
may assign a different hostname if a name is already taken. Once the services have
been created, copy their actual URLs from Render and correct the values above.
Redeploy the API after changing `CLIENT_ORIGINS`. Rebuild/redeploy React after changing
`VITE_API_URL`: Vite embeds this value at build time. No API key belongs in a `VITE_` variable.

The Blueprint generates a fresh JWT secret. It uses Render's `PORT` automatically;
do not copy your laptop's `PORT` or MongoDB URI. `TRUST_PROXY_HOPS=1` trusts the nearest
Render proxy for rate limiting. Leave it at 0 for direct local access. Review this
setting if adding another reverse proxy or changing hosts. Keep one API instance:
live notification delivery currently runs within one Node process.

The frontend rewrite to `/index.html` lets React Router handle direct visits to
`/login`, `/camps`, and other application pages.

## 3. Initial accounts and sample data

The new Atlas database does not automatically contain your laptop's data. Do not
copy real donor medical information or your local credential files into the deployment.

Run `npm run create-admin` from `server` on your laptop with `MONGO_URI` pointing
to the new Atlas database, a valid `JWT_SECRET`, and the desired `ADMIN_NAME`,
`ADMIN_EMAIL`, and `ADMIN_PASSWORD` supplied privately through environment variables.
The script creates the account only if it does not already exist. You do not need to
put admin bootstrap credentials into the running API service.

For an explicitly labelled college demonstration database, you can optionally run
`npm run seed` from your laptop with the same Atlas URI, `NODE_ENV=development` and a
new private `DEMO_PASSWORD`. This inserts only missing demo accounts, a future camp
and reward items; it does not overwrite accounts or balances. Keep the hosted API
on `NODE_ENV=production`, where seeding is disabled. Do not seed as part of every build.

Alternatively register donor/institution accounts normally, verify institutions as
the admin, and create camp/reward entries through the documented APIs.

## 4. Verify the deployment

- Visit the API's `/api/health`: expect status `ok` and database `connected`.
- Open and refresh the frontend's `/login` directly.
- Sign in as donor, hospital, NGO and admin as appropriate.
- Save a donor profile; confirm it survives sign-out/sign-in.
- Try location permission and manual coordinates.
- Publish an SOS and verify live delivery in a separate donor browser session.
- Record a demo donation and check history, coins and applicable inventory.
- Redeem an affordable reward and retrieve the issued voucher after signing in again.

Free Render APIs can sleep after 15 minutes without inbound traffic and need time
to wake up. Test before the presentation. Database data is kept in Atlas across API
restarts. Review Render/Atlas usage limits in their dashboards.

References: [Render Blueprints](https://render.com/docs/blueprint-spec),
[free instance limitations](https://render.com/docs/free),
[outbound IP ranges](https://render.com/docs/outbound-ip-addresses),
[Atlas free clusters](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/).
