const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAdmin, requirePermission } = require('../middleware/permission.middleware');
const teamController = require('../controllers/team.controller');

// ============================================================
// MULTER CONFIGURATION
// ============================================================

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

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Maximum size is 5 MB.' });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

// ============================================================
// PUBLIC ROUTES
// ============================================================

router.get('/team', teamController.getPublicTeam);

// ============================================================
// ADMIN ROUTES (Authentication + team permission required)
// ============================================================

const adminMiddleware = [requireAuth, requireAdmin, requirePermission('team')];

// --- Teams CRUD ---
router.get('/admin/teams', ...adminMiddleware, teamController.listAdminTeams);
router.get('/admin/teams/:id', ...adminMiddleware, teamController.getAdminTeam);
router.post('/admin/teams', ...adminMiddleware, teamController.createTeam);
router.put('/admin/teams/:id', ...adminMiddleware, teamController.updateTeam);
router.patch('/admin/teams/:id/archive', ...adminMiddleware, teamController.archiveTeam);

// --- Lead Management ---
router.put('/admin/teams/:id/lead/:memberId', ...adminMiddleware, teamController.assignTeamLead);
router.delete('/admin/teams/:id/lead', ...adminMiddleware, teamController.removeTeamLead);

// --- Team Members CRUD ---
router.get('/admin/team-members', ...adminMiddleware, teamController.listAdminMembers);
router.get('/admin/team-members/:id', ...adminMiddleware, teamController.getAdminMember);
router.post('/admin/team-members', ...adminMiddleware, teamController.createMember);
router.put('/admin/team-members/:id', ...adminMiddleware, teamController.updateMember);
router.patch('/admin/team-members/:id/archive', ...adminMiddleware, teamController.archiveMember);

// --- Photo Management ---
router.post('/admin/team-members/:id/photo', ...adminMiddleware, upload.single('photo'), handleMulterError, teamController.uploadPhoto);
router.delete('/admin/team-members/:id/photo', ...adminMiddleware, teamController.removePhoto);

module.exports = router;
