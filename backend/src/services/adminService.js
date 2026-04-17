const Pickup = require('../models/Pickup');
const RecyclerProfile = require('../models/RecyclerProfile');
const User = require('../models/User');

async function getAdminOverview() {
  const [usersByRole, requestStatusCounts, verifiedRecyclers, totalTransactionValue] = await Promise.all([
    User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]),
    Pickup.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]),
    RecyclerProfile.countDocuments(),
    Pickup.aggregate([
      {
        $group: {
          _id: null,
          totalTransactionValue: { $sum: '$totalEstimate' }
        }
      }
    ])
  ]);

  return {
    usersByRole,
    requestStatusCounts,
    verifiedRecyclers,
    totalTransactionValue: totalTransactionValue[0]?.totalTransactionValue || 0
  };
}

module.exports = {
  getAdminOverview
};
