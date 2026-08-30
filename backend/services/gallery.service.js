const supabase = require('../config/supabase');

// Public select fields for related event
const PUBLIC_EVENT_FIELDS = 'id, title, description, category, event_date, start_time, end_time, location, poster_url, status';

// Helper to construct the full poster URL, matching events service
function getPosterPublicUrl(storagePath) {
  if (!storagePath) return null;
  const { data } = supabase.storage.from('event-posters').getPublicUrl(
    storagePath.replace(/^event-posters\//, '')
  );
  return data?.publicUrl || null;
}

function enrichEventPosterUrl(event) {
  if (!event) return event;
  return {
    ...event,
    poster_url: getPosterPublicUrl(event.poster_url)
  };
}

// Since Gallery might have a cover image in 'event-gallery' bucket
function getGalleryCoverUrl(storagePath) {
  if (!storagePath) return null;
  const { data } = supabase.storage.from('event-gallery').getPublicUrl(
    storagePath.replace(/^event-gallery\//, '')
  );
  return data?.publicUrl || null;
}

function enrichGalleryCoverUrl(gallery) {
  if (!gallery) return gallery;
  return {
    ...gallery,
    cover_image_url: getGalleryCoverUrl(gallery.cover_image_url)
  };
}

// Media URLs (event-gallery bucket)
function enrichMediaUrl(media) {
  if (!media) return media;
  return {
    ...media,
    media_url: getGalleryCoverUrl(media.media_url),
    thumbnail_url: media.thumbnail_url ? getGalleryCoverUrl(media.thumbnail_url) : null
  };
}

function enrichGuestPhotoUrl(guest) {
  if (!guest) return guest;
  return {
    ...guest,
    photo_url: getGalleryCoverUrl(guest.photo_url)
  };
}

function enrichSponsorLogoUrl(sponsor) {
  if (!sponsor) return sponsor;
  return {
    ...sponsor,
    logo_url: getGalleryCoverUrl(sponsor.logo_url)
  };
}

async function getPublicGalleries({ category, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from('event_gallery')
    .select(`*, events!inner(${PUBLIC_EVENT_FIELDS})`)
    .eq('is_published', true)
    .eq('events.status', 'published')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (category && category !== 'all') {
    query = query.eq('events.category', category);
  }

  const { data, error } = await query;
  if (error) return { data: null, error };

  // Enrich URLs
  const enrichedData = data.map(item => {
    return {
      ...enrichGalleryCoverUrl(item),
      events: enrichEventPosterUrl(item.events)
    };
  });

  return { data: enrichedData, error: null };
}

async function getPublicGalleryByEventId(eventId) {
  // Fetch event basic info
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select(PUBLIC_EVENT_FIELDS)
    .eq('id', eventId)
    .eq('status', 'published')
    .maybeSingle();

  if (eventError) return { data: null, error: eventError };
  if (!eventData) return { data: null, error: { code: 'NOT_FOUND', message: 'Event not found or not published' } };

  // Fetch gallery
  const { data: galleryData, error: galleryError } = await supabase
    .from('event_gallery')
    .select('*')
    .eq('event_id', eventId)
    .eq('is_published', true)
    .maybeSingle();

  if (galleryError) return { data: null, error: galleryError };
  if (!galleryData) return { data: null, error: { code: 'NOT_FOUND', message: 'Gallery not found or not published' } };

  // Fetch sub-tables concurrently
  const [mediaRes, guestsRes, sponsorsRes, sectionsRes] = await Promise.all([
    supabase.from('event_media').select('*').eq('event_id', eventId).order('display_order', { ascending: true }).order('created_at', { ascending: true }),
    supabase.from('event_guests').select('*').eq('event_id', eventId).order('display_order', { ascending: true }).order('created_at', { ascending: true }),
    supabase.from('event_sponsors').select('*').eq('event_id', eventId).order('display_order', { ascending: true }).order('created_at', { ascending: true }),
    supabase.from('event_sections').select('*').eq('event_id', eventId).order('display_order', { ascending: true }).order('created_at', { ascending: true })
  ]);

  if (mediaRes.error) return { data: null, error: mediaRes.error };
  if (guestsRes.error) return { data: null, error: guestsRes.error };
  if (sponsorsRes.error) return { data: null, error: sponsorsRes.error };
  if (sectionsRes.error) return { data: null, error: sectionsRes.error };

  return {
    data: {
      event: enrichEventPosterUrl(eventData),
      gallery: enrichGalleryCoverUrl(galleryData),
      media: mediaRes.data.map(enrichMediaUrl),
      guests: guestsRes.data.map(enrichGuestPhotoUrl),
      sponsors: sponsorsRes.data.map(enrichSponsorLogoUrl),
      sections: sectionsRes.data
    },
    error: null
  };
}

async function getAllGalleriesAdmin() {
  const { data, error } = await supabase
    .from('event_gallery')
    .select(`*, events(${PUBLIC_EVENT_FIELDS})`)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };

  const enrichedData = data.map(item => {
    return {
      ...enrichGalleryCoverUrl(item),
      events: enrichEventPosterUrl(item.events)
    };
  });

  return { data: enrichedData, error: null };
}

async function getGalleryByEventIdAdmin(eventId) {
  // Fetch event
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select(PUBLIC_EVENT_FIELDS)
    .eq('id', eventId)
    .maybeSingle();

  if (eventError) return { data: null, error: eventError };
  if (!eventData) return { data: null, error: { code: 'NOT_FOUND', message: 'Event not found' } };

  // Fetch gallery (draft or published)
  const { data: galleryData, error: galleryError } = await supabase
    .from('event_gallery')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle();

  if (galleryError) return { data: null, error: galleryError };

  let responseData = {
    event: enrichEventPosterUrl(eventData),
    gallery: galleryData ? enrichGalleryCoverUrl(galleryData) : null,
    media: [],
    guests: [],
    sponsors: [],
    sections: []
  };

  if (galleryData) {
    const [mediaRes, guestsRes, sponsorsRes, sectionsRes] = await Promise.all([
      supabase.from('event_media').select('*').eq('event_id', eventId).order('display_order', { ascending: true }),
      supabase.from('event_guests').select('*').eq('event_id', eventId).order('display_order', { ascending: true }),
      supabase.from('event_sponsors').select('*').eq('event_id', eventId).order('display_order', { ascending: true }),
      supabase.from('event_sections').select('*').eq('event_id', eventId).order('display_order', { ascending: true })
    ]);

    responseData.media = mediaRes.data ? mediaRes.data.map(enrichMediaUrl) : [];
    responseData.guests = guestsRes.data ? guestsRes.data.map(enrichGuestPhotoUrl) : [];
    responseData.sponsors = sponsorsRes.data ? sponsorsRes.data.map(enrichSponsorLogoUrl) : [];
    responseData.sections = sectionsRes.data || [];
  }

  return { data: responseData, error: null };
}

async function createGallery(galleryData) {
  const { data, error } = await supabase
    .from('event_gallery')
    .insert({
      event_id: galleryData.event_id,
      short_summary: galleryData.short_summary || null,
      full_description: galleryData.full_description || null,
      copyright_text: galleryData.copyright_text || null,
      is_published: galleryData.is_published === true,
      display_order: Number.isInteger(galleryData.display_order) ? galleryData.display_order : 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select('*')
    .single();

  if (error) return { data: null, error };
  return { data: enrichGalleryCoverUrl(data), error: null };
}

async function updateGallery(eventId, updateData) {
  const updateObj = { updated_at: new Date().toISOString() };
  const allowedFields = ['short_summary', 'full_description', 'copyright_text', 'is_published', 'display_order'];
  
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      updateObj[field] = updateData[field];
    }
  }

  const { data, error } = await supabase
    .from('event_gallery')
    .update(updateObj)
    .eq('event_id', eventId)
    .select('*')
    .single();

  if (error) return { data: null, error };
  return { data: enrichGalleryCoverUrl(data), error: null };
}

async function deleteGallery(eventId) {
  const { data: gallery } = await supabase
    .from('event_gallery')
    .select('cover_image_url')
    .eq('event_id', eventId)
    .maybeSingle();

  if (gallery && gallery.cover_image_url) {
    const oldPath = gallery.cover_image_url.replace(/^event-gallery\//, '');
    await supabase.storage.from('event-gallery').remove([oldPath]);
  }

  const { data, error } = await supabase
    .from('event_gallery')
    .delete()
    .eq('event_id', eventId)
    .select('*')
    .single();

  if (error) return { data: null, error };
  return { data: enrichGalleryCoverUrl(data), error: null };
}

// ============================================================
// PHOTO/MEDIA STORAGE OPERATIONS
// ============================================================

function generateGalleryPath(folder, eventId, originalName, mimeType) {
  const ext = mimeType.split('/')[1] || 'jpg';
  
  const sanitized = originalName
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);

  const timestamp = Date.now();
  return `${folder}/${eventId}/${timestamp}-${sanitized || 'file'}.${ext}`;
}

async function uploadCover(eventId, fileBuffer, originalName, mimeType) {
  const { data: gallery, error: galleryError } = await supabase
    .from('event_gallery')
    .select('event_id, cover_image_url')
    .eq('event_id', eventId)
    .maybeSingle();

  if (galleryError) return { data: null, error: galleryError };
  if (!gallery) return { data: null, error: { message: 'Gallery not found', code: 'NOT_FOUND' } };

  if (gallery.cover_image_url) {
    const oldPath = gallery.cover_image_url.replace(/^event-gallery\//, '');
    await supabase.storage.from('event-gallery').remove([oldPath]);
  }

  const storagePath = generateGalleryPath('cover', eventId, originalName, mimeType);

  const { error: uploadError } = await supabase.storage
    .from('event-gallery')
    .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });

  if (uploadError) return { data: null, error: uploadError };

  const fullStoragePath = `event-gallery/${storagePath}`;
  const { data: updated, error: updateError } = await supabase
    .from('event_gallery')
    .update({ cover_image_url: fullStoragePath, updated_at: new Date().toISOString() })
    .eq('event_id', eventId)
    .select('*')
    .single();

  if (updateError) {
    await supabase.storage.from('event-gallery').remove([storagePath]);
    return { data: null, error: updateError };
  }

  return { data: enrichGalleryCoverUrl(updated), error: null };
}

async function uploadMedia(eventId, fileBuffer, originalName, mimeType, mediaData = {}) {
  const { data: gallery, error: galleryError } = await supabase
    .from('event_gallery')
    .select('event_id')
    .eq('event_id', eventId)
    .maybeSingle();
    
  if (galleryError) return { data: null, error: galleryError };
  if (!gallery) return { data: null, error: { message: 'Gallery not found', code: 'NOT_FOUND' } };

  const storagePath = generateGalleryPath('media', eventId, originalName, mimeType);
  
  const { error: uploadError } = await supabase.storage
    .from('event-gallery')
    .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });

  if (uploadError) return { data: null, error: uploadError };

  const fullStoragePath = `event-gallery/${storagePath}`;
  
  const { data: mediaRow, error: insertError } = await supabase
    .from('event_media')
    .insert({
      event_id: eventId,
      media_type: mimeType.startsWith('video') ? 'video' : 'image',
      media_url: fullStoragePath,
      title: mediaData.title || null,
      caption: mediaData.caption || null,
      is_featured: mediaData.is_featured === 'true' || mediaData.is_featured === true,
      display_order: parseInt(mediaData.display_order, 10) || 0,
      created_at: new Date().toISOString()
    })
    .select('*')
    .single();

  if (insertError) {
    await supabase.storage.from('event-gallery').remove([storagePath]);
    return { data: null, error: insertError };
  }

  return { data: enrichMediaUrl(mediaRow), error: null };
}

