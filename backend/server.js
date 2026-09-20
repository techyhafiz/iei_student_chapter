// This file is the entry point for the backend server.
// It imports the configured Express app and starts listening on a specific port.

require('dotenv').config(); // Load environment variables from a .env file (if it exists)
const app = require('./app');
const eventsLifecycleService = require('./services/events.lifecycle');

// Define the port to run the server on.
// It will use the PORT environment variable if available, otherwise it defaults to 5000.
const PORT = process.env.PORT || 5000;

// Start the server and listen for incoming requests on the specified port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// ============================================================
// EVENT LIFECYCLE SCHEDULER
// ============================================================

let lifecycleInterval = null;
let isRunning = false;

function startLifecycleScheduler() {
  if (lifecycleInterval) return; // Prevent duplicate schedulers

  // Run immediately on startup (dry-run first for logging)
  eventsLifecycleService.dryRunLifecycle().then(({ data }) => {
    console.log(`[Lifecycle] Startup dry-run: ${data.total_published} published events, ${data.would_transition_to_draft.length} would transition`);
  }).catch(console.error);

  // Execute every 60 seconds
  lifecycleInterval = setInterval(() => {
    if (isRunning) {
      console.log('[Lifecycle] Previous run still in progress, skipping...');
      return;
    }
    isRunning = true;
    eventsLifecycleService.executeLifecycle().then(({ data }) => {
      if (data.transitioned.length > 0) {
        console.log(`[Lifecycle] Transitioned ${data.transitioned.length} events to draft:`);
        data.transitioned.forEach(e => console.log(`  - ${e.title}`));
      } else {
        console.log('[Lifecycle] No events needed transition');
      }
    }).catch(console.error).finally(() => {
      isRunning = false;
    });
  }, 60000); // 60-second interval

  console.log('[Lifecycle] Scheduler started (60s interval)');
}

// Graceful shutdown
function stopLifecycleScheduler() {
  if (lifecycleInterval) {
    clearInterval(lifecycleInterval);
    lifecycleInterval = null;
    isRunning = false;
    console.log('[Lifecycle] Scheduler stopped');
  }
}

// Handle process termination
process.on('SIGINT', () => { stopLifecycleScheduler(); process.exit(0); });
process.on('SIGTERM', () => { stopLifecycleScheduler(); process.exit(0); });

// Start the scheduler
startLifecycleScheduler();
