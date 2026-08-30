const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');
const { requireAuth } = require('../middleware/auth.middleware');

// Route for admin login (Email + Password)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate that email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    // Authenticate using an isolated Supabase Auth client to prevent polluting the global Admin client
    const { createClient } = require('@supabase/supabase-js');
    const authClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
      email,
      password
    });

    if (authError || !authData?.session) {
      console.error(`Login failed for email: ${email}`, authError);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const authUserId = authData.user.id;

    // Query the public.admins table using auth_user_id
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('id, name, email, phone, role, permissions')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (adminError) {
      console.error('Admin database error during login:', adminError);
      return res.status(500).json({
        success: false,
        message: "Database error occurred"
      });
    }

    // Only allow users whose role is super_admin or admin
    if (!admin || (admin.role !== 'super_admin' && admin.role !== 'admin')) {
      console.error(`Unauthorized role access attempt for auth_user_id: ${authUserId}`);
      return res.status(403).json({
        success: false,
        message: "You are not authorized as an admin"
      });
    }

    // On successful authentication, return user data, access token, and refresh token
    return res.json({
      success: true,
      message: "Login successful",
      token: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      user: {
        id: admin.id,
        auth_user_id: authUserId,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        permissions: admin.permissions
      }
    });

  } catch (error) {
    console.error('Unexpected error in /login:', error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred"
    });
  }
});

// Route to refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: "No refresh token provided" });
    }

    const { createClient } = require('@supabase/supabase-js');
    const authClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: authData, error: authError } = await authClient.auth.refreshSession({ refresh_token: refreshToken });

    if (authError || !authData?.session) {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
    }

    return res.json({
      success: true,
      token: authData.session.access_token,
      refreshToken: authData.session.refresh_token
    });
  } catch (err) {
    console.error('Unexpected error in /refresh:', err);
    return res.status(500).json({ success: false, message: "An unexpected error occurred" });
  }
});

// Route for Super Admin to reset a normal admin's password
router.post('/admin/reset-password', requireAuth, async (req, res) => {
  try {
    const requesterAuthId = req.user.id;
    const { adminId, newPassword, confirmPassword } = req.body;

    // Validate inputs
    if (!adminId || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters long" });
    }

    // 1. Verify requester is super_admin
    const { data: requester, error: reqError } = await supabase
      .from('admins')
      .select('role')
      .eq('auth_user_id', requesterAuthId)
      .maybeSingle();

    if (reqError || !requester || requester.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: "Forbidden: You are not authorized to perform this action" });
    }

    // 2. Find target admin using admins.id
    const { data: targetAdmin, error: targetError } = await supabase
      .from('admins')
      .select('auth_user_id, role')
      .eq('id', adminId)
      .maybeSingle();

    if (targetError || !targetAdmin) {
      return res.status(404).json({ success: false, message: "Target admin not found" });
    }

    if (targetAdmin.role !== 'admin') {
      return res.status(403).json({ success: false, message: "Only normal admins can have their passwords reset via this endpoint" });
    }

    // 3. Ensure super_admin is not targeting themselves via this route
    if (targetAdmin.auth_user_id === requesterAuthId) {
      return res.status(403).json({ success: false, message: "Super Admins cannot reset their own password via this endpoint" });
    }

    // 4. Update password using Supabase Admin Auth API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      targetAdmin.auth_user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Error updating user password via Admin API:', updateError);
      return res.status(500).json({ success: false, message: "Failed to reset password" });
    }

    return res.json({
      success: true,
      message: "Admin password reset successfully"
    });

  } catch (error) {
    console.error('Unexpected error in /admin/reset-password:', error);
    return res.status(500).json({
      success: false,
      message: "An unexpected error occurred"
    });
  }
});

module.exports = router;
