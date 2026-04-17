const express = require('express');
const { getProfile, updateProfile } = require('../controllers/userController');

const router = express.Router();

router.get('/:userId', getProfile);
router.patch('/:userId', updateProfile);

module.exports = router;
