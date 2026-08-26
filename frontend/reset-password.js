// Initialize Supabase Client
const SUPABASE_URL = 'https://nimybmudddelfjcyaihi.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_V1SaDbRST-l1dzKHE9TeXQ_TNrZABEO';

// Avoid duplicate declaration of 'supabase' which is provided by CDN
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const resetFormContainer = document.getElementById('resetFormContainer');
const successContainer = document.getElementById('successContainer');
const resetPasswordForm = document.getElementById('resetPasswordForm');
const resetErrorMsg = document.getElementById('resetErrorMsg');
const submitBtn = resetPasswordForm.querySelector('button[type="submit"]');

// Disable the submit button until the recovery session is established
submitBtn.disabled = true;
let isRecoverySessionActive = false;

// Listen for the recovery session
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY') {
    isRecoverySessionActive = true;
    submitBtn.disabled = false;
  }
});

// Reset Password Handler
resetPasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  resetErrorMsg.classList.add('hidden');
  resetErrorMsg.textContent = '';

  if (!isRecoverySessionActive) {
    resetErrorMsg.textContent = 'Recovery session is missing or expired. Please use the email link again.';
    resetErrorMsg.classList.remove('hidden');
    return;
  }

  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    resetErrorMsg.textContent = 'Passwords do not match';
    resetErrorMsg.classList.remove('hidden');
    return;
  }

  if (newPassword.length < 8) {
    resetErrorMsg.textContent = 'Password must be at least 8 characters long';
    resetErrorMsg.classList.remove('hidden');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Updating...';

  try {
    const { data, error } = await supabaseClient.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw error;
    }

    // Explicitly sign out to destroy the temporary frontend recovery session
    const { error: signOutError } = await supabaseClient.auth.signOut();
    if (signOutError) {
      console.warn("Sign out after password reset failed:", signOutError.message);
      // We don't fail the password reset if sign out fails, as the password WAS updated.
    }

    // Success
    resetFormContainer.classList.add('hidden');
    successContainer.classList.remove('hidden');
    
    // Clear passwords from memory explicitly
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    resetPasswordForm.reset();
  } catch (err) {
    resetErrorMsg.textContent = err.message || 'Failed to update password';
    resetErrorMsg.classList.remove('hidden');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Update Password';
  }
});
