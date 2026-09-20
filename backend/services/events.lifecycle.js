const supabase = require('../config/supabase');

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

function parseEventEndDateTime(event) {
  const dateStr = event.event_date;
  const timeStr = event.end_time || '23:59:59';
  const datetimeStr = `${dateStr}T${timeStr}+05:30`;
  return new Date(datetimeStr);
}

function getAsiaKolkataNow() {
  return new Date();
}

function formatEndDateTime(event) {
  return `${event.event_date} ${event.end_time || '23:59:59'} IST`;
}

async function getLifecycleCandidates() {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, category, event_date, start_time, end_time, status, registration_enabled, registration_deadline, event_countdown_enabled, event_countdown_at, created_at, updated_at')
    .eq('status', 'published')
    .order('event_date', { ascending: true });

  if (error) return { data: null, error };

  const now = getAsiaKolkataNow();
  const candidates = [];

  for (const event of data) {
    const endDateTime = parseEventEndDateTime(event);
    const hasPassed = endDateTime <= now;

    // Exemption: an event the admin created/modified/published AFTER it ended
    // is treated as an intentional historical record and stays published.
    // Only events left untouched since before they ended auto-transition.
    // (updated_at is bumped on every create/update/publish via the API.)
    const updatedAt = event.updated_at ? new Date(event.updated_at) : null;
    const reviewedAfterEnd = !!(updatedAt && !isNaN(updatedAt.getTime()) && updatedAt >= endDateTime);

    candidates.push({
      ...event,
      end_datetime_display: formatEndDateTime(event),
      has_passed: hasPassed,
      reviewed_after_end: reviewedAfterEnd,
      would_transition: hasPassed && !reviewedAfterEnd
    });
  }

  return { data: candidates, error: null };
}

async function dryRunLifecycle() {
  const { data, error } = await getLifecycleCandidates();
  if (error) return { data: null, error };

  const wouldTransition = data.filter(c => c.would_transition);
  const wouldRemainPublished = data.filter(c => !c.would_transition);

  return {
    data: {
      total_published: data.length,
      would_transition_to_draft: wouldTransition.map(e => ({
        id: e.id,
        title: e.title,
        event_date: e.event_date,
        end_time: e.end_time,
        end_datetime_display: e.end_datetime_display,
        current_status: e.status
      })),
      would_remain_published: wouldRemainPublished.map(e => ({
        id: e.id,
        title: e.title,
        event_date: e.event_date,
        end_time: e.end_time,
        end_datetime_display: e.end_datetime_display,
        current_status: e.status,
        reason: e.has_passed ? 'historical-record (admin-reviewed after end)' : 'upcoming'
      }))
    },
    error: null
  };
}

async function executeLifecycle() {
  const { data, error } = await getLifecycleCandidates();
  if (error) return { data: null, error };

  const candidates = data.filter(c => c.would_transition);

  if (candidates.length === 0) {
    return { data: { transitioned: [], unchanged: [] }, error: null };
  }

  const now = new Date().toISOString();
  const transitioned = [];

  for (const event of candidates) {
    const { data: updated, error: updateError } = await supabase
      .from('events')
      .update({ status: 'draft', updated_at: now })
      .eq('id', event.id)
      .eq('status', 'published')
      .select('id, title, status')
      .single();

    if (updateError) {
      console.error(`Failed to update event ${event.id}:`, updateError.message);
      continue;
    }

    if (updated) {
      transitioned.push({
        id: updated.id,
        title: updated.title,
        previous_status: 'published',
        new_status: 'draft'
      });
    }
  }

  const unchanged = data.filter(c => !c.would_transition).map(e => ({
    id: e.id,
    title: e.title,
    status: e.status
  }));

  return { data: { transitioned, unchanged }, error: null };
}

module.exports = { dryRunLifecycle, executeLifecycle, getLifecycleCandidates, getAsiaKolkataNow };
