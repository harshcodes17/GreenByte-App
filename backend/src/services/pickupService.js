const ApiError = require('../utils/apiError');
const CatalogItem = require('../models/CatalogItem');
const Pickup = require('../models/Pickup');
const User = require('../models/User');
const { calculateImpactFromWeight, round } = require('../utils/calculatePickupMetrics');

function appendActivity(pickup, { status, actorRole, actorId = null, note = '' }) {
  pickup.activityLog.push({
    status,
    actorRole,
    actorId,
    note
  });
}

async function resolveCatalogItem(input) {
  if (input.catalogItemId) {
    return CatalogItem.findOne({ _id: input.catalogItemId, isActive: true });
  }

  return CatalogItem.findOne({
    category: input.category,
    name: input.name,
    isActive: true
  });
}

async function normalizePickupItems(items) {
  const normalized = [];

  for (const item of items) {
    const catalogItem = await resolveCatalogItem(item);

    if (!catalogItem) {
      throw new ApiError(404, `Catalog item not found for ${item.name || item.catalogItemId}`);
    }

    const weightKg =
      catalogItem.unit === 'kg'
        ? round(item.quantity * (item.weightKg || 0))
        : round(item.quantity * catalogItem.approximateWeightKg);

    if (catalogItem.unit === 'kg' && !item.weightKg) {
      throw new ApiError(400, `weightKg is required for ${catalogItem.name}`);
    }

    const estimatedValue =
      catalogItem.unit === 'kg'
        ? round(item.quantity * item.weightKg * catalogItem.price)
        : round(item.quantity * catalogItem.price);

    normalized.push({
      catalogItem: catalogItem._id,
      category: catalogItem.category,
      name: catalogItem.name,
      unit: catalogItem.unit,
      price: catalogItem.price,
      quantity: item.quantity,
      weightKg,
      estimatedValue
    });
  }

  return normalized;
}

function summarizePickupItems(items) {
  const totalEstimate = round(items.reduce((sum, item) => sum + item.estimatedValue, 0));
  const totalWeightKg = round(items.reduce((sum, item) => sum + item.weightKg, 0));
  const impact = calculateImpactFromWeight(totalWeightKg);

  return {
    totalEstimate,
    totalWeightKg,
    impact
  };
}

async function estimatePickup(items) {
  const normalizedItems = await normalizePickupItems(items);
  const totals = summarizePickupItems(normalizedItems);

  return {
    items: normalizedItems,
    ...totals
  };
}

async function createPickup(payload) {
  const user = await User.findById(payload.userId);

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  if (user.role !== 'customer') {
    throw new ApiError(400, 'Only customer accounts can create pickup requests');
  }

  const estimate = await estimatePickup(payload.items);

  const pickup = new Pickup({
    user: payload.userId,
    items: estimate.items,
    schedule: payload.schedule,
    requestMode: payload.requestMode || 'pickup',
    address: payload.address,
    phone: payload.phone,
    notes: payload.notes || '',
    status: 'submitted',
    pricing: {
      estimatedAmount: estimate.totalEstimate,
      acceptedByUser: payload.acceptEstimatedPrice !== false,
      acceptedAt: new Date(),
      estimationSource: 'rule-based-v1'
    },
    totalEstimate: estimate.totalEstimate,
    totalWeightKg: estimate.totalWeightKg,
    impact: estimate.impact,
    payment: {
      status: 'pending',
      amount: estimate.totalEstimate,
      method: payload.paymentMethod || 'bank_transfer'
    }
  });

  appendActivity(pickup, {
    status: 'submitted',
    actorRole: 'customer',
    actorId: user._id,
    note: 'Pickup request created by customer'
  });

  await pickup.save();

  return pickup;
}

async function listUserPickups(userId) {
  const pickups = await Pickup.find({ user: userId }).sort({ createdAt: -1 }).lean();
  return pickups;
}

