// This file defines the health check routes for the API.
// It uses an Express Router to group related endpoints together.
// This keeps the main app.js clean and organized.

const express = require('express');
const router = express.Router();

// Basic health check endpoint
// This helps verify that the API is running correctly.
// Since it will be mounted at '/api', the path here is just '/health'.
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: "IEI Student Chapter API is running"
  });
});

module.exports = router;
