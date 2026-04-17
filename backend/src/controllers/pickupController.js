const asyncHandler = require('../utils/asyncHandler');
const validate = require('../utils/validate');
const {
  estimatePickupSchema,
  createPickupSchema,
  pickupListQuerySchema,
  pickupStatusSchema,
  pickupIdParamsSchema
} = require('../validators/pickupValidators');
const {
  estimatePickup,
  createPickup,
  listUserPickups,
  updatePickupStatus
} = require('../services/pickupService');

const estimate = asyncHandler(async (req, res) => {
  const payload = validate(estimatePickupSchema, req.body);
  const result = await estimatePickup(payload.items);

  res.json({
    success: true,
    data: result
  });
});

const create = asyncHandler(async (req, res) => {
  const payload = validate(createPickupSchema, req.body);
  const pickup = await createPickup(payload);

  res.status(201).json({
    success: true,
    data: pickup
  });
});

const list = asyncHandler(async (req, res) => {
  const { userId } = validate(pickupListQuerySchema, req.query);
  const pickups = await listUserPickups(userId);

  res.json({
    success: true,
    data: pickups
  });
});

const changeStatus = asyncHandler(async (req, res) => {
  const { pickupId } = validate(pickupIdParamsSchema, req.params);
  const { status } = validate(pickupStatusSchema, req.body);
  const pickup = await updatePickupStatus(pickupId, status);

  res.json({
    success: true,
    data: pickup
  });
});

module.exports = {
  estimate,
  create,
  list,
  changeStatus
};
