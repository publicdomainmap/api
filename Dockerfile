# Use the official Node.js LTS Alpine image as the base image
FROM node:lts-alpine3.16

# Create a directory to store prebuilt application
RUN mkdir -p /usr/src/prebuilt
RUN cd /usr/src/prebuilt

# Copy the package.json and package-lock.json files to the working directory
COPY . /usr/src/prebuilt

# Always get the latest NPM and install Nodemon globally
RUN npm install -g npm@latest
RUN npm install -g nodemon
RUN npm install -g typescript

# Install the production dependencies (only)
RUN cd /usr/src/prebuilt && npm install

# Build the application
RUN cd /usr/src/prebuilt && npm run build 

# Set the working directory inside the container
WORKDIR /usr/src/app
# Move to the main app directory
RUN cd /usr/src/app
