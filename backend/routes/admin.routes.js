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

module.exports = router;
