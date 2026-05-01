const path = require('path');

process.chdir(path.resolve(__dirname, '..'));

const { connectDatabase } = require('../src/config/db');
const { seedBaseData } = require('../src/services/bootstrapService');

async function run() {
  await connectDatabase();
  await seedBaseData();
  console.log('Catalog seeded successfully');
  process.exit(0);
}

run().catch((error) => {
  console.error('Seed failed', error);
  process.exit(1);
});
