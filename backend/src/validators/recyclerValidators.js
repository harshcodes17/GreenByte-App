const { z } = require('zod');

const objectIdSchema = z.string().trim().regex(/^[a-f0-9]{24}$/i, 'Invalid MongoDB id');

const recyclerProfileSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  serviceAreas: z.array(z.string().trim().min(2)).default([]),
  vehicleType: z.string().trim().max(60).optional(),
  pickupCapacityPerDay: z.coerce.number().int().positive().optional(),
  collectionPoints: z.array(z.string().trim().min(2)).default([]),
  notes: z.string().trim().max(300).optional()
});

const recyclerProfileParamsSchema = z.object({
  recyclerId: objectIdSchema
});

const recyclerAvailabilitySchema = z.object({
  availabilityStatus: z.enum(['available', 'busy', 'offline'])
});

module.exports = {
  recyclerProfileSchema,
  recyclerProfileParamsSchema,
  recyclerAvailabilitySchema
};
