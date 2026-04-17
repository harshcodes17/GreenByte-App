const asyncHandler = require('../utils/asyncHandler');
const { getCatalog } = require('../services/catalogService');

const listCatalog = asyncHandler(async (req, res) => {
  const catalog = await getCatalog();

  res.json({
    success: true,
    data: catalog
  });
});

module.exports = {
  listCatalog
};
