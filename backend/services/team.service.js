const supabase = require('../config/supabase');

const PUBLIC_TEAM_SELECT = 'id, name, display_order, status, created_at, updated_at';
const PUBLIC_MEMBER_SELECT = 'id, team_id, section, name, position, is_lead, image_url, linkedin_url, display_order, status, created_at, updated_at';
const ADMIN_SELECT_FIELDS = '*';

function getPhotoPublicUrl(storagePath) {
  if (!storagePath) return null;
  const { data } = supabase.storage.from('team-photos').getPublicUrl(
    storagePath.replace(/^team-photos\//, '')
  );
  return data?.publicUrl || null;
}

function enrichPhotoUrl(member) {
  if (!member) return member;
  return {
    ...member,
    image_url: getPhotoPublicUrl(member.image_url)
  };
}

// ============================================================
// PUBLIC QUERIES
// ============================================================

async function getPublicTeam() {
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select(PUBLIC_TEAM_SELECT)
    .eq('status', 'published')
    .order('display_order', { ascending: true });

  if (teamsError) return { data: null, error: teamsError };

  const { data: members, error: membersError } = await supabase
    .from('team_members')
    .select(PUBLIC_MEMBER_SELECT)
    .eq('status', 'published')
    .order('display_order', { ascending: true });

  if (membersError) return { data: null, error: membersError };

  const enrichedMembers = members.map(enrichPhotoUrl);

  const faculty = enrichedMembers
    .filter(m => m.section === 'Faculty')
    .map(m => ({
      id: m.id,
      name: m.name,
      position: m.position,
      image_url: m.image_url,
      linkedin_url: m.linkedin_url,
      display_order: m.display_order
    }));

  const executive = enrichedMembers
    .filter(m => m.section === 'Executive')
    .map(m => ({
      id: m.id,
      name: m.name,
      position: m.position,
      image_url: m.image_url,
      linkedin_url: m.linkedin_url,
      display_order: m.display_order
    }));

  const formattedTeams = teams.map(t => {
    const teamMembers = enrichedMembers.filter(m => m.team_id === t.id);
    const lead = teamMembers.find(m => m.is_lead === true);
    const regulars = teamMembers.filter(m => m.is_lead !== true).map(m => ({
      id: m.id,
      name: m.name,
      image_url: m.image_url,
      linkedin_url: m.linkedin_url,
      display_order: m.display_order
    }));

    return {
      id: t.id,
      name: t.name,
      display_order: t.display_order,
      lead: lead ? {
        id: lead.id,
        name: lead.name,
        image_url: lead.image_url,
        linkedin_url: lead.linkedin_url
      } : null,
      members: regulars
    };
  });

  return {
    data: {
      success: true,
      faculty,
      executive,
      teams: formattedTeams
    },
    error: null
  };
}

// ============================================================
// ADMIN QUERIES - TEAMS
// ============================================================

async function getAllTeamsAdmin() {
  const { data, error } = await supabase
    .from('teams')
    .select(ADMIN_SELECT_FIELDS)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };
  return { data, error: null };
}

async function getTeamByIdAdmin(id) {
  const { data, error } = await supabase
    .from('teams')
    .select(ADMIN_SELECT_FIELDS)
    .eq('id', id)
    .maybeSingle();

  if (error) return { data: null, error };
  return { data, error: null };
}

async function createTeam(teamData) {
  const { data, error } = await supabase
    .from('teams')
    .insert({
      name: teamData.name,
      display_order: Number.isInteger(teamData.display_order) ? teamData.display_order : 0,
      status: teamData.status || 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select(ADMIN_SELECT_FIELDS)
    .single();

  if (error) return { data: null, error };
  return { data, error: null };
}

async function updateTeam(id, updateData) {
  const updateObj = { updated_at: new Date().toISOString() };
  const allowedFields = ['name', 'display_order', 'status'];
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      updateObj[field] = updateData[field];
    }
  }

  const { data, error } = await supabase
    .from('teams')
    .update(updateObj)
    .eq('id', id)
    .select(ADMIN_SELECT_FIELDS)
    .single();

  if (error) return { data: null, error };
  return { data, error: null };
}

async function archiveTeam(id) {
  const { data, error } = await supabase
    .from('teams')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(ADMIN_SELECT_FIELDS)
    .single();

  if (error) return { data: null, error };
  return { data, error: null };
}

// ============================================================
// ADMIN QUERIES - TEAM MEMBERS
// ============================================================

async function getAllMembersAdmin() {
  const { data, error } = await supabase
    .from('team_members')
    .select(ADMIN_SELECT_FIELDS)
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };
  return { data: data.map(enrichPhotoUrl), error: null };
}

async function getMemberByIdAdmin(id) {
  const { data, error } = await supabase
    .from('team_members')
    .select(ADMIN_SELECT_FIELDS)
    .eq('id', id)
    .maybeSingle();

  if (error) return { data: null, error };
  return { data: enrichPhotoUrl(data), error: null };
}

