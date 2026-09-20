const supabase = require('../config/supabase');

// Fields returned to public users (excludes internal/admin-only fields)
const PUBLIC_SELECT_FIELDS = 'id, title, description, category, event_date, start_time, end_time, location, poster_url, status, featured, display_order, registration_enabled, registration_deadline, registration_url, event_countdown_enabled, event_countdown_at, created_at, updated_at';

// Fields returned to admin users (includes all fields)
const ADMIN_SELECT_FIELDS = '*, admins:created_by(id, name)';

/**
 * Construct the full public URL for a poster storage path.
 * @param {string|null} storagePath - The storage object path (e.g., "event-posters/uuid/file.jpg")
 * @returns {string|null} Full public URL or null
 */
function getPosterPublicUrl(storagePath) {
  if (!storagePath) return null;
  const { data } = supabase.storage.from('event-posters').getPublicUrl(
    storagePath.replace(/^event-posters\//, '')
  );
  return data?.publicUrl || null;
}

/**
 * Attach the full poster URL to an event object.
 * Transforms the storage path stored in poster_url into a full public URL.
 * @param {Object} event - Event row from database
 * @returns {Object} Event with poster_url as full public URL
 */
function enrichPosterUrl(event) {
  if (!event) return event;
  return {
    ...event,
    poster_url: getPosterPublicUrl(event.poster_url)
  };
}

// ============================================================
// PUBLIC QUERIES
// ============================================================

/**
 * Get all published events for the public website.
 * @param {Object} options - Query options { category, featured, limit, offset }
 * @returns {Object} { data, error }
 */
async function getPublishedEvents({ category, featured, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('events')
    .select(PUBLIC_SELECT_FIELDS)
    .eq('status', 'published')
    .order('event_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category) {
    query = query.eq('category', category);
  }

  if (featured === true || featured === 'true') {
    query = query.eq('featured', true);
  }

  const { data, error } = await query;

  if (error) return { data: null, error };

  return { data: data.map(enrichPosterUrl), error: null };
}

/**
 * Get a single published event by ID for the public website.
 * Returns null if the event is not published.
 * @param {string} id - Event UUID
 * @returns {Object} { data, error }
 */
async function getPublishedEventById(id) {
  const { data, error } = await supabase
    .from('events')
    .select(PUBLIC_SELECT_FIELDS)
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();

  if (error) return { data: null, error };

  return { data: enrichPosterUrl(data), error: null };
}

/**
 * Get rich detail sections for a published event.
 * Reads the existing event_sections table directly — no gallery required,
 * so Upcoming events (and Past events without a gallery) expose the same
 * admin-managed detail content. Returns [] when there are no sections.
 * @param {string} id - Event UUID
 * @returns {Object} { data, error }
 */
async function getEventSections(id) {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('id', id)
    .eq('status', 'published')
    .maybeSingle();

  if (eventError) return { data: null, error: eventError };
  if (!event) return { data: null, error: { code: 'NOT_FOUND', message: 'Event not found' } };

  const { data, error } = await supabase
    .from('event_sections')
    .select('id, section_type, title, content, display_order')
    .eq('event_id', id)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return { data: null, error };

  return { data: data || [], error: null };
}

// ============================================================
// ADMIN QUERIES
// ============================================================

/**
 * Get all events for admin dashboard (includes draft/archived).
 * @returns {Object} { data, error }
 */
async function getAllEventsAdmin() {
  const { data, error } = await supabase
    .from('events')
    .select(ADMIN_SELECT_FIELDS)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };

  return { data: data.map(enrichPosterUrl), error: null };
}

/**
 * Get a single event by ID for admin (any status).
 * @param {string} id - Event UUID
 * @returns {Object} { data, error }
 */
async function getEventByIdAdmin(id) {
  const { data, error } = await supabase
    .from('events')
    .select(ADMIN_SELECT_FIELDS)
    .eq('id', id)
    .maybeSingle();

  if (error) return { data: null, error };

  return { data: enrichPosterUrl(data), error: null };
}

/**
 * Create a new event.
 * @param {Object} eventData - Event fields
 * @param {string} adminId - The admins.id of the creating admin
 * @returns {Object} { data, error }
 */
async function createEvent(eventData, adminId) {
  const { data, error } = await supabase
    .from('events')
    .insert({
      title: eventData.title,
      description: eventData.description || null,
      category: eventData.category || null,
      event_date: eventData.event_date || null,
      start_time: eventData.start_time || null,
      end_time: eventData.end_time || null,
      location: eventData.location || null,
      status: eventData.status || 'draft',
      featured: eventData.featured === true,
      display_order: Number.isInteger(eventData.display_order) ? eventData.display_order : 0,
      registration_enabled: eventData.registration_enabled === true,
      registration_deadline: eventData.registration_deadline || null,
      registration_url: eventData.registration_url || null,
      event_countdown_enabled: eventData.event_countdown_enabled === true,
      event_countdown_at: eventData.event_countdown_at || null,
      created_by: adminId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select(ADMIN_SELECT_FIELDS)
    .single();

  if (error) return { data: null, error };

  return { data: enrichPosterUrl(data), error: null };
}

/**
 * Update an existing event.
 * @param {string} id - Event UUID
 * @param {Object} updateData - Fields to update
 * @returns {Object} { data, error }
 */
async function updateEvent(id, updateData) {
  // Build the update object with only provided fields
  const updateObj = { updated_at: new Date().toISOString() };

  const allowedFields = [
    'title', 'description', 'category', 'event_date',
    'start_time', 'end_time', 'location', 'status',
    'featured', 'display_order',
    'registration_enabled', 'registration_deadline', 'registration_url',
    'event_countdown_enabled', 'event_countdown_at'
  ];

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      updateObj[field] = updateData[field];
    }
  }

  // Normalize empty strings to null for optional nullable fields so a
  // registration-disabled (or countdown-less) update never stores junk.
  for (const field of ['registration_deadline', 'registration_url', 'event_countdown_at']) {
    if (updateObj[field] === '') {
      updateObj[field] = null;
    }
  }

  const { data, error } = await supabase
    .from('events')
    .update(updateObj)
    .eq('id', id)
    .select(ADMIN_SELECT_FIELDS)
    .single();

  if (error) return { data: null, error };

  return { data: enrichPosterUrl(data), error: null };
}

/**
 * Archive (soft-delete) an event.
 * Sets status to 'archived'. Does NOT permanently delete.
 * @param {string} id - Event UUID
 * @returns {Object} { data, error }
 */
async function archiveEvent(id) {
  const { data, error } = await supabase
    .from('events')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(ADMIN_SELECT_FIELDS)
    .single();

  if (error) return { data: null, error };

  return { data: enrichPosterUrl(data), error: null };
}

// ============================================================
// POSTER / STORAGE OPERATIONS
// ============================================================

/**
 * Generate a safe storage file path for an event poster.
 * @param {string} eventId - Event UUID
 * @param {string} originalName - Original filename
 * @param {string} mimeType - MIME type (e.g., 'image/jpeg')
 * @returns {string} Storage path (without bucket prefix)
 */
function generatePosterPath(eventId, originalName, mimeType) {
  const ext = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  }[mimeType] || 'jpg';

  // Sanitize original name: lowercase, replace non-alphanumeric with hyphens
  const sanitized = originalName
    .replace(/\.[^/.]+$/, '') // remove extension
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50); // limit length

  const timestamp = Date.now();
  return `${eventId}/${timestamp}-${sanitized || 'poster'}.${ext}`;
}

