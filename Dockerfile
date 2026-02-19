FROM rust:1.90-bookworm AS rust

RUN apt install -y wget

WORKDIR /dl
RUN wget https://nodejs.org/dist/v22.14.0/node-v22.14.0-linux-x64.tar.xz

RUN tar -xf node-v22.14.0-linux-x64.tar.xz
RUN mv /dl/node-v22.14.0-linux-x64 /node
RUN cp /node/bin/* /usr/bin/

WORKDIR /source
COPY ./src/rust-modules/ .

RUN /node/bin/npm i
RUN /node/bin/npm run build

# Base image on Node.js latest LTS
FROM node:lts-bookworm-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends netcat-openbsd \
	&& rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app/isleward

# Bundle app source
COPY . .

RUN rm -r ./src/rust-modules
RUN mkdir ./src/rust-modules
COPY --from=rust /source/index.js ./src/rust-modules/
COPY --from=rust /source/package*.json ./src/rust-modules/
COPY --from=rust /source/rust-modules.linux-x64-gnu.node ./src/rust-modules/

# Change directory to src/server/
WORKDIR /app/isleward/src/server/

# Install only production npm modules specified in package.json
RUN npm ci --omit=dev

# Expose container's port 5000
EXPOSE 5000

# Launch Isleward server
CMD ["node", "index.js"]
