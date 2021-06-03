#!/bin/sh

echo "Moving prebuilt modules"
echo "***************************"
touch /usr/src/node_modules/_moving
mv /usr/src/node_modules/* ./node_modules/
rm ./node_modules/_moving
ls ./node_modules/
echo "***************************"
echo

if [ "$NODE_ENV" = "production" ]
then
  echo "***************************"
  echo "STARTING IN PRODUCTION MODE"
  echo "***************************"
  npm start
else
  echo "***************************"
  echo "STARTING IN DEVELOPMENT MODE"
  echo "***************************"
  echo
  echo "Installing Dev modules"
  npm install
  echo
  echo "Starting node with watch task"
  npm run-script watch
fi

