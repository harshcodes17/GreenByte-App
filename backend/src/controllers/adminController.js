const asyncHandler = require('../utils/asyncHandler');
const validate = require('../utils/validate');
const { adminRequestQuerySchema } = require('../validators/pickupValidators');
const { listAllRequests } = require('../services/pickupService');
const { listRecyclerProfiles } = require('../services/recyclerService');
const { getAdminOverview } = require('../services/adminService');

const getOverview = asyncHandler(async (req, res) => {
  const overview = await getAdminOverview();

  res.json({
    success: true,
    data: overview
  });
});

const listRequests = asyncHandler(async (req, res) => {
  const filters = validate(adminRequestQuerySchema, req.query);
  const requests = await listAllRequests(filters);

  res.json({
    success: true,
    data: requests
  });
});

const listRecyclers = asyncHandler(async (req, res) => {
  const recyclers = await listRecyclerProfiles();

  res.json({
    success: true,
    data: recyclers
  });
});

module.exports = {
  getOverview,
  listRequests,
  listRecyclers
};