async function updatePickupStatus(pickupId, status) {
  const pickup = await Pickup.findById(pickupId);

  if (!pickup) {
    throw new ApiError(404, 'Pickup not found');
  }

  const previousStatus = pickup.status;
  pickup.status = status;

  if (status === 'paid') {
    pickup.payment.status = 'paid';
    pickup.payment.paidAt = new Date();
  } else if (status === 'recycled' && pickup.payment.status === 'pending') {
    pickup.payment.status = 'processing';
  }

  if ((status === 'completed' || status === 'paid') && !pickup.coinsCreditedAt) {
    await User.findByIdAndUpdate(pickup.user, {
      $inc: { coinsBalance: pickup.impact.coinsEarned }
    });
    pickup.coinsCreditedAt = new Date();
  }

  if (
    (previousStatus === 'completed' || previousStatus === 'paid') &&
    status !== 'completed' &&
    status !== 'paid' &&
    pickup.coinsCreditedAt
  ) {
    await User.findByIdAndUpdate(pickup.user, {
      $inc: { coinsBalance: -pickup.impact.coinsEarned }
    });
    pickup.coinsCreditedAt = null;
  }

  appendActivity(pickup, {
    status,
    actorRole: 'system',
    note: 'Pickup status updated'
  });

  await pickup.save();

  return pickup;
}

async function listRecyclerQueue(recyclerId, scope = 'open') {
  const recycler = await User.findById(recyclerId);

  if (!recycler || recycler.role !== 'recycler') {
    throw new ApiError(404, 'Recycler not found');
  }

  const query =
    scope === 'assigned'
      ? {
          'recyclerAssignment.recycler': recycler._id,
          status: { $in: ['assigned', 'in_transit', 'collected', 'recycled', 'paid', 'completed'] }
        }
      : {
          status: { $in: ['submitted', 'estimated', 'price_accepted'] },
          'recyclerAssignment.recycler': null
        };

  return Pickup.find(query).sort({ createdAt: -1 }).lean();
}

async function decideRecyclerRequest(recyclerId, pickupId, decision, note = '') {
  const [recycler, pickup] = await Promise.all([User.findById(recyclerId), Pickup.findById(pickupId)]);

  if (!recycler || recycler.role !== 'recycler') {
    throw new ApiError(404, 'Recycler not found');
  }

  if (!pickup) {
    throw new ApiError(404, 'Pickup request not found');
  }

  pickup.recyclerDecisions.push({
    recycler: recycler._id,
    recyclerName: recycler.name,
    decision: decision === 'accept' ? 'accepted' : 'rejected',
    note
  });

  if (decision === 'accept') {
    pickup.status = 'assigned';
    pickup.recyclerAssignment = {
      recycler: recycler._id,
      recyclerName: recycler.name,
      recyclerPhone: recycler.phone,
      assignedAt: new Date()
    };

    appendActivity(pickup, {
      status: 'assigned',
      actorRole: 'recycler',
      actorId: recycler._id,
      note: note || 'Recycler accepted the request'
    });
  } else {
    appendActivity(pickup, {
      status: pickup.status,
      actorRole: 'recycler',
      actorId: recycler._id,
      note: note || 'Recycler rejected the request'
    });
  }

  await pickup.save();
  return pickup;
}

async function advanceRecyclerRequest(recyclerId, pickupId, status, note = '') {
  const [recycler, pickup] = await Promise.all([User.findById(recyclerId), Pickup.findById(pickupId)]);

  if (!recycler || recycler.role !== 'recycler') {
    throw new ApiError(404, 'Recycler not found');
  }

  if (!pickup) {
    throw new ApiError(404, 'Pickup request not found');
  }

  if (String(pickup.recyclerAssignment.recycler || '') !== String(recycler._id)) {
    throw new ApiError(403, 'This request is not assigned to the provided recycler');
  }

  pickup.status = status;

  if (status === 'paid') {
    pickup.payment.status = 'paid';
    pickup.payment.paidAt = new Date();
  } else if (status === 'recycled' && pickup.payment.status === 'pending') {
    pickup.payment.status = 'processing';
  }

  if ((status === 'completed' || status === 'paid') && !pickup.coinsCreditedAt) {
    await User.findByIdAndUpdate(pickup.user, {
      $inc: { coinsBalance: pickup.impact.coinsEarned }
    });
    pickup.coinsCreditedAt = new Date();
  }

  appendActivity(pickup, {
    status,
    actorRole: 'recycler',
    actorId: recycler._id,
    note: note || `Recycler moved request to ${status}`
  });

  await pickup.save();
  return pickup;
}

async function listAllRequests(filters = {}) {
  const query = {};

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.requestMode) {
    query.requestMode = filters.requestMode;
  }

  return Pickup.find(query)
    .sort({ createdAt: -1 })
    .populate('user', 'name phone role')
    .populate('recyclerAssignment.recycler', 'name phone')
    .lean();
}

module.exports = {
  estimatePickup,
  createPickup,
  listUserPickups,
  updatePickupStatus,
  listRecyclerQueue,
  decideRecyclerRequest,
  advanceRecyclerRequest,
  listAllRequests
};
