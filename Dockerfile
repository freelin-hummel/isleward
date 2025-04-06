FROM rust:1.82-bullseye AS rust

RUN apt install -y wget

WORKDIR /dl
RUN wget https://nodejs.org/dist/v20.18.0/node-v20.18.0-linux-x64.tar.xz

RUN tar -xf node-v20.18.0-linux-x64.tar.xz
RUN mv /dl/node-v20.18.0-linux-x64 /node
RUN cp /node/bin/* /usr/bin/

WORKDIR /source
COPY ./src/rust-modules/ .

RUN /node/bin/npm i
RUN /node/bin/npm run build

# Base image on Node.js latest LTS
FROM node:lts-bullseye-slim

# Create app directory
WORKDIR /usr/src/isleward

# Bundle app source
COPY . .

RUN rm -r ./src/rust-modules
RUN mkdir ./src/rust-modules
COPY --from=rust /source/index.js ./src/rust-modules/
COPY --from=rust /source/package*.json ./src/rust-modules/
COPY --from=rust /source/rust-modules.linux-x64-gnu.node ./src/rust-modules/

# Change directory to src/server/
WORKDIR /usr/src/isleward/src/server/

# Install only production npm modules specified in package.json
RUN npm ci --omit=dev

# Expose container's port 4000
EXPOSE 4000

# Launch Isleward server
CMD ["node", "index.js"]
