const express = require('express');
const {
  upsertProfile,
  getProfile,
  setAvailability,
  listQueue,
  decideRequest,
  advanceRequest
} = require('../controllers/recyclerController');

const router = express.Router();

router.get('/:recyclerId/profile', getProfile);
router.put('/:recyclerId/profile', upsertProfile);
router.patch('/:recyclerId/availability', setAvailability);
router.get('/:recyclerId/requests', listQueue);
router.post('/:recyclerId/requests/:pickupId/decision', decideRequest);
router.patch('/:recyclerId/requests/:pickupId/status', advanceRequest);

module.exports = router;
