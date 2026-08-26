// This file is the entry point for the backend server.
// It imports the configured Express app and starts listening on a specific port.

require('dotenv').config(); // Load environment variables from a .env file (if it exists)
const app = require('./app');

// Define the port to run the server on.
// It will use the PORT environment variable if available, otherwise it defaults to 5000.
const PORT = process.env.PORT || 5000;

// Start the server and listen for incoming requests on the specified port
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
