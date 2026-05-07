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

const remove = asyncHandler(async (req, res) => {
  const { pickupId } = validate(pickupIdParamsSchema, req.params);
  await require('../services/pickupService').removePickup(pickupId);

  res.json({
    success: true,
    message: 'Pickup request deleted successfully'
  });
});

const respondNegotiation = asyncHandler(async (req, res) => {
  const { pickupId } = req.params;
  const { userId, accept } = req.body;
  const pickup = await require('../services/pickupService').customerRespondNegotiation(pickupId, userId, accept);

  res.json({
    success: true,
    data: pickup
  });
});

const updatePayment = asyncHandler(async (req, res) => {
  const { pickupId } = req.params;
  const { destination } = req.body;
  const pickup = await require('../services/pickupService').updatePaymentDestination(pickupId, destination);

  res.json({
    success: true,
    data: pickup
  });
});

module.exports = {
  estimate,
  create,
  list,
  changeStatus,
  remove,
  respondNegotiation,
  updatePayment
};
