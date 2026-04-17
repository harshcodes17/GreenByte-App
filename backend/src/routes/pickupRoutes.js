const express = require('express');
const {
  estimate,
  create,
  list,
  changeStatus
} = require('../controllers/pickupController');

const router = express.Router();

router.get('/', list);
router.post('/estimate', estimate);
router.post('/', create);
router.patch('/:pickupId/status', changeStatus);

module.exports = router;
