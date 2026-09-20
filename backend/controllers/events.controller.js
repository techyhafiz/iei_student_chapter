const eventsService = require('../services/events.service');
const eventsLifecycleService = require('../services/events.lifecycle');

// Valid values for category and status
const VALID_CATEGORIES = ['workshop', 'hackathon', 'session', 'drill', 'competition', 'seminar', 'meetup', 'other'];
const VALID_STATUSES = ['draft', 'published', 'archived'];

// ============================================================
// VALIDATION HELPERS
// ============================================================

/**
 * Validate a UUID v4 string format.
 * @param {string} str
 * @returns {boolean}
 */
function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Validate a date string (YYYY-MM-DD).
 * @param {string} str
 * @returns {boolean}
 */
function isValidDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const d = new Date(str + 'T00:00:00Z');
  return !isNaN(d.getTime());
}

/**
 * Validate a datetime string (ISO 8601 / TIMESTAMPTZ).
 * Supports: 2026-09-25T18:30:00+05:30, 2026-09-25T18:30:00Z, 2026-09-25, etc.
 * @param {string} str
 * @returns {boolean}
 */
function isValidDateTime(str) {
  const d = new Date(str);
  return !isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}(T|$)/.test(str);
}

/**
 * Validate a time string (HH:MM or HH:MM:SS).
 * @param {string} str
 * @returns {boolean}
 */
function isValidTime(str) {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(str);
}

/**
 * Validate event input fields for create/update.
 * Returns an array of error messages (empty = valid).
 * @param {Object} data - Request body
 * @param {boolean} isCreate - true for create, false for update
 * @returns {string[]} Array of validation error messages
 */
function validateEventData(data, isCreate = true) {
  const errors = [];

  // Title
  if (isCreate) {
    if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Title is required');
    } else if (data.title.trim().length > 200) {
      errors.push('Title must be 200 characters or fewer');
    }
  } else if (data.title !== undefined) {
    if (typeof data.title !== 'string' || data.title.trim().length === 0) {
      errors.push('Title cannot be empty');
    } else if (data.title.trim().length > 200) {
      errors.push('Title must be 200 characters or fewer');
    }
  }

  // Description
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      errors.push('Description must be a string');
    } else if (data.description.length > 5000) {
      errors.push('Description must be 5000 characters or fewer');
    }
  }

  // Category
  if (data.category !== undefined && data.category !== null) {
    if (!VALID_CATEGORIES.includes(data.category)) {
      errors.push(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }
  }

  // Event date
  if (data.event_date !== undefined && data.event_date !== null) {
    if (!isValidDate(data.event_date)) {
      errors.push('Event date must be a valid date in YYYY-MM-DD format');
    }
  }

  // Start time
  if (data.start_time !== undefined && data.start_time !== null) {
    if (!isValidTime(data.start_time)) {
      errors.push('Start time must be a valid time in HH:MM or HH:MM:SS format');
    }
  }

  // End time
  if (data.end_time !== undefined && data.end_time !== null) {
    if (!isValidTime(data.end_time)) {
      errors.push('End time must be a valid time in HH:MM or HH:MM:SS format');
    }
  }

  // End time should be >= start time when both are provided
  if (data.start_time && data.end_time && isValidTime(data.start_time) && isValidTime(data.end_time)) {
    if (data.end_time < data.start_time) {
      errors.push('End time must be equal to or after start time');
    }
  }

  // Location
  if (data.location !== undefined && data.location !== null) {
    if (typeof data.location !== 'string') {
      errors.push('Location must be a string');
    } else if (data.location.length > 500) {
      errors.push('Location must be 500 characters or fewer');
    }
  }

  // Status
  if (data.status !== undefined && data.status !== null) {
    if (!VALID_STATUSES.includes(data.status)) {
      errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
    }
  }

  // Featured
  if (data.featured !== undefined && data.featured !== null) {
    if (typeof data.featured !== 'boolean') {
      errors.push('Featured must be a boolean');
    }
  }

  // Display order
  if (data.display_order !== undefined && data.display_order !== null) {
    if (!Number.isInteger(data.display_order)) {
      errors.push('Display order must be an integer');
    }
  }

  // Registration enabled
  if (data.registration_enabled !== undefined && data.registration_enabled !== null) {
    if (typeof data.registration_enabled !== 'boolean') {
      errors.push('Registration enabled must be a boolean');
    }
  }

  // Registration deadline
  if (data.registration_deadline !== undefined && data.registration_deadline !== null) {
    if (!isValidDateTime(data.registration_deadline)) {
      errors.push('Registration deadline must be a valid ISO 8601 datetime');
    }
  }

  // Registration URL (optional: absent, null, or empty string all mean "no URL")
  if (data.registration_url !== undefined && data.registration_url !== null && data.registration_url !== "") {
    if (typeof data.registration_url !== 'string') {
      errors.push('Registration URL must be a string');
    } else if (data.registration_url.length > 500) {
      errors.push('Registration URL must be 500 characters or fewer');
    } else if (!/^https?:\/\/.+/.test(data.registration_url)) {
      errors.push('Registration URL must start with http:// or https://');
    }
  }

  // Event countdown enabled
  if (data.event_countdown_enabled !== undefined && data.event_countdown_enabled !== null) {
    if (typeof data.event_countdown_enabled !== 'boolean') {
      errors.push('Event countdown enabled must be a boolean');
    }
  }

  // Event countdown at
  if (data.event_countdown_at !== undefined && data.event_countdown_at !== null) {
    if (!isValidDateTime(data.event_countdown_at)) {
      errors.push('Event countdown date must be a valid ISO 8601 datetime');
    }
  }

  return errors;
}

