const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAdmin, requirePermission } = require('../middleware/permission.middleware');
const eventsController = require('../controllers/events.controller');

// ============================================================
// MULTER CONFIGURATION
// ============================================================

// Use memory storage — files are kept in buffer and forwarded to Supabase Storage.
// No temp files are created on the server.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

// Multer error handler middleware
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Maximum size is 5 MB.' });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  if (err) {
    // Custom error from fileFilter
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

// ============================================================
// PUBLIC ROUTES (No authentication required)
// ============================================================

// GET /api/events — List published events
router.get('/', eventsController.listPublicEvents);

// GET /api/events/:id — Get a single published event
// NOTE: This must be defined AFTER /admin to avoid route conflicts
// (Express matches routes in order; ':id' would match 'admin')

// ============================================================
// ADMIN ROUTES (Authentication + events permission required)
// ============================================================

// Middleware chain for all admin operations:
// requireAuth → requireAdmin → requirePermission('events')
const adminMiddleware = [requireAuth, requireAdmin, requirePermission('events')];

// GET /api/events/admin — List all events (admin view, includes draft/archived)
router.get('/admin', ...adminMiddleware, eventsController.listAdminEvents);

// POST /api/events — Create a new event
router.post('/', ...adminMiddleware, eventsController.createEvent);

// PUT /api/events/:id — Update an event
router.put('/:id', ...adminMiddleware, eventsController.updateEvent);

// DELETE /api/events/:id — Archive (soft-delete) an event
router.delete('/:id', ...adminMiddleware, eventsController.deleteEvent);

// POST /api/events/:id/poster — Upload/replace event poster
router.post('/:id/poster', ...adminMiddleware, upload.single('poster'), handleMulterError, eventsController.uploadPoster);

// DELETE /api/events/:id/poster — Remove event poster
router.delete('/:id/poster', ...adminMiddleware, eventsController.removePoster);

// ============================================================
// LIFECYCLE ROUTES (Admin only)
// ============================================================

// GET /api/events/lifecycle/dry-run — Preview which events would transition
router.get('/lifecycle/dry-run', ...adminMiddleware, eventsController.dryRunLifecycle);

// POST /api/events/lifecycle/execute — Execute lifecycle transition
router.post('/lifecycle/execute', ...adminMiddleware, eventsController.executeEventLifecycle);

// ============================================================
// PUBLIC ROUTE WITH PARAM (must be after /admin)
// ============================================================

// GET /api/events/:id/sections — Rich detail sections (no gallery required)
router.get('/:id/sections', eventsController.getEventSections);

// GET /api/events/:id — Get a single published event
router.get('/:id', eventsController.getPublicEvent);

module.exports = router;