async function deleteMedia(mediaId) {
  const { data: media, error: mediaError } = await supabase
    .from('event_media')
    .select('*')
    .eq('id', mediaId)
    .maybeSingle();

  if (mediaError) return { data: null, error: mediaError };
  if (!media) return { data: null, error: { message: 'Media not found', code: 'NOT_FOUND' } };

  if (media.media_url) {
    const storagePath = media.media_url.replace(/^event-gallery\//, '');
    await supabase.storage.from('event-gallery').remove([storagePath]);
  }
  if (media.thumbnail_url) {
    const thumbPath = media.thumbnail_url.replace(/^event-gallery\//, '');
    await supabase.storage.from('event-gallery').remove([thumbPath]);
  }

  const { error: deleteError } = await supabase
    .from('event_media')
    .delete()
    .eq('id', mediaId);

  if (deleteError) return { data: null, error: deleteError };
  
  return { data: enrichMediaUrl(media), error: null };
}

async function uploadGuestPhoto(eventId, guestId, fileBuffer, originalName, mimeType) {
  const { data: guest, error: guestError } = await supabase
    .from('event_guests')
    .select('*')
    .eq('id', guestId)
    .eq('event_id', eventId)
    .maybeSingle();

  if (guestError) return { data: null, error: guestError };
  if (!guest) return { data: null, error: { message: 'Guest not found', code: 'NOT_FOUND' } };

  if (guest.photo_url) {
    const oldPath = guest.photo_url.replace(/^event-gallery\//, '');
    await supabase.storage.from('event-gallery').remove([oldPath]);
  }

  const storagePath = generateGalleryPath('guests', eventId, originalName, mimeType);

  const { error: uploadError } = await supabase.storage
    .from('event-gallery')
    .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });

  if (uploadError) return { data: null, error: uploadError };

  const fullStoragePath = `event-gallery/${storagePath}`;
  const { data: updated, error: updateError } = await supabase
    .from('event_guests')
    .update({ photo_url: fullStoragePath })
    .eq('id', guestId)
    .select('*')
    .single();

  if (updateError) {
    await supabase.storage.from('event-gallery').remove([storagePath]);
    return { data: null, error: updateError };
  }

  return { data: updated, error: null };
}

async function uploadSponsorLogo(eventId, sponsorId, fileBuffer, originalName, mimeType) {
  const { data: sponsor, error: sponsorError } = await supabase
    .from('event_sponsors')
    .select('*')
    .eq('id', sponsorId)
    .eq('event_id', eventId)
    .maybeSingle();

  if (sponsorError) return { data: null, error: sponsorError };
  if (!sponsor) return { data: null, error: { message: 'Sponsor not found', code: 'NOT_FOUND' } };

  if (sponsor.logo_url) {
    const oldPath = sponsor.logo_url.replace(/^event-gallery\//, '');
    await supabase.storage.from('event-gallery').remove([oldPath]);
  }

  const storagePath = generateGalleryPath('sponsors', eventId, originalName, mimeType);

  const { error: uploadError } = await supabase.storage
    .from('event-gallery')
    .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });

  if (uploadError) return { data: null, error: uploadError };

  const fullStoragePath = `event-gallery/${storagePath}`;
  const { data: updated, error: updateError } = await supabase
    .from('event_sponsors')
    .update({ logo_url: fullStoragePath })
    .eq('id', sponsorId)
    .select('*')
    .single();

  if (updateError) {
    await supabase.storage.from('event-gallery').remove([storagePath]);
    return { data: null, error: updateError };
  }

  return { data: updated, error: null };
}

