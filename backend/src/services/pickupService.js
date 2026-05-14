const mongoose = require('mongoose');
const ApiError = require('../utils/apiError');
const CatalogItem = require('../models/CatalogItem');
const Pickup = require('../models/Pickup');
const User = require('../models/User');
const { calculateImpactFromWeight, round } = require('../utils/calculatePickupMetrics');
const { estimateWithGemini } = require('./geminiService');

function appendActivity(pickup, { status, actorRole, actorId = null, note = '' }) {
  // Ensure actorId is a valid ObjectId or null to prevent BSON casting errors
  const sanitizedActorId = mongoose.Types.ObjectId.isValid(actorId) ? actorId : null;
  
  pickup.activityLog.push({
    status,
    actorRole,
    actorId: sanitizedActorId,
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
      estimatedValue,
      condition: item.condition || '',
      yearOfManufacturing: item.yearOfManufacturing || null,
      photoUri: item.photoUri || ''
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

  const geminiResult = await estimateWithGemini(normalizedItems, totals.totalEstimate);

  return {
    items: normalizedItems,
    baseEstimate: totals.totalEstimate,
    totalEstimate: geminiResult.estimatedPrice,
    estimationReasoning: geminiResult.reasoning,
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
    items: estimate.items.map((item, idx) => ({
      ...item,
      photoUri: payload.items[idx]?.photoUri || ''
    })),
    schedule: payload.schedule,
    requestMode: payload.requestMode || 'pickup',
    address: payload.address,
    phone: payload.phone,
    notes: payload.notes || '',
    status: 'estimated',
    pricing: {
      estimatedAmount: estimate.totalEstimate,
      acceptedByUser: payload.acceptEstimatedPrice !== false,
      acceptedAt: new Date(),
      estimationSource: 'gemini-api',
      estimationReasoning: estimate.estimationReasoning
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

  if (payload.targetRecyclerId) {
    const recycler = await User.findById(payload.targetRecyclerId);
    if (recycler && recycler.role === 'recycler') {
      pickup.recyclerAssignment = {
        recycler: recycler._id,
        recyclerName: recycler.name,
        recyclerPhone: recycler.phone,
        assignedAt: new Date()
      };
    }
  }

  appendActivity(pickup, {
    status: 'estimated',
    actorRole: 'customer',
    actorId: user._id,
    note: payload.targetRecyclerId ? 'Automatically assigned to selected recycler.' : `Pickup request created. Pending admin approval. (Gemini: ${estimate.estimationReasoning})`
  });

  await pickup.save();

  return pickup;
}

async function listUserPickups(userId) {
  const pickups = await Pickup.find({ user: userId })
    .sort({ createdAt: -1 })
    .populate('recyclerAssignment.recycler', 'name phone')
    .lean();
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

  let query;
  if (scope === 'assigned') {
    query = {
      'recyclerAssignment.recycler': recycler._id,
      status: { $in: ['assigned', 'in_transit', 'collected', 'recycled', 'paid', 'completed'] }
    };
  } else if (scope === 'open') {
    query = {
      status: { $in: ['submitted', 'estimated', 'price_accepted'] },
      'recyclerAssignment.recycler': null
    };
  } else {
    // scope === 'all'
    query = {
      $or: [
        { 'recyclerAssignment.recycler': recycler._id },
        { 
          'recyclerAssignment.recycler': null, 
          status: { $in: ['submitted', 'estimated', 'price_accepted'] } 
        }
      ]
    };
  }

  return Pickup.find(query)
    .sort({ createdAt: -1 })
    .populate('user', 'name phone')
    .lean();
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

  if (['paid', 'completed'].includes(status)) {
    throw new ApiError(403, 'Recyclers cannot mark requests as paid or completed. Only Admins can issue payments.');
  }

  pickup.status = status;

  if (status === 'recycled' && pickup.payment.status === 'pending') {
    pickup.payment.status = 'processing';
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

async function adminAcceptPrice(pickupId, finalPrice, note = '', isNegotiation = false) {
  const pickup = await Pickup.findById(pickupId);
  if (!pickup) throw new ApiError(404, 'Pickup not found');

  if (isNegotiation) {
    pickup.pricing.negotiatedAmount = finalPrice;
    pickup.status = 'admin_negotiated';
    appendActivity(pickup, {
      status: 'admin_negotiated',
      actorRole: 'admin',
      note: note || `Admin proposed a negotiated price of ₹${finalPrice}`
    });
  } else {
    pickup.totalEstimate = finalPrice;
    pickup.pricing.estimatedAmount = finalPrice;
    pickup.status = 'price_accepted';
    appendActivity(pickup, {
      status: 'price_accepted',
      actorRole: 'admin',
      note: note || `Admin scrutinized and approved the price at ₹${finalPrice}`
    });
  }

  await pickup.save();
  return pickup;
}

async function customerRespondNegotiation(pickupId, userId, accept) {
  const pickup = await Pickup.findOne({ _id: pickupId, user: userId });
  if (!pickup) throw new ApiError(404, 'Pickup not found');

  if (pickup.status !== 'admin_negotiated') {
    throw new ApiError(400, 'Pickup is not in negotiation state');
  }

  if (accept) {
    pickup.totalEstimate = pickup.pricing.negotiatedAmount;
    // If a recycler was already assigned, return to 'assigned' status. 
    // Otherwise, move to 'price_accepted' so a recycler can be assigned.
    const wasAssigned = !!(pickup.recyclerAssignment && pickup.recyclerAssignment.recycler);
    pickup.status = wasAssigned ? 'assigned' : 'price_accepted';
    
    appendActivity(pickup, {
      status: pickup.status,
      actorRole: 'customer',
      actorId: userId,
      note: 'Customer accepted the negotiated price'
    });
  } else {
    pickup.status = 'cancelled';
    appendActivity(pickup, {
      status: 'cancelled',
      actorRole: 'customer',
      actorId: userId,
      note: 'Customer rejected the negotiated price and cancelled'
    });
  }

  await pickup.save();
  return pickup;
}

async function adminPayPickup(pickupId, adminId, note = '') {
  const pickup = await Pickup.findById(pickupId);
  if (!pickup) throw new ApiError(404, 'Pickup not found');

  if (pickup.status !== 'recycled') {
    throw new ApiError(400, 'Pickup must be recycled before payment can be issued');
  }

  pickup.status = 'completed';
  pickup.payment.status = 'paid';
  pickup.payment.paidAt = new Date();

  appendActivity(pickup, {
    status: 'completed',
    actorRole: 'admin',
    actorId: adminId,
    note: note || 'Admin processed the payment and completed the pickup'
  });

  await pickup.save();
  return pickup;
}

async function adminAssignRecycler(pickupId, adminId, recyclerId, note = '') {
  const [pickup, recycler] = await Promise.all([
    Pickup.findById(pickupId),
    User.findById(recyclerId)
  ]);

  if (!pickup) throw new ApiError(404, 'Pickup not found');
  if (!recycler || recycler.role !== 'recycler') throw new ApiError(404, 'Recycler not found');

  if (!['submitted', 'estimated', 'price_accepted'].includes(pickup.status)) {
    throw new ApiError(400, 'Pickup is not in an assignable state');
  }

  pickup.status = 'assigned';
  pickup.recyclerAssignment = {
    recycler: recycler._id,
    recyclerName: recycler.name,
    recyclerPhone: recycler.phone,
    assignedAt: new Date()
  };

  appendActivity(pickup, {
    status: 'assigned',
    actorRole: 'admin',
    actorId: adminId,
    note: note || `Admin manually assigned request to recycler: ${recycler.name}`
  });

  await pickup.save();
  return pickup;
}

async function removePickup(pickupId) {
  const pickup = await Pickup.findById(pickupId);
  if (!pickup) {
    throw new ApiError(404, 'Pickup not found');
  }
  
  if (['completed', 'paid'].includes(pickup.status)) {
    throw new ApiError(400, 'Cannot delete a completed pickup');
  }

  await Pickup.findByIdAndDelete(pickupId);
  return { success: true };
}

async function adminForceDeletePickup(pickupId) {
  const pickup = await Pickup.findById(pickupId);
  if (!pickup) {
    throw new ApiError(404, 'Pickup not found');
  }

  await Pickup.findByIdAndDelete(pickupId);
  return { success: true };
}

async function updatePaymentDestination(pickupId, destination) {
  const pickup = await Pickup.findById(pickupId);
  if (!pickup) throw new ApiError(404, 'Pickup not found');

  pickup.payment.destination = {
    ...pickup.payment.destination.toObject(),
    ...destination
  };

  appendActivity(pickup, {
    status: pickup.status,
    actorRole: 'customer',
    note: 'Customer updated payment destination details'
  });

  await pickup.save();
  return pickup;
}

module.exports = {
  estimatePickup,
  createPickup,
  listUserPickups,
  updatePickupStatus,
  listRecyclerQueue,
  decideRecyclerRequest,
  advanceRecyclerRequest,
  listAllRequests,
  adminAcceptPrice,
  removePickup,
  customerRespondNegotiation,
  adminPayPickup,
  adminAssignRecycler,
  adminForceDeletePickup,
  updatePaymentDestination
};
