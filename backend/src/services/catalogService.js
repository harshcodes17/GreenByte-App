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

module.exports = {
  getCatalog
};
