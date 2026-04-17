const CatalogItem = require('../models/CatalogItem');
const Reward = require('../models/Reward');
const catalogSeed = require('../constants/catalogSeed');
const rewardSeed = require('../constants/rewardSeed');

async function seedCatalog() {
  const operations = catalogSeed.flatMap((group) =>
    group.items.map((item) => ({
      updateOne: {
        filter: { category: group.category, name: item.name },
        update: {
          $set: {
            category: group.category,
            ...item,
            isActive: true
          }
        },
        upsert: true
      }
    }))
  );

  if (operations.length) {
    await CatalogItem.bulkWrite(operations);
  }
}

async function seedRewards() {
  const operations = rewardSeed.map((reward) => ({
    updateOne: {
      filter: { name: reward.name },
      update: {
        $set: {
          ...reward,
          isActive: true
        }
      },
      upsert: true
    }
  }));

  if (operations.length) {
    await Reward.bulkWrite(operations);
  }
}

async function seedBaseData() {
  await seedCatalog();
  await seedRewards();
}

module.exports = {
  seedBaseData
};
