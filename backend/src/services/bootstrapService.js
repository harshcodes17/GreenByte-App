const CatalogItem = require('../models/CatalogItem');
const catalogSeed = require('../constants/catalogSeed');

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

async function seedBaseData() {
  await seedCatalog();
}

module.exports = {
  seedBaseData
};
