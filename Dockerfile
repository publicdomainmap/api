# Use the official Node.js LTS Alpine image as the base image
FROM node:lts-alpine3.16

# Set the working directory inside the container
WORKDIR /usr/src/app

# Create a directory to store prebuilt Node.js modules
RUN mkdir -p /usr/src/node_modules
RUN cd /usr/src/node_modules

# Copy the package.json and package-lock.json files to the working directory
COPY package*.json ./

# Always get the latest NPM and install Nodemon globally
RUN npm install -g npm@latest
RUN npm install -g nodemon

# Install the production dependencies (only)
RUN npm install --package-lock
RUN npm ci --only=production

# Move back to the main app directory
RUN cd /usr/src/app
