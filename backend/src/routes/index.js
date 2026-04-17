const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const catalogRoutes = require('./catalogRoutes');
const pickupRoutes = require('./pickupRoutes');
const rewardRoutes = require('./rewardRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const recyclerRoutes = require('./recyclerRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/catalog', catalogRoutes);
router.use('/pickups', pickupRoutes);
router.use('/rewards', rewardRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/recyclers', recyclerRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