/**
 * Upload an event poster to Supabase Storage.
 * @param {string} eventId - Event UUID
 * @param {Buffer} fileBuffer - File data
 * @param {string} originalName - Original filename
 * @param {string} mimeType - MIME type
 * @returns {Object} { data: { storagePath, publicUrl }, error }
 */
async function uploadPoster(eventId, fileBuffer, originalName, mimeType) {
  // First check if event exists
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, poster_url')
    .eq('id', eventId)
    .maybeSingle();

  if (eventError) return { data: null, error: eventError };
  if (!event) return { data: null, error: { message: 'Event not found', code: 'NOT_FOUND' } };

  // If there's an existing poster, remove it first
  if (event.poster_url) {
    const oldPath = event.poster_url.replace(/^event-posters\//, '');
    await supabase.storage.from('event-posters').remove([oldPath]);
    // Ignore errors on old file removal (file may not exist)
  }

  // Upload new poster
  const storagePath = generatePosterPath(eventId, originalName, mimeType);

  const { error: uploadError } = await supabase.storage
    .from('event-posters')
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false
    });

  if (uploadError) {
    return { data: null, error: uploadError };
  }

  // Update event record with new poster path
  const fullStoragePath = `event-posters/${storagePath}`;
  const { error: updateError } = await supabase
    .from('events')
    .update({ poster_url: fullStoragePath, updated_at: new Date().toISOString() })
    .eq('id', eventId);

  if (updateError) {
    // Attempt to clean up the uploaded file
    await supabase.storage.from('event-posters').remove([storagePath]);
    return { data: null, error: updateError };
  }

  const publicUrl = getPosterPublicUrl(fullStoragePath);

  return {
    data: { storagePath: fullStoragePath, publicUrl },
    error: null
  };
}

/**
 * Remove an event poster from Supabase Storage and clear the poster_url.
 * @param {string} eventId - Event UUID
 * @returns {Object} { data, error }
 */
async function removePoster(eventId) {
  // Get the current poster path
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, poster_url')
    .eq('id', eventId)
    .maybeSingle();

  if (eventError) return { data: null, error: eventError };
  if (!event) return { data: null, error: { message: 'Event not found', code: 'NOT_FOUND' } };
  if (!event.poster_url) return { data: null, error: { message: 'Event has no poster', code: 'NO_POSTER' } };

  // Remove from Storage
  const storagePath = event.poster_url.replace(/^event-posters\//, '');
  const { error: removeError } = await supabase.storage
    .from('event-posters')
    .remove([storagePath]);

  if (removeError) {
    console.error('Storage removal error:', removeError);
    // Continue to clear the DB reference even if storage removal fails
  }

  // Clear poster_url in database
  const { data: updated, error: updateError } = await supabase
    .from('events')
    .update({ poster_url: null, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .select(ADMIN_SELECT_FIELDS)
    .single();

  if (updateError) return { data: null, error: updateError };

  return { data: enrichPosterUrl(updated), error: null };
}

module.exports = {
  getPublishedEvents,
  getPublishedEventById,
  getEventSections,
  getAllEventsAdmin,
  getEventByIdAdmin,
  createEvent,
  updateEvent,
  archiveEvent,
  uploadPoster,
  removePoster
};
