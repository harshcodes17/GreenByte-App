const express = require('express');
const { getOverview, listRequests, listRecyclers } = require('../controllers/adminController');

const router = express.Router();

router.get('/overview', getOverview);
router.get('/requests', listRequests);
router.get('/recyclers', listRecyclers);

module.exports = router;
