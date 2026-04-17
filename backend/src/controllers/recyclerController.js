const asyncHandler = require('../utils/asyncHandler');
const validate = require('../utils/validate');
const {
  recyclerProfileSchema,
  recyclerProfileParamsSchema,
  recyclerAvailabilitySchema
} = require('../validators/recyclerValidators');
const {
  recyclerQueueQuerySchema,
  recyclerIdParamsSchema,
  recyclerDecisionSchema,
  recyclerAdvanceSchema
} = require('../validators/pickupValidators');
const {
  upsertRecyclerProfile,
  getRecyclerProfile,
  updateRecyclerAvailability
} = require('../services/recyclerService');
const {
  listRecyclerQueue,
  decideRecyclerRequest,
  advanceRecyclerRequest
} = require('../services/pickupService');

const upsertProfile = asyncHandler(async (req, res) => {
  const { recyclerId } = validate(recyclerProfileParamsSchema, req.params);
  const payload = validate(recyclerProfileSchema, req.body);
  const profile = await upsertRecyclerProfile(recyclerId, payload);

  res.status(200).json({
    success: true,
    data: profile
  });
});

const getProfile = asyncHandler(async (req, res) => {
  const { recyclerId } = validate(recyclerProfileParamsSchema, req.params);
  const profile = await getRecyclerProfile(recyclerId);

  res.json({
    success: true,
    data: profile
  });
});

const setAvailability = asyncHandler(async (req, res) => {
  const { recyclerId } = validate(recyclerProfileParamsSchema, req.params);
  const payload = validate(recyclerAvailabilitySchema, req.body);
  const profile = await updateRecyclerAvailability(recyclerId, payload.availabilityStatus);

  res.json({
    success: true,
    data: profile
  });
});

const listQueue = asyncHandler(async (req, res) => {
  const { recyclerId } = validate(recyclerProfileParamsSchema, req.params);
  const { scope } = validate(recyclerQueueQuerySchema, req.query);
  const queue = await listRecyclerQueue(recyclerId, scope);

  res.json({
    success: true,
    data: queue
  });
});

const decideRequest = asyncHandler(async (req, res) => {
  const { recyclerId, pickupId } = validate(recyclerIdParamsSchema, req.params);
  const payload = validate(recyclerDecisionSchema, req.body);
  const request = await decideRecyclerRequest(recyclerId, pickupId, payload.decision, payload.note);

  res.json({
    success: true,
    data: request
  });
});

const advanceRequest = asyncHandler(async (req, res) => {
  const { recyclerId, pickupId } = validate(recyclerIdParamsSchema, req.params);
  const payload = validate(recyclerAdvanceSchema, req.body);
  const request = await advanceRecyclerRequest(recyclerId, pickupId, payload.status, payload.note);

  res.json({
    success: true,
    data: request
  });
});

module.exports = {
  upsertProfile,
  getProfile,
  setAvailability,
  listQueue,
  decideRequest,
  advanceRequest
};
