const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Database errors
  if (err.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry',
      error: 'Resource already exists'
    });
  }

  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference',
      error: 'Referenced resource does not exist'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      error: err.message
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : 'Server error'
  });
};

module.exports = errorHandler;