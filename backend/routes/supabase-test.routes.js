const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

router.get('/test-supabase', async (req, res) => {
  try {
    // Perform a minimal query to verify connection.
    // We expect this to fail if the table doesn't exist,
    // but the error structure will confirm we reached the Supabase API.
    const { data, error } = await supabase.from('_dummy_table_for_test').select('*').limit(1);

    const isSchemaError = error && error.message && error.message.includes('schema cache');
    if (error && error.code !== '42P01' && !isSchemaError) {
      // 42P01 is the PostgreSQL error code for "relation does not exist"
      // "schema cache" error is returned by PostgREST when the table doesn't exist.
      // If we get these errors, it means we successfully connected to the database
      // but the table wasn't there, which is expected.
      // Any other error means a real connection/auth issue.
      throw error;
    }

    res.json({
      success: true,
      message: "Successfully connected to Supabase API."
    });
  } catch (error) {
    console.error('Supabase connection error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to connect to Supabase API.",
      error: error.message || error
    });
  }
});

module.exports = router;
