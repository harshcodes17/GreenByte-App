const ApiError = require('./apiError');

function validate(schema, payload) {
  const result = schema.safeParse(payload);

  if (!result.success) {
    throw new ApiError(
      400,
      'Validation failed',
      result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }))
    );
  }

  return result.data;
}

module.exports = validate;
