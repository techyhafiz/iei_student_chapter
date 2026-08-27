const supabase = require('../config/supabase');

/**
 * Middleware: requireAdmin
 * Must be used AFTER requireAuth.
 * Resolves the authenticated Supabase user to a public.admins record.
 * Attaches req.admin = { id, name, email, role, permissions } to the request.
 * Returns 403 if the user is not a valid admin (super_admin or admin).
 */
const requireAdmin = async (req, res, next) => {
  try {
    const authUserId = req.user.id;

    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, name, email, role, permissions')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (error) {
      console.error('Permission middleware - DB error:', error);
      return res.status(500).json({ success: false, message: 'Server error during authorization' });
    }

    if (!admin || (admin.role !== 'super_admin' && admin.role !== 'admin')) {
      return res.status(403).json({ success: false, message: 'Forbidden: You are not authorized as an admin' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    console.error('Permission middleware error:', error);
    res.status(500).json({ success: false, message: 'Server error during authorization' });
  }
};

/**
 * Middleware factory: requirePermission(permissionKey)
 * Must be used AFTER requireAdmin.
 * Checks that req.admin has the specified permission flag set to true.
 * Super Admins automatically bypass all permission checks.
 *
 * Usage: requirePermission('events')
 *
 * @param {string} permissionKey - The permission key to check (e.g., 'events', 'team', 'gallery', 'calendar')
 * @returns {Function} Express middleware
 */
const requirePermission = (permissionKey) => {
  return (req, res, next) => {
    // Super Admin bypasses all permission checks
    if (req.admin.role === 'super_admin') {
      return next();
    }

    // Check the specific permission in the JSONB permissions object
    const permissions = req.admin.permissions;
    if (permissions && permissions[permissionKey] === true) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Forbidden: You do not have ${permissionKey} management permission`
    });
  };
};

module.exports = { requireAdmin, requirePermission };
