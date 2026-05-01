const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const catalogRoutes = require('./catalogRoutes');
const pickupRoutes = require('./pickupRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const recyclerRoutes = require('./recyclerRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'GreenByte API is running',
    version: 'v1',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      users: '/api/v1/users/:userId',
      catalog: '/api/v1/catalog',
      pickups: '/api/v1/pickups',
      dashboard: '/api/v1/dashboard/:userId',
      recyclers: '/api/v1/recyclers',
      admin: '/api/v1/admin'
    }
  });
});

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/catalog', catalogRoutes);
router.use('/pickups', pickupRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/recyclers', recyclerRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
