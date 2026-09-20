const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/auth.middleware');
const { requireAdmin, requirePermission } = require('../middleware/permission.middleware');
const galleryController = require('../controllers/gallery.controller');

// ============================================================
// MULTER CONFIGURATION
// ============================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50 MB to allow videos
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, MP4, and WebM are allowed.'));
    }
  }
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'File too large. Maximum size is 50 MB.' });
    }
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

// Stricter instance for Event Details section images (images only, 5 MB)
const uploadSectionImage = multer({
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

// ============================================================
// PUBLIC ROUTES
// ============================================================

router.get('/', galleryController.listPublicGalleries);

// ============================================================
// ADMIN ROUTES (Authentication + gallery permission required)
// ============================================================

const adminMiddleware = [requireAuth, requireAdmin, requirePermission('gallery')];

router.get('/admin', ...adminMiddleware, galleryController.listAdminGalleries);
router.get('/admin/:eventId', ...adminMiddleware, galleryController.getAdminGallery);
router.post('/', ...adminMiddleware, galleryController.createGallery);
router.put('/:eventId', ...adminMiddleware, galleryController.updateGallery);
router.delete('/:eventId', ...adminMiddleware, galleryController.deleteGallery);

// --- Storage Upload Routes ---
router.post('/:eventId/cover', ...adminMiddleware, upload.single('cover'), handleMulterError, galleryController.uploadCover);
router.post('/:eventId/media', ...adminMiddleware, upload.single('media'), handleMulterError, galleryController.uploadMedia);

const handleSectionImageError = (err, req, res, next) => {
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
router.post('/:eventId/section-image', ...adminMiddleware, uploadSectionImage.single('image'), handleSectionImageError, galleryController.uploadSectionImage);
router.delete('/media/:mediaId', ...adminMiddleware, galleryController.deleteMedia);
router.post('/:eventId/guests/:guestId/photo', ...adminMiddleware, upload.single('photo'), handleMulterError, galleryController.uploadGuestPhoto);
router.post('/:eventId/sponsors/:sponsorId/logo', ...adminMiddleware, upload.single('logo'), handleMulterError, galleryController.uploadSponsorLogo);

router.put('/media/:mediaId', ...adminMiddleware, galleryController.updateMediaMetadata);
router.post('/:eventId/guests', ...adminMiddleware, galleryController.addGuest);
router.put('/guests/:guestId', ...adminMiddleware, galleryController.updateGuest);
router.delete('/guests/:guestId', ...adminMiddleware, galleryController.deleteGuest);
router.post('/:eventId/sponsors', ...adminMiddleware, galleryController.addSponsor);
router.put('/sponsors/:sponsorId', ...adminMiddleware, galleryController.updateSponsor);
router.delete('/sponsors/:sponsorId', ...adminMiddleware, galleryController.deleteSponsor);
router.post('/:eventId/sections', ...adminMiddleware, galleryController.addSection);
router.put('/sections/:sectionId', ...adminMiddleware, galleryController.updateSection);
router.delete('/sections/:sectionId', ...adminMiddleware, galleryController.deleteSection);

// ============================================================
// PUBLIC ROUTE WITH PARAM (must be after /admin)
// ============================================================

router.get('/:eventId', galleryController.getPublicGallery);

module.exports = router;
