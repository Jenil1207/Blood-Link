const mongoose = require('mongoose');
const { getConfig } = require('./config');
const { connectDatabase } = require('./db');
const { createApp } = require('./app');
async function start() {
  const config = getConfig();
  await connectDatabase(config.mongoUri);
  // Rewards, records and stock transfers must never silently run without transactions.
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('Use MongoDB Atlas or a local replica set. See server/README.md.');
  const app = createApp(config);
  const server = app.listen(config.port, () => console.log(`BloodLink API listening on port ${config.port}`));
  const shutdown = () => {
    app.locals.closeStreams();
    const timer = setTimeout(() => process.exit(1), 10000).unref();
    server.close(async () => { await mongoose.disconnect(); clearTimeout(timer); process.exit(0); });
  };
  process.once('SIGINT', shutdown); process.once('SIGTERM', shutdown);
  return server;
}
if (require.main === module) start().catch(async err => {
  console.error(`Startup failed: ${err.message}`); await mongoose.disconnect(); process.exitCode = 1;
});
module.exports = { start };
