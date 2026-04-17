const { z } = require('zod');

const objectIdSchema = z.string().trim().regex(/^[a-f0-9]{24}$/i, 'Invalid MongoDB id');
const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ''))
  .refine((value) => value.length >= 10 && value.length <= 15, {
    message: 'Phone number must contain 10 to 15 digits'
  });

const userIdParamsSchema = z.object({
  userId: objectIdSchema
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: phoneSchema.optional(),
  address: z.string().trim().max(300).optional()
});

module.exports = {
  userIdParamsSchema,
  updateProfileSchema
};
