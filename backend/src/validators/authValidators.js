const { z } = require('zod');

const phoneSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/\D/g, ''))
  .refine((value) => value.length >= 10 && value.length <= 15, {
    message: 'Phone number must contain 10 to 15 digits'
  });

const roleSchema = z.enum(['customer', 'recycler', 'admin']);

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  role: roleSchema.default('customer'),
  email: z.string().trim().email().optional(),
  address: z.string().trim().max(300).optional(),
  organizationName: z.string().trim().max(120).optional()
});

const loginSchema = z.object({
  phone: phoneSchema,
  role: roleSchema.default('customer')
});

const requestOtpSchema = z.object({
  phone: phoneSchema,
  role: roleSchema.default('customer')
});

const verifyOtpSchema = z.object({
  phone: phoneSchema,
  role: roleSchema.default('customer'),
  otp: z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits')
});

module.exports = {
  loginSchema,
  registerSchema,
  requestOtpSchema,
  verifyOtpSchema,
  roleSchema
};
