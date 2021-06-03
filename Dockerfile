FROM node:14

# Create app directory
WORKDIR /usr/src/app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
RUN mkdir -p /usr/src/node_modules
RUN cd /usr/src/node_modules

COPY package*.json ./

# Always get the latest NPM
RUN npm install -g npm@latest
RUN npm install -g nodemon

# Only add the production dependencies to the Docker, in dev mode, we add everything
RUN npm install --package-lock
RUN npm ci --only=production

# Move back to the main app dir
RUN cd /usr/src/app
