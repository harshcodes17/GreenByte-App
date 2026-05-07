const express = require('express');
const {
  estimate,
  create,
  list,
  changeStatus,
  remove,
  respondNegotiation
} = require('../controllers/pickupController');

const router = express.Router();

router.get('/', list);
router.post('/estimate', estimate);
router.post('/', create);
router.patch('/:pickupId/status', changeStatus);
router.patch('/:pickupId/payment', require('../controllers/pickupController').updatePayment);
router.delete('/:pickupId', remove);
router.post('/:pickupId/negotiation', respondNegotiation);

module.exports = router;
