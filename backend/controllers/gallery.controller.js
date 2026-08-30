const galleryService = require('../services/gallery.service');

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function handleDbError(res, error, defaultMessage = 'Failed to perform operation') {
  if (error.code === '23505') { 
    return res.status(400).json({ success: false, message: 'A gallery already exists for this event.' });
  }
  if (error.code === 'PGRST116') {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }
  if (error.code === 'NOT_FOUND') {
    return res.status(404).json({ success: false, message: error.message });
  }
  console.error('Database error:', error);
  return res.status(500).json({ success: false, message: defaultMessage });
}

// ============================================================
// PUBLIC CONTROLLERS
// ============================================================

async function listPublicGalleries(req, res) {
  try {
    const { category, limit, offset } = req.query;


    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    const { data, error } = await galleryService.getPublicGalleries({
      category: category || 'all',
      limit: parsedLimit,
      offset: parsedOffset
    });

    if (error) return handleDbError(res, error, 'Failed to retrieve galleries');

    return res.json({ success: true, galleries: data });
  } catch (error) {
    console.error('Unexpected error in listPublicGalleries:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function getPublicGallery(req, res) {
  try {
    const { eventId } = req.params;
    if (!isValidUUID(eventId)) return res.status(400).json({ success: false, message: 'Invalid event ID format' });

    const { data, error } = await galleryService.getPublicGalleryByEventId(eventId);
    if (error) return handleDbError(res, error, 'Failed to retrieve gallery');

    return res.json({ success: true, ...data });
  } catch (error) {
    console.error('Unexpected error in getPublicGallery:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

// ============================================================
// ADMIN CONTROLLERS
// ============================================================

async function listAdminGalleries(req, res) {
  try {
    const { data, error } = await galleryService.getAllGalleriesAdmin();
    if (error) return handleDbError(res, error, 'Failed to retrieve galleries');
    return res.json({ success: true, galleries: data });
  } catch (error) {
    console.error('Unexpected error in listAdminGalleries:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function getAdminGallery(req, res) {
  try {
    const { eventId } = req.params;
    if (!isValidUUID(eventId)) return res.status(400).json({ success: false, message: 'Invalid event ID format' });

    const { data, error } = await galleryService.getGalleryByEventIdAdmin(eventId);
    if (error) return handleDbError(res, error, 'Failed to retrieve gallery');

    return res.json({ success: true, ...data });
  } catch (error) {
    console.error('Unexpected error in getAdminGallery:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function createGallery(req, res) {
  try {
    const { event_id } = req.body;
    if (!event_id || !isValidUUID(event_id)) {
      return res.status(400).json({ success: false, message: 'Valid event_id is required' });
    }

    const { data, error } = await galleryService.createGallery(req.body);
    if (error) return handleDbError(res, error, 'Failed to create gallery');

    return res.status(201).json({ success: true, message: 'Gallery created successfully', gallery: data });
  } catch (error) {
    console.error('Unexpected error in createGallery:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function updateGallery(req, res) {
  try {
    const { eventId } = req.params;
    if (!isValidUUID(eventId)) return res.status(400).json({ success: false, message: 'Invalid event ID format' });

    const { data, error } = await galleryService.updateGallery(eventId, req.body);
    if (error) return handleDbError(res, error, 'Failed to update gallery');

    return res.json({ success: true, message: 'Gallery updated successfully', gallery: data });
  } catch (error) {
    console.error('Unexpected error in updateGallery:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function deleteGallery(req, res) {
  try {
    const { eventId } = req.params;
    if (!isValidUUID(eventId)) return res.status(400).json({ success: false, message: 'Invalid event ID format' });

    const { data, error } = await galleryService.deleteGallery(eventId);
    if (error) return handleDbError(res, error, 'Failed to delete gallery');

    return res.json({ success: true, message: 'Gallery deleted successfully', gallery: data });
  } catch (error) {
    console.error('Unexpected error in deleteGallery:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

// ============================================================
// STORAGE UPLOAD CONTROLLERS
// ============================================================

async function uploadCover(req, res) {
  try {
    const { eventId } = req.params;
    if (!isValidUUID(eventId)) return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { data, error } = await galleryService.uploadCover(eventId, req.file.buffer, req.file.originalname, req.file.mimetype);
    if (error) return handleDbError(res, error, 'Failed to upload cover');

    return res.json({ success: true, message: 'Cover uploaded successfully', gallery: data });
  } catch (error) {
    console.error('Unexpected error in uploadCover:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function uploadMedia(req, res) {
  try {
    const { eventId } = req.params;
    if (!isValidUUID(eventId)) return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { data, error } = await galleryService.uploadMedia(eventId, req.file.buffer, req.file.originalname, req.file.mimetype, req.body);
    if (error) return handleDbError(res, error, 'Failed to upload media');

    return res.json({ success: true, message: 'Media uploaded successfully', media: data });
  } catch (error) {
    console.error('Unexpected error in uploadMedia:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function deleteMedia(req, res) {
  try {
    const { mediaId } = req.params;
    if (!isValidUUID(mediaId)) return res.status(400).json({ success: false, message: 'Invalid media ID format' });

    const { data, error } = await galleryService.deleteMedia(mediaId);
    if (error) return handleDbError(res, error, 'Failed to delete media');

    return res.json({ success: true, message: 'Media deleted successfully', media: data });
  } catch (error) {
    console.error('Unexpected error in deleteMedia:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function uploadGuestPhoto(req, res) {
  try {
    const { eventId, guestId } = req.params;
    if (!isValidUUID(eventId) || !isValidUUID(guestId)) return res.status(400).json({ success: false, message: 'Invalid ID format' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { data, error } = await galleryService.uploadGuestPhoto(eventId, guestId, req.file.buffer, req.file.originalname, req.file.mimetype);
    if (error) return handleDbError(res, error, 'Failed to upload guest photo');

    return res.json({ success: true, message: 'Guest photo uploaded successfully', guest: data });
  } catch (error) {
    console.error('Unexpected error in uploadGuestPhoto:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function uploadSponsorLogo(req, res) {
  try {
    const { eventId, sponsorId } = req.params;
    if (!isValidUUID(eventId) || !isValidUUID(sponsorId)) return res.status(400).json({ success: false, message: 'Invalid ID format' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { data, error } = await galleryService.uploadSponsorLogo(eventId, sponsorId, req.file.buffer, req.file.originalname, req.file.mimetype);
    if (error) return handleDbError(res, error, 'Failed to upload sponsor logo');

  return res.json({ success: true, message: 'Sponsor logo uploaded successfully', sponsor: data });
  } catch (error) {
    console.error('Unexpected error in uploadSponsorLogo:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function updateMediaMetadata(req, res) {
  try {
    const { mediaId } = req.params;
    const { data, error } = await galleryService.updateMedia(mediaId, req.body);
    if (error) return handleDbError(res, error, 'Failed to update media');
    return res.json({ success: true, message: 'Media updated', media: data });
  } catch (err) { return res.status(500).json({ success: false, message: 'Unexpected error' }); }
}

async function addGuest(req, res) {
  try {
    const { eventId } = req.params;
    const { data, error } = await galleryService.addGuest(eventId, req.body);
    if (error) return handleDbError(res, error, 'Failed to add guest');
    return res.json({ success: true, message: 'Guest added', guest: data });
  } catch (err) { return res.status(500).json({ success: false, message: 'Unexpected error' }); }
}

async function updateGuest(req, res) {
  try {
    const { guestId } = req.params;
    const { data, error } = await galleryService.updateGuest(guestId, req.body);
    if (error) return handleDbError(res, error, 'Failed to update guest');
    return res.json({ success: true, message: 'Guest updated', guest: data });
  } catch (err) { return res.status(500).json({ success: false, message: 'Unexpected error' }); }
}

async function deleteGuest(req, res) {
  try {
    const { guestId } = req.params;
    const { data, error } = await galleryService.deleteGuest(guestId);
    if (error) return handleDbError(res, error, 'Failed to delete guest');
    return res.json({ success: true, message: 'Guest deleted' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Unexpected error' }); }
}

async function addSponsor(req, res) {
  try {
    const { eventId } = req.params;
    const { data, error } = await galleryService.addSponsor(eventId, req.body);
    if (error) return handleDbError(res, error, 'Failed to add sponsor');
    return res.json({ success: true, message: 'Sponsor added', sponsor: data });
  } catch (err) { return res.status(500).json({ success: false, message: 'Unexpected error' }); }
}

async function updateSponsor(req, res) {
  try {
    const { sponsorId } = req.params;
    const { data, error } = await galleryService.updateSponsor(sponsorId, req.body);
    if (error) return handleDbError(res, error, 'Failed to update sponsor');
    return res.json({ success: true, message: 'Sponsor updated', sponsor: data });
  } catch (err) { return res.status(500).json({ success: false, message: 'Unexpected error' }); }
}

async function deleteSponsor(req, res) {
  try {
    const { sponsorId } = req.params;
    const { data, error } = await galleryService.deleteSponsor(sponsorId);
    if (error) return handleDbError(res, error, 'Failed to delete sponsor');
    return res.json({ success: true, message: 'Sponsor deleted' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Unexpected error' }); }
}

async function addSection(req, res) {
  try {
    const { eventId } = req.params;
    const { data, error } = await galleryService.addSection(eventId, req.body);
    if (error) return handleDbError(res, error, 'Failed to add section');
    return res.json({ success: true, message: 'Section added', section: data });
  } catch (err) { return res.status(500).json({ success: false, message: 'Unexpected error' }); }
}

async function updateSection(req, res) {
  try {
    const { sectionId } = req.params;
    const { data, error } = await galleryService.updateSection(sectionId, req.body);
    if (error) return handleDbError(res, error, 'Failed to update section');
    return res.json({ success: true, message: 'Section updated', section: data });
  } catch (err) { return res.status(500).json({ success: false, message: 'Unexpected error' }); }
}

async function deleteSection(req, res) {
  try {
    const { sectionId } = req.params;
    const { data, error } = await galleryService.deleteSection(sectionId);
    if (error) return handleDbError(res, error, 'Failed to delete section');
    return res.json({ success: true, message: 'Section deleted' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Unexpected error' }); }
}

module.exports = {
  listPublicGalleries,
  getPublicGallery,
  listAdminGalleries,
  getAdminGallery,
  createGallery,
  updateGallery,
  deleteGallery,
  uploadCover,
  uploadMedia,
  deleteMedia,
  uploadGuestPhoto,
  uploadSponsorLogo,
  updateMediaMetadata,
  addGuest,
  updateGuest,
  deleteGuest,
  addSponsor,
  updateSponsor,
  deleteSponsor,
  addSection,
  updateSection,
  deleteSection
};
