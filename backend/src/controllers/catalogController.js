const asyncHandler = require('../utils/asyncHandler');
const { getCatalog, upsertCatalogItems, deleteCatalogItem } = require('../services/catalogService');

const listCatalog = asyncHandler(async (req, res) => {
  const catalog = await getCatalog();

  res.json({
    success: true,
    data: catalog
  });
});

const updateCatalog = asyncHandler(async (req, res) => {
  const { items } = req.body; // Expects an array of {category, name, price, unit, approximateWeightKg}

  if (!Array.isArray(items)) {
    return res.status(400).json({ success: false, message: 'Items array is required' });
  }

  await upsertCatalogItems(items);

  res.json({
    success: true,
    message: 'Catalog updated successfully'
  });
});

const removeItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  
  await deleteCatalogItem(itemId);

  res.json({
    success: true,
    message: 'Item removed successfully'
  });
});

module.exports = {
  listCatalog,
  updateCatalog,
  removeItem
};