// ============================================================
// SUB-ENTITY CRUD OPERATIONS (NO FILE UPLOAD)
// ============================================================

async function updateMedia(mediaId, updateData) {
  const allowed = ['title', 'caption', 'is_featured', 'display_order'];
  const obj = {};
  allowed.forEach(k => { if (updateData[k] !== undefined) obj[k] = updateData[k]; });
  const { data, error } = await supabase.from('event_media').update(obj).eq('id', mediaId).select('*').single();
  return { data: enrichMediaUrl(data), error };
}

async function addGuest(eventId, guestData) {
  const { data, error } = await supabase.from('event_guests').insert({ 
    event_id: eventId, 
    name: guestData.name, 
    designation: guestData.designation, 
    organization: guestData.organization, 
    bio: guestData.bio, 
    linkedin_url: guestData.linkedin_url, 
    display_order: guestData.display_order || 0 
  }).select('*').single();
  return { data, error };
}

async function updateGuest(guestId, guestData) {
  const obj = {};
  ['name', 'designation', 'organization', 'bio', 'linkedin_url', 'display_order'].forEach(k => { if (guestData[k] !== undefined) obj[k] = guestData[k]; });
  const { data, error } = await supabase.from('event_guests').update(obj).eq('id', guestId).select('*').single();
  return { data: enrichGuestPhotoUrl(data), error };
}

