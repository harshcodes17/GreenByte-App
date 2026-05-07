const CatalogItem = require('../models/CatalogItem');

async function getCatalog() {
  const items = await CatalogItem.find({ isActive: true })
    .sort({ category: 1, name: 1 })
    .lean();

  return items.reduce((groups, item) => {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }

    groups[item.category].push(item);
    return groups;
  }, {});
}

async function upsertCatalogItems(items) {
  const operations = items.map(item => ({
    updateOne: {
      filter: { category: item.category, name: item.name },
      update: { $set: { ...item, isActive: true } },
      upsert: true
    }
  }));

  return CatalogItem.bulkWrite(operations);
}

async function deleteCatalogItem(itemId) {
  return CatalogItem.findByIdAndUpdate(itemId, { isActive: false });
}

module.exports = {
  getCatalog,
  upsertCatalogItems,
  deleteCatalogItem
};
