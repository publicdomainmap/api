#!/bin/sh

# Print a message to the console indicating that the prebuilt modules are being moved.
echo "Moving prebuilt modules"
echo "***************************"

# Create a file to indicate that the modules are being moved.
touch /usr/src/node_modules/_moving

# Move all the modules from /usr/src/node_modules/ to ./node_modules/
mv /usr/src/node_modules/* ./node_modules/

# Remove the indicator file.
rm ./node_modules/_moving


# Check if the NODE_ENV environment variable is set to "production".
if [ "$NODE_ENV" = "production" ]
then
  # If NODE_ENV is "production", start the application in production mode.
  echo "***************************"
  echo "STARTING IN PRODUCTION MODE"
  echo "***************************"
  npm start
else
  # If NODE_ENV is not "production", assume it is "development".
  # list the contents of the node_modules folder (the ones that were moved).
  ls ./node_modules/

  # Print a separator line to the console.
  echo "***************************"
  echo
  
  # Start in development mode
  echo "***************************"
  echo "STARTING IN DEVELOPMENT MODE"
  echo "***************************"
  echo
  
  # Install any development modules not already present.
  echo "Installing Dev modules"
  npm install
  echo
  
  # Start the application in development mode with a file watcher.
  echo "Starting node with watch task"
  npm run-script watch
fi
