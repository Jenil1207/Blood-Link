const mongoose = require('mongoose');
const { getConfig } = require('../config');
const { connectDatabase } = require('../db');
const Admin = require('../models/Admin');
const { parse } = require('../lib/http');
const { z, password, requiredText } = require('../lib/validation');
async function main() {
  const config = getConfig();
  const data = parse(z.object({ name: requiredText(120), email: z.string().trim().toLowerCase().email(), password }), {
    name: process.env.ADMIN_NAME || 'BloodLink Admin', email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD
  });
  await connectDatabase(config.mongoUri);
  if (await Admin.exists({ email: data.email })) throw new Error('Admin already exists; use the password change API rather than overwriting credentials');
  await Admin.create(data);
  console.log(`Admin created: ${data.email}`);
}
main().catch(err => { console.error(err.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