async function createMember(memberData) {
  const { data, error } = await supabase
    .from('team_members')
    .insert({
      team_id: memberData.team_id || null,
      section: memberData.section,
      name: memberData.name,
      position: memberData.position || null,
      is_lead: memberData.is_lead === true,
      linkedin_url: memberData.linkedin_url || null,
      display_order: Number.isInteger(memberData.display_order) ? memberData.display_order : 0,
      status: memberData.status || 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select(ADMIN_SELECT_FIELDS)
    .single();

  if (error) return { data: null, error };
  return { data: enrichPhotoUrl(data), error: null };
}

async function updateMember(id, updateData) {
  const updateObj = { updated_at: new Date().toISOString() };
  const allowedFields = ['team_id', 'section', 'name', 'position', 'is_lead', 'linkedin_url', 'display_order', 'status'];
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      updateObj[field] = updateData[field];
    }
  }

  const { data, error } = await supabase
    .from('team_members')
    .update(updateObj)
    .eq('id', id)
    .select(ADMIN_SELECT_FIELDS)
    .single();

  if (error) return { data: null, error };
  return { data: enrichPhotoUrl(data), error: null };
}

async function archiveMember(id) {
  const { data, error } = await supabase
    .from('team_members')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(ADMIN_SELECT_FIELDS)
    .single();

  if (error) return { data: null, error };
  return { data: enrichPhotoUrl(data), error: null };
}

// ============================================================
// ADMIN QUERIES - LEAD MANAGEMENT
// ============================================================

async function assignTeamLead(teamId, memberId) {
  // Clear any existing leads for this team
  const { error: clearError } = await supabase
    .from('team_members')
    .update({ is_lead: false, updated_at: new Date().toISOString() })
    .eq('team_id', teamId)
    .eq('is_lead', true);

  if (clearError) return { data: null, error: clearError };

  // Set the new lead
  const { data, error } = await supabase
    .from('team_members')
    .update({ is_lead: true, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .eq('team_id', teamId)
    .select(ADMIN_SELECT_FIELDS)
    .single();

  if (error) return { data: null, error };
  return { data: enrichPhotoUrl(data), error: null };
}

async function removeTeamLead(teamId) {
  const { data, error } = await supabase
    .from('team_members')
    .update({ is_lead: false, updated_at: new Date().toISOString() })
    .eq('team_id', teamId)
    .eq('is_lead', true)
    .select(ADMIN_SELECT_FIELDS);

  if (error) return { data: null, error };
  return { data: data.map(enrichPhotoUrl), error: null };
}

// ============================================================
// PHOTO STORAGE OPERATIONS
// ============================================================

function generatePhotoPath(memberId, originalName, mimeType) {
  const ext = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  }[mimeType] || 'jpg';

  const sanitized = originalName
    .replace(/\.[^/.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);

  const timestamp = Date.now();
  return `${memberId}/${timestamp}-${sanitized || 'photo'}.${ext}`;
}

async function uploadPhoto(memberId, fileBuffer, originalName, mimeType) {
  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .select('id, image_url')
    .eq('id', memberId)
    .maybeSingle();

  if (memberError) return { data: null, error: memberError };
  if (!member) return { data: null, error: { message: 'Member not found', code: 'NOT_FOUND' } };

  if (member.image_url) {
    const oldPath = member.image_url.replace(/^team-photos\//, '');
    await supabase.storage.from('team-photos').remove([oldPath]);
  }

  const storagePath = generatePhotoPath(memberId, originalName, mimeType);

  const { error: uploadError } = await supabase.storage
    .from('team-photos')
    .upload(storagePath, fileBuffer, {
      contentType: mimeType,
      upsert: false
    });

  if (uploadError) return { data: null, error: uploadError };

  const fullStoragePath = `team-photos/${storagePath}`;
  const { error: updateError } = await supabase
    .from('team_members')
    .update({ image_url: fullStoragePath, updated_at: new Date().toISOString() })
    .eq('id', memberId);

  if (updateError) {
    await supabase.storage.from('team-photos').remove([storagePath]);
    return { data: null, error: updateError };
  }

  const publicUrl = getPhotoPublicUrl(fullStoragePath);

  return {
    data: { storagePath: fullStoragePath, publicUrl },
    error: null
  };
}

async function removePhoto(memberId) {
  const { data: member, error: memberError } = await supabase
    .from('team_members')
    .select('id, image_url')
    .eq('id', memberId)
    .maybeSingle();

  if (memberError) return { data: null, error: memberError };
  if (!member) return { data: null, error: { message: 'Member not found', code: 'NOT_FOUND' } };
  if (!member.image_url) return { data: null, error: { message: 'Member has no photo', code: 'NO_PHOTO' } };

  const storagePath = member.image_url.replace(/^team-photos\//, '');
  const { error: removeError } = await supabase.storage
    .from('team-photos')
    .remove([storagePath]);

  if (removeError) {
    console.error('Storage removal error:', removeError);
  }

  const { data: updated, error: updateError } = await supabase
    .from('team_members')
    .update({ image_url: null, updated_at: new Date().toISOString() })
    .eq('id', memberId)
    .select(ADMIN_SELECT_FIELDS)
    .single();

  if (updateError) return { data: null, error: updateError };

  return { data: enrichPhotoUrl(updated), error: null };
}

module.exports = {
  getPublicTeam,
  getAllTeamsAdmin,
  getTeamByIdAdmin,
  createTeam,
  updateTeam,
  archiveTeam,
  getAllMembersAdmin,
  getMemberByIdAdmin,
  createMember,
  updateMember,
  archiveMember,
  assignTeamLead,
  removeTeamLead,
  uploadPhoto,
  removePhoto
};