async function deleteGuest(guestId) {
  const { data: guest } = await supabase.from('event_guests').select('*').eq('id', guestId).single();
  if (guest && guest.photo_url) {
    await supabase.storage.from('event-gallery').remove([guest.photo_url.replace(/^event-gallery\//, '')]);
  }
  const { data, error } = await supabase.from('event_guests').delete().eq('id', guestId).select('*').single();
  return { data, error };
}

async function addSponsor(eventId, sponsorData) {
  const { data, error } = await supabase.from('event_sponsors').insert({ 
    event_id: eventId, 
    name: sponsorData.name, 
    website_url: sponsorData.website_url, 
    description: sponsorData.description, 
    display_order: sponsorData.display_order || 0 
  }).select('*').single();
  return { data, error };
}

async function updateSponsor(sponsorId, sponsorData) {
  const obj = {};
  ['name', 'website_url', 'description', 'display_order'].forEach(k => { if (sponsorData[k] !== undefined) obj[k] = sponsorData[k]; });
  const { data, error } = await supabase.from('event_sponsors').update(obj).eq('id', sponsorId).select('*').single();
  return { data: enrichSponsorLogoUrl(data), error };
}

async function deleteSponsor(sponsorId) {
  const { data: sponsor } = await supabase.from('event_sponsors').select('*').eq('id', sponsorId).single();
  if (sponsor && sponsor.logo_url) {
    await supabase.storage.from('event-gallery').remove([sponsor.logo_url.replace(/^event-gallery\//, '')]);
  }
  const { data, error } = await supabase.from('event_sponsors').delete().eq('id', sponsorId).select('*').single();
  return { data, error };
}

async function addSection(eventId, sectionData) {
  const { data, error } = await supabase.from('event_sections').insert({ event_id: eventId, section_type: sectionData.section_type || 'text', title: sectionData.title, content: sectionData.content, display_order: sectionData.display_order || 0 }).select('*').single();
  return { data, error };
}

async function updateSection(sectionId, sectionData) {
  const obj = { updated_at: new Date().toISOString() };
  ['section_type', 'title', 'content', 'display_order'].forEach(k => { if (sectionData[k] !== undefined) obj[k] = sectionData[k]; });
  const { data, error } = await supabase.from('event_sections').update(obj).eq('id', sectionId).select('*').single();
  return { data, error };
}

async function deleteSection(sectionId) {
  const { data, error } = await supabase.from('event_sections').delete().eq('id', sectionId).select('*').single();
  return { data, error };
}

module.exports = {
  getPublicGalleries,
  getPublicGalleryByEventId,
  getAllGalleriesAdmin,
  getGalleryByEventIdAdmin,
  createGallery,
  updateGallery,
  deleteGallery,
  uploadCover,
  uploadMedia,
  deleteMedia,
  uploadGuestPhoto,
  uploadSponsorLogo,
  updateMedia,
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
