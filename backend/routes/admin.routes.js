const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth.middleware');

// Route to list normal admins (only accessible by Super Admin)
router.get('/', requireAuth, async (req, res) => {
  try {
    const requesterAuthId = req.user.id;

    // Verify requester is super_admin
    const { data: requester, error: reqError } = await supabase
      .from('admins')
      .select('role')
      .eq('auth_user_id', requesterAuthId)
      .maybeSingle();

    if (reqError || !requester || requester.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: "Forbidden: You are not authorized to view admins" });
    }

    // Fetch only normal admins
    const { data: admins, error: fetchError } = await supabase
      .from('admins')
      .select('id, name, email, phone, role, permissions, auth_user_id')
      .eq('role', 'admin');

    if (fetchError) {
      console.error('Error fetching admins:', fetchError);
      return res.status(500).json({ success: false, message: "Failed to retrieve admins" });
    }

    return res.json({
      success: true,
      admins
    });

  } catch (error) {
    console.error('Unexpected error in GET /api/admins:', error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred"
    });
  }
});

// Route to update a normal admin's permissions (only accessible by Super Admin)
router.patch('/:id/permissions', requireAuth, async (req, res) => {
  try {
    const requesterAuthId = req.user.id;
    const targetAdminId = req.params.id;
    const { permission, enabled } = req.body;

    const VALID_PERMISSIONS = ['team', 'events', 'gallery', 'calendar'];

    // 1. Validate inputs
    if (!targetAdminId) {
      return res.status(400).json({ success: false, message: "Missing target admin ID" });
    }
    if (!permission || !VALID_PERMISSIONS.includes(permission)) {
      return res.status(400).json({ success: false, message: "Invalid or missing permission key" });
    }
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ success: false, message: "'enabled' must be a boolean" });
    }

    // 2. Verify requester is super_admin
    const { data: requester, error: reqError } = await supabase
      .from('admins')
      .select('role')
      .eq('auth_user_id', requesterAuthId)
      .maybeSingle();

    if (reqError || !requester || requester.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: "Forbidden: You are not authorized to perform this action" });
    }

    // 3. Find target admin using admins.id
    const { data: targetAdmin, error: targetError } = await supabase
      .from('admins')
      .select('auth_user_id, role, permissions')
      .eq('id', targetAdminId)
      .maybeSingle();

    if (targetError || !targetAdmin) {
      return res.status(404).json({ success: false, message: "Target admin not found" });
    }

    // 4. Ensure target is a normal admin and not the requester themselves
    if (targetAdmin.role === 'super_admin') {
      return res.status(403).json({ success: false, message: "Cannot modify permissions of a Super Admin" });
    }
    if (targetAdmin.auth_user_id === requesterAuthId) {
      return res.status(403).json({ success: false, message: "Super Admins cannot modify their own permissions" });
    }

    // 5. Safely merge the new permission into the existing JSONB object
    const currentPermissions = targetAdmin.permissions || {};
    const newPermissions = {
      ...currentPermissions,
      [permission]: enabled
    };

    // 6. Update the permissions column
    const { error: updateError } = await supabase
      .from('admins')
      .update({ permissions: newPermissions })
      .eq('id', targetAdminId);

    if (updateError) {
      console.error('Error updating admin permissions:', updateError);
      return res.status(500).json({ success: false, message: "Failed to update permissions" });
    }

    return res.json({
      success: true,
      message: "Permission updated successfully",
      permission,
      enabled
    });

  } catch (error) {
    console.error('Unexpected error in PATCH /api/admins/:id/permissions:', error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred"
    });
  }
});

module.exports = router;
