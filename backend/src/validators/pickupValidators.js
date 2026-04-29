const { z } = require('zod');

const objectIdSchema = z.string().trim().regex(/^[a-f0-9]{24}$/i, 'Invalid MongoDB id');
const statusSchema = z.enum([
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
]);

const pickupItemSchema = z
  .object({
    catalogItemId: objectIdSchema.optional(),
    category: z.string().trim().optional(),
    name: z.string().trim().optional(),
    quantity: z.coerce.number().int().min(1),
    weightKg: z.coerce.number().positive().optional(),
    condition: z.string().optional(),
    photoUri: z.string().optional()
  })
  .refine((value) => value.catalogItemId || (value.category && value.name), {
    message: 'Either catalogItemId or category + name is required'
  });

const estimatePickupSchema = z.object({
  items: z.array(pickupItemSchema).min(1, 'Add at least one item')
});

const createPickupSchema = estimatePickupSchema.extend({
  userId: objectIdSchema,
  schedule: z.object({
    dateLabel: z.string().trim().min(1, 'Pickup date is required'),
    timeLabel: z.string().trim().optional().or(z.literal(''))
  }),
  requestMode: z.enum(['pickup', 'dropoff']).optional(),
  address: z.string().trim().min(5, 'Address is required'),
  phone: z.string().trim().min(10, 'Phone number is required'),
  notes: z.string().trim().max(300).optional(),
  acceptEstimatedPrice: z.boolean().optional(),
  targetRecyclerId: objectIdSchema.optional(),
  paymentMethod: z.enum(['bank_transfer', 'upi', 'wallet']).optional()
});

const pickupListQuerySchema = z.object({
  userId: objectIdSchema
});

const pickupStatusSchema = z.object({
  status: statusSchema
});

const pickupIdParamsSchema = z.object({
  pickupId: objectIdSchema
});

const recyclerQueueQuerySchema = z.object({
  scope: z.enum(['open', 'assigned', 'all']).default('open')
});

const recyclerIdParamsSchema = z.object({
  recyclerId: objectIdSchema,
  pickupId: objectIdSchema.optional()
});

const recyclerDecisionSchema = z.object({
  decision: z.enum(['accept', 'reject']),
  note: z.string().trim().max(240).optional()
});

const recyclerAdvanceSchema = z.object({
  status: z.enum(['assigned', 'in_transit', 'collected', 'recycled', 'paid', 'completed', 'cancelled']),
  note: z.string().trim().max(240).optional()
});

const adminRequestQuerySchema = z.object({
  status: statusSchema.optional(),
  requestMode: z.enum(['pickup', 'dropoff']).optional()
});

module.exports = {
  estimatePickupSchema,
  createPickupSchema,
  pickupListQuerySchema,
  pickupStatusSchema,
  pickupIdParamsSchema,
  recyclerQueueQuerySchema,
  recyclerIdParamsSchema,
  recyclerDecisionSchema,
  recyclerAdvanceSchema,
  adminRequestQuerySchema
};
