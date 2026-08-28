const teamService = require('../services/team.service');

const VALID_SECTIONS = ['Faculty', 'Executive', 'Team'];
const VALID_STATUSES = ['draft', 'published', 'archived'];

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function handleDbError(res, error, defaultMessage = 'Failed to perform operation') {
  if (error.code === '23505') { // Postgres Unique Violation
    if (error.message.includes('unique_published_singleton_position')) {
      return res.status(400).json({
        success: false,
        message: 'A published member for this singleton position already exists. Archive the existing member before assigning a new one.'
      });
    }
    if (error.message.includes('unique_published_team_lead')) {
      return res.status(400).json({
        success: false,
        message: 'This team already has a published lead.'
      });
    }
  }
  
  if (error.code === 'PGRST116') {
    return res.status(404).json({ success: false, message: 'Record not found' });
  }

  console.error('Database error:', error);
  return res.status(500).json({ success: false, message: defaultMessage });
}

// ============================================================
// PUBLIC CONTROLLER
// ============================================================

async function getPublicTeam(req, res) {
  try {
    const { data, error } = await teamService.getPublicTeam();
    if (error) {
      console.error('Error fetching public team:', error);
      return res.status(500).json({ success: false, message: 'Failed to retrieve team data' });
    }
    return res.json(data);
  } catch (error) {
    console.error('Unexpected error in getPublicTeam:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

// ============================================================
// ADMIN CONTROLLERS - TEAMS
// ============================================================

async function listAdminTeams(req, res) {
  try {
    const { data, error } = await teamService.getAllTeamsAdmin();
    if (error) return handleDbError(res, error, 'Failed to retrieve teams');
    return res.json({ success: true, teams: data });
  } catch (error) {
    console.error('Unexpected error in listAdminTeams:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function getAdminTeam(req, res) {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ success: false, message: 'Invalid team ID format' });

    const { data, error } = await teamService.getTeamByIdAdmin(id);
    if (error) return handleDbError(res, error, 'Failed to retrieve team');
    if (!data) return res.status(404).json({ success: false, message: 'Team not found' });

    return res.json({ success: true, team: data });
  } catch (error) {
    console.error('Unexpected error in getAdminTeam:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function createTeam(req, res) {
  try {
    const { name, display_order, status } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Team name is required' });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const teamData = { name: name.trim(), display_order, status };
    const { data, error } = await teamService.createTeam(teamData);

    if (error) return handleDbError(res, error, 'Failed to create team');
    return res.status(201).json({ success: true, message: 'Team created successfully', team: data });
  } catch (error) {
    console.error('Unexpected error in createTeam:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function updateTeam(req, res) {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ success: false, message: 'Invalid team ID format' });

    const { name, display_order, status } = req.body;
    
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ success: false, message: 'Team name cannot be empty' });
    }
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const updateData = { ...req.body };
    if (updateData.name) updateData.name = updateData.name.trim();

    const { data, error } = await teamService.updateTeam(id, updateData);
    if (error) return handleDbError(res, error, 'Failed to update team');
    return res.json({ success: true, message: 'Team updated successfully', team: data });
  } catch (error) {
    console.error('Unexpected error in updateTeam:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function archiveTeam(req, res) {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ success: false, message: 'Invalid team ID format' });

    const { data, error } = await teamService.archiveTeam(id);
    if (error) return handleDbError(res, error, 'Failed to archive team');
    return res.json({ success: true, message: 'Team archived successfully', team: data });
  } catch (error) {
    console.error('Unexpected error in archiveTeam:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

// ============================================================
// ADMIN CONTROLLERS - TEAM MEMBERS
// ============================================================

async function listAdminMembers(req, res) {
  try {
    const { data, error } = await teamService.getAllMembersAdmin();
    if (error) return handleDbError(res, error, 'Failed to retrieve members');
    return res.json({ success: true, members: data });
  } catch (error) {
    console.error('Unexpected error in listAdminMembers:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function getAdminMember(req, res) {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ success: false, message: 'Invalid member ID format' });

    const { data, error } = await teamService.getMemberByIdAdmin(id);
    if (error) return handleDbError(res, error, 'Failed to retrieve member');
    if (!data) return res.status(404).json({ success: false, message: 'Member not found' });

    return res.json({ success: true, member: data });
  } catch (error) {
    console.error('Unexpected error in getAdminMember:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function validateMemberPayload(body) {
  const errors = [];
  const { section, name, position, team_id, is_lead, status } = body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('Name is required');
  }
  if (!section || !VALID_SECTIONS.includes(section)) {
    errors.push(`Section must be one of: ${VALID_SECTIONS.join(', ')}`);
  }
  if (status && !VALID_STATUSES.includes(status)) {
    errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  if (section === 'Faculty' || section === 'Executive') {
    if (team_id !== null && team_id !== undefined) errors.push(`${section} members cannot belong to a team (team_id must be null)`);
    if (is_lead === true) errors.push(`${section} members cannot be leads (is_lead must be false)`);
    if (!position || typeof position !== 'string' || position.trim().length === 0) {
      errors.push(`Position is required for ${section} members`);
    }
  } else if (section === 'Team') {
    if (!team_id) errors.push('team_id is required for Team members');
    else if (!isValidUUID(team_id)) errors.push('team_id must be a valid UUID');
  }

  return errors;
}

async function createMember(req, res) {
  try {
    const validationErrors = await validateMemberPayload(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ success: false, message: validationErrors.join('; ') });
    }

    const memberData = {
      ...req.body,
      name: req.body.name.trim(),
      position: req.body.position ? req.body.position.trim() : null
    };

    const { data, error } = await teamService.createMember(memberData);
    if (error) return handleDbError(res, error, 'Failed to create member');
    return res.status(201).json({ success: true, message: 'Member created successfully', member: data });
  } catch (error) {
    console.error('Unexpected error in createMember:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function updateMember(req, res) {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ success: false, message: 'Invalid member ID format' });

    // We do full validation but allow partial updates by merging with existing data first?
    // Let's keep it simple: if fields are provided, validate them loosely.
    const { section, name, status, team_id, is_lead, position } = req.body;
    
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ success: false, message: 'Name cannot be empty' });
    }
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (section !== undefined && !VALID_SECTIONS.includes(section)) {
      return res.status(400).json({ success: false, message: `Section must be one of: ${VALID_SECTIONS.join(', ')}` });
    }

    const updateData = { ...req.body };
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.position) updateData.position = updateData.position.trim();

    const { data, error } = await teamService.updateMember(id, updateData);
    if (error) return handleDbError(res, error, 'Failed to update member');
    return res.json({ success: true, message: 'Member updated successfully', member: data });
  } catch (error) {
    console.error('Unexpected error in updateMember:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function archiveMember(req, res) {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ success: false, message: 'Invalid member ID format' });

    const { data, error } = await teamService.archiveMember(id);
    if (error) return handleDbError(res, error, 'Failed to archive member');
    return res.json({ success: true, message: 'Member archived successfully', member: data });
  } catch (error) {
    console.error('Unexpected error in archiveMember:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

// ============================================================
// ADMIN CONTROLLERS - LEAD MANAGEMENT
// ============================================================

async function assignTeamLead(req, res) {
  try {
    const { id, memberId } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ success: false, message: 'Invalid team ID format' });
    if (!isValidUUID(memberId)) return res.status(400).json({ success: false, message: 'Invalid member ID format' });

    const { data, error } = await teamService.assignTeamLead(id, memberId);
    if (error) return handleDbError(res, error, 'Failed to assign team lead');
    return res.json({ success: true, message: 'Team lead assigned successfully', member: data });
  } catch (error) {
    console.error('Unexpected error in assignTeamLead:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function removeTeamLead(req, res) {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ success: false, message: 'Invalid team ID format' });

    const { data, error } = await teamService.removeTeamLead(id);
    if (error) return handleDbError(res, error, 'Failed to remove team lead');
    return res.json({ success: true, message: 'Team lead removed successfully', members: data });
  } catch (error) {
    console.error('Unexpected error in removeTeamLead:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

// ============================================================
// ADMIN CONTROLLERS - PHOTOS
// ============================================================

async function uploadPhoto(req, res) {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ success: false, message: 'Invalid member ID format' });

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo file provided' });
    }

    const { data, error } = await teamService.uploadPhoto(
      id,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    if (error) {
      if (error.code === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Member not found' });
      console.error('Error uploading photo:', error);
      return res.status(500).json({ success: false, message: 'Failed to upload photo' });
    }

    return res.json({ success: true, message: 'Photo uploaded successfully', photo: data });
  } catch (error) {
    console.error('Unexpected error in uploadPhoto:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

async function removePhoto(req, res) {
  try {
    const { id } = req.params;
    if (!isValidUUID(id)) return res.status(400).json({ success: false, message: 'Invalid member ID format' });

    const { data, error } = await teamService.removePhoto(id);
    if (error) {
      if (error.code === 'NOT_FOUND') return res.status(404).json({ success: false, message: 'Member not found' });
      if (error.code === 'NO_PHOTO') return res.status(400).json({ success: false, message: 'Member has no photo to remove' });
      console.error('Error removing photo:', error);
      return res.status(500).json({ success: false, message: 'Failed to remove photo' });
    }

    return res.json({ success: true, message: 'Photo removed successfully', member: data });
  } catch (error) {
    console.error('Unexpected error in removePhoto:', error);
    return res.status(500).json({ success: false, message: 'An unexpected error occurred' });
  }
}

module.exports = {
  getPublicTeam,
  listAdminTeams,
  getAdminTeam,
  createTeam,
  updateTeam,
  archiveTeam,
  listAdminMembers,
  getAdminMember,
  createMember,
  updateMember,
  archiveMember,
  assignTeamLead,
  removeTeamLead,
  uploadPhoto,
  removePhoto
};
