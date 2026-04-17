const path = require('path');

process.chdir(path.resolve(__dirname, '..'));

const { connectDatabase } = require('../src/config/db');
const { buildSystemSnapshot } = require('../src/services/analyticsService');

async function run() {
  await connectDatabase();
  const snapshot = await buildSystemSnapshot();
  console.log('Analytics snapshot generated for', snapshot.snapshotDate);
  process.exit(0);
}

run().catch((error) => {
  console.error('Analytics pipeline failed', error);
  process.exit(1);
});
