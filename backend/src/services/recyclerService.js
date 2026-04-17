const ApiError = require('../utils/apiError');
const RecyclerProfile = require('../models/RecyclerProfile');
const User = require('../models/User');

async function ensureRecycler(recyclerId) {
  const recycler = await User.findById(recyclerId);

  if (!recycler || recycler.role !== 'recycler') {
    throw new ApiError(404, 'Recycler not found');
  }

  return recycler;
}

async function upsertRecyclerProfile(recyclerId, payload) {
  const recycler = await ensureRecycler(recyclerId);

  const profile = await RecyclerProfile.findOneAndUpdate(
    { user: recycler._id },
    {
      $set: {
        user: recycler._id,
        companyName: payload.companyName,
        serviceAreas: payload.serviceAreas || [],
        vehicleType: payload.vehicleType || 'pickup-van',
        pickupCapacityPerDay: payload.pickupCapacityPerDay || 10,
        collectionPoints: payload.collectionPoints || [],
        notes: payload.notes || ''
      }
    },
    {
      new: true,
      upsert: true
    }
  );

  recycler.organizationName = payload.companyName;
  recycler.isVerified = true;
  await recycler.save();

  return profile;
}

async function getRecyclerProfile(recyclerId) {
  await ensureRecycler(recyclerId);

  const profile = await RecyclerProfile.findOne({ user: recyclerId }).populate('user', 'name phone email role organizationName');

  if (!profile) {
    throw new ApiError(404, 'Recycler profile not found');
  }

  return profile;
}

async function updateRecyclerAvailability(recyclerId, availabilityStatus) {
  await ensureRecycler(recyclerId);

  const profile = await RecyclerProfile.findOneAndUpdate(
    { user: recyclerId },
    {
      $set: { availabilityStatus }
    },
    {
      new: true
    }
  );

  if (!profile) {
    throw new ApiError(404, 'Recycler profile not found');
  }

  return profile;
}

async function listRecyclerProfiles() {
  return RecyclerProfile.find()
    .sort({ createdAt: -1 })
    .populate('user', 'name phone email role organizationName isVerified')
    .lean();
}

module.exports = {
  upsertRecyclerProfile,
  getRecyclerProfile,
  updateRecyclerAvailability,
  listRecyclerProfiles
};
