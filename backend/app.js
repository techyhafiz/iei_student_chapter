// This file configures the Express application
// It sets up middleware (like CORS and JSON parsing) and connects routers.
// Separating app configuration from the server startup logic (in server.js)
// makes the code easier to test and maintain.

const express = require('express');
const cors = require('cors');

// Import the health router
const healthRouter = require('./routes/health.routes');
const supabaseTestRouter = require('./routes/supabase-test.routes');
const authRoutes = require('./routes/auth.routes');

// Initialize the Express app
const app = express();

// Middleware
// Enable Cross-Origin Resource Sharing (CORS) so the frontend can make requests to this backend
app.use(cors());
// Parse incoming JSON requests so we can access the request body (req.body)
app.use(express.json());

const adminRoutes = require('./routes/admin.routes');
const eventsRoutes = require('./routes/events.routes');
const teamRoutes = require('./routes/team.routes');

// Connect the health router to the main app under the '/api' prefix
// This routes all requests starting with '/api' to the appropriate router.
app.use('/api', healthRouter);
app.use('/api', supabaseTestRouter);
app.use('/api/auth', authRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api', teamRoutes);

// Export the configured app so it can be used in server.js
module.exports = app;
