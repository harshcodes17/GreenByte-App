const env = require('./config/env');
const app = require('./app');
const { connectDatabase } = require('./config/db');
const { seedBaseData } = require('./services/bootstrapService');

async function startServer() {
  await connectDatabase();

  if (env.AUTO_SEED) {
    await seedBaseData();
  }

  app.listen(env.PORT, () => {
    console.log(`GreenByte backend running on port ${env.PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