// ============================================================
// PUBLIC CONTROLLERS
// ============================================================

/**
 * GET /api/events
 * Public: List published events with optional filters.
 */
async function listPublicEvents(req, res) {
  try {
    const { category, featured, limit, offset } = req.query;

    // Validate query params
    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` });
    }

    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;

    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({ success: false, message: 'Limit must be between 1 and 100' });
    }
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      return res.status(400).json({ success: false, message: 'Offset must be 0 or greater' });
    }

    const { data, error } = await eventsService.getPublishedEvents({
      category,
      featured,
      limit: parsedLimit,
      offset: parsedOffset
    });

    if (error) {
      console.error('Error fetching published events:', error);
      return res.status(500).json({ success: false, message: 'Failed to retrieve events' });
    }

    return res.json({ success: true, events: data });
  } catch (error) {
    console.error('Unexpected error in listPublicEvents:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

/**
 * GET /api/events/:id
 * Public: Get a single published event by ID.
 */
async function getPublicEvent(req, res) {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const { data, error } = await eventsService.getPublishedEventById(id);

    if (error) {
      console.error('Error fetching event:', error);
      return res.status(500).json({ success: false, message: 'Failed to retrieve event' });
    }

    if (!data) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    return res.json({ success: true, event: data });
  } catch (error) {
    console.error('Unexpected error in getPublicEvent:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

/**
 * GET /api/events/:id/sections
 * Public: Get rich detail sections for a published event.
 * Reads event_sections directly — no gallery required.
 */
async function getEventSections(req, res) {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const { data, error } = await eventsService.getEventSections(id);

    if (error) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
      console.error('Error fetching event sections:', error);
      return res.status(500).json({ success: false, message: 'Failed to retrieve event sections' });
    }

    return res.json({ success: true, sections: data });
  } catch (error) {
    console.error('Unexpected error in getEventSections:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

// ============================================================
// ADMIN CONTROLLERS
// ============================================================

/**
 * GET /api/events/admin
 * Admin: List all events (including draft/archived).
 */
async function listAdminEvents(req, res) {
  try {
    const { data, error } = await eventsService.getAllEventsAdmin();

    if (error) {
      console.error('Error fetching admin events:', error);
      return res.status(500).json({ success: false, message: 'Failed to retrieve events' });
    }

    return res.json({ success: true, events: data });
  } catch (error) {
    console.error('Unexpected error in listAdminEvents:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

/**
 * POST /api/events
 * Admin: Create a new event.
 */
async function createEvent(req, res) {
  try {
    const validationErrors = validateEventData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join('; ') });
    }

    // Trim title
    const eventData = {
      ...req.body,
      title: req.body.title.trim()
    };

    const { data, error } = await eventsService.createEvent(eventData, req.admin.id);

    if (error) {
      console.error('Error creating event:', error);
      return res.status(500).json({ success: false, message: 'Failed to create event' });
    }

    return res.status(201).json({ success: true, message: 'Event created successfully', event: data });
  } catch (error) {
    console.error('Unexpected error in createEvent:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

/**
 * PUT /api/events/:id
 * Admin: Update an existing event.
 */
async function updateEvent(req, res) {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const validationErrors = validateEventData(req.body, false);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join('; ') });
    }

    // Trim title if provided
    const updateData = { ...req.body };
    if (updateData.title) {
      updateData.title = updateData.title.trim();
    }

    const { data, error } = await eventsService.updateEvent(id, updateData);

    if (error) {
      // Supabase returns PGRST116 when .single() finds no rows
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
      console.error('Error updating event:', error);
      return res.status(500).json({ success: false, message: 'Failed to update event' });
    }

    return res.json({ success: true, message: 'Event updated successfully', event: data });
  } catch (error) {
    console.error('Unexpected error in updateEvent:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

/**
 * DELETE /api/events/:id
 * Admin: Archive (soft-delete) an event.
 */
async function deleteEvent(req, res) {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const { data, error } = await eventsService.archiveEvent(id);

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
      console.error('Error archiving event:', error);
      return res.status(500).json({ success: false, message: 'Failed to archive event' });
    }

    return res.json({ success: true, message: 'Event archived successfully', event: data });
  } catch (error) {
    console.error('Unexpected error in deleteEvent:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

// ============================================================
// POSTER CONTROLLERS
// ============================================================

/**
 * POST /api/events/:id/poster
 * Admin: Upload or replace an event poster.
 */
async function uploadPoster(req, res) {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No poster file provided' });
    }

    const { data, error } = await eventsService.uploadPoster(
      id,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    if (error) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
      console.error('Error uploading poster:', error);
      return res.status(500).json({ success: false, message: 'Failed to upload poster' });
    }

    return res.json({
      success: true,
      message: 'Poster uploaded successfully',
      poster: data
    });
  } catch (error) {
    console.error('Unexpected error in uploadPoster:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

/**
 * DELETE /api/events/:id/poster
 * Admin: Remove an event poster.
 */
async function removePoster(req, res) {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ success: false, message: 'Invalid event ID format' });
    }

    const { data, error } = await eventsService.removePoster(id);

    if (error) {
      if (error.code === 'NOT_FOUND') {
        return res.status(404).json({ success: false, message: 'Event not found' });
      }
      if (error.code === 'NO_POSTER') {
        return res.status(400).json({ success: false, message: 'Event has no poster to remove' });
      }
      console.error('Error removing poster:', error);
      return res.status(500).json({ success: false, message: 'Failed to remove poster' });
    }

    return res.json({ success: true, message: 'Poster removed successfully', event: data });
  } catch (error) {
    console.error('Unexpected error in removePoster:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

// ============================================================
// LIFECYCLE CONTROLLERS
// ============================================================

/**
 * GET /api/events/lifecycle/dry-run
 * Admin: Preview which published events would transition to draft.
 */
async function dryRunLifecycle(req, res) {
  try {
    const { data, error } = await eventsLifecycleService.dryRunLifecycle();
    if (error) {
      console.error('Error in dry-run lifecycle:', error);
      return res.status(500).json({ success: false, message: 'Failed to run lifecycle dry-run' });
    }
    return res.json({ success: true, lifecycle: data });
  } catch (error) {
    console.error('Unexpected error in dryRunLifecycle:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

/**
 * POST /api/events/lifecycle/execute
 * Admin: Execute lifecycle — transition expired published events to draft.
 */
async function executeLifecycle(req, res) {
  try {
    const { data, error } = await eventsLifecycleService.executeLifecycle();
    if (error) {
      console.error('Error executing lifecycle:', error);
      return res.status(500).json({ success: false, message: 'Failed to execute lifecycle' });
    }
    return res.json({ success: true, lifecycle: data });
  } catch (error) {
    console.error('Unexpected error in executeLifecycle:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

module.exports = {
  listPublicEvents,
  getPublicEvent,
  getEventSections,
  listAdminEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  uploadPoster,
  removePoster,
  dryRunLifecycle,
  executeEventLifecycle: executeLifecycle
};
