const mongoose = require('mongoose');

const pickupItemSchema = new mongoose.Schema(
  {
    catalogItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CatalogItem',
      required: true
    },
    category: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    unit: {
      type: String,
      enum: ['pc', 'kg'],
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    weightKg: {
      type: Number,
      default: 0,
      min: 0
    },
    estimatedValue: {
      type: Number,
      required: true,
      min: 0
    },
    condition: {
      type: String,
      default: ''
    },
    yearOfManufacturing: {
      type: Number,
      default: null
    },
    photoUri: {
      type: String,
      default: ''
    }
  },
  { _id: false }
);

const pickupSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    items: {
      type: [pickupItemSchema],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: 'At least one pickup item is required'
      }
    },
    schedule: {
      dateLabel: { type: String, required: true },
      timeLabel: { type: String, default: '' }
    },
    requestMode: {
      type: String,
      enum: ['pickup', 'dropoff'],
      default: 'pickup'
    },
    address: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    notes: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: [
        'submitted',
        'estimated',
        'admin_negotiated',
        'price_accepted',
        'assigned',
        'in_transit',
        'collected',
        'recycled',
        'paid',
        'completed',
        'rejected',
        'cancelled'
      ],
      default: 'submitted',
      index: true
    },
    pricing: {
      estimatedAmount: {
        type: Number,
        required: true,
        min: 0
      },
      negotiatedAmount: {
        type: Number,
        default: null
      },
      acceptedByUser: {
        type: Boolean,
        default: true
      },
      acceptedAt: {
        type: Date,
        default: Date.now
      },
      estimationSource: {
        type: String,
        default: 'rule-based-v1'
      },
      estimationReasoning: {
        type: String,
        default: ''
      }
    },
    totalEstimate: {
      type: Number,
      required: true,
      min: 0
    },
    totalWeightKg: {
      type: Number,
      required: true,
      min: 0
    },
    impact: {
      co2SavedKg: { type: Number, required: true },
      treesSaved: { type: Number, required: true },
      rawMaterialRecoveredKg: { type: Number, required: true }
    },
    recyclerAssignment: {
      recycler: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      recyclerName: {
        type: String,
        default: ''
      },
      recyclerPhone: {
        type: String,
        default: ''
      },
      assignedAt: {
        type: Date,
        default: null
      }
    },
    recyclerDecisions: [
      {
        recycler: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        recyclerName: String,
        decision: {
          type: String,
          enum: ['accepted', 'rejected']
        },
        note: {
          type: String,
          default: ''
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ],
    payment: {
      status: {
        type: String,
        enum: ['pending', 'processing', 'paid'],
        default: 'pending'
      },
      amount: {
        type: Number,
        required: true,
        min: 0
      },
      method: {
        type: String,
        default: 'bank_transfer'
      },
      paidAt: {
        type: Date,
        default: null
      }
    },
    activityLog: [
      {
        status: String,
        actorRole: String,
        actorId: {
          type: mongoose.Schema.Types.ObjectId,
          default: null
        },
        note: {
          type: String,
          default: ''
        },
        createdAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

pickupSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Pickup', pickupSchema);
