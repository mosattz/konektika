# Dockerfile for Konektika VPN Bundle Sharing Server
# NOTE: VPN/OpenVPN/EasyRSA utilities in this repo are currently Windows-specific.
# This image focuses on running the Node.js API. VPN certificate management that
# depends on Windows binaries will need adaptation for Linux containers.

FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

ENV NODE_ENV=production
ENV PORT=3000

# Expose API port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
