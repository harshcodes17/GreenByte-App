const express = require('express');
const { list, redeem } = require('../controllers/rewardController');

const router = express.Router();

router.get('/', list);
router.post('/redeem', redeem);

module.exports = router;
