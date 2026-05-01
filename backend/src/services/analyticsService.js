const mongoose = require('mongoose');
const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const Pickup = require('../models/Pickup');
const User = require('../models/User');

async function buildSystemSnapshot(snapshotDate = new Date()) {
  const dayStart = new Date(snapshotDate);
  dayStart.setHours(0, 0, 0, 0);

  const [totalUsers, pickupTotals, topCategories] = await Promise.all([
    User.countDocuments(),
    Pickup.aggregate([
      {
        $group: {
          _id: null,
          totalPickups: { $sum: 1 },
          completedPickups: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          totalEstimatedValue: { $sum: '$totalEstimate' },
          totalWeightKg: { $sum: '$totalWeightKg' },
          totalCo2SavedKg: { $sum: '$impact.co2SavedKg' },
          totalTreesSaved: { $sum: '$impact.treesSaved' },
          totalRawMaterialRecoveredKg: { $sum: '$impact.rawMaterialRecoveredKg' }
        }
      }
    ]),
    Pickup.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.category',
          quantity: { $sum: '$items.quantity' }
        }
      },
      { $sort: { quantity: -1 } },
      { $limit: 5 },
      {
        $project: {
          _id: 0,
          category: '$_id',
          quantity: 1
        }
      }
    ])
  ]);

  const pickupTotal = pickupTotals[0] || {};

  return AnalyticsSnapshot.findOneAndUpdate(
    { snapshotDate: dayStart },
    {
      $set: {
        snapshotDate: dayStart,
        totals: {
          totalUsers,
          totalPickups: pickupTotal.totalPickups || 0,
          completedPickups: pickupTotal.completedPickups || 0,
          totalEstimatedValue: pickupTotal.totalEstimatedValue || 0,
          totalWeightKg: pickupTotal.totalWeightKg || 0,
          totalCo2SavedKg: pickupTotal.totalCo2SavedKg || 0,
          totalTreesSaved: pickupTotal.totalTreesSaved || 0,
          totalRawMaterialRecoveredKg: pickupTotal.totalRawMaterialRecoveredKg || 0
        },
        topCategories
      }
    },
    {
      new: true,
      upsert: true
    }
  ).lean();
}

async function getUserDashboard(userId) {
  const [user, pickupTotals, recentPickups] = await Promise.all([
    User.findById(userId).lean(),
    Pickup.aggregate([
      { $match: { user: mongoose.Types.ObjectId.createFromHexString(userId) } },
      {
        $group: {
          _id: null,
          pickupsCompleted: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          },
          totalWeightKg: { $sum: '$totalWeightKg' },
          totalCo2SavedKg: { $sum: '$impact.co2SavedKg' },
          totalTreesSaved: { $sum: '$impact.treesSaved' },
          totalRawMaterialRecoveredKg: { $sum: '$impact.rawMaterialRecoveredKg' }
        }
      }
    ]),
    Pickup.find({ user: userId }).sort({ createdAt: -1 }).limit(5).lean()
  ]);

  if (!user) {
    return null;
  }

  return {
    user: {
      _id: user._id,
      name: user.name,
      phone: user.phone,
    },
    recentPickups
  };
}

async function getLatestSystemSnapshot() {
  const snapshot = await AnalyticsSnapshot.findOne().sort({ snapshotDate: -1 }).lean();

  if (snapshot) {
    return snapshot;
  }

  return buildSystemSnapshot();
}

module.exports = {
  buildSystemSnapshot,
  getLatestSystemSnapshot,
  getUserDashboard
};
