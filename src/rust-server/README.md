## What is this?

A static file server to serve all static files for IWD to the browser/client.

## Running the server for development

The server can be started with a built-in websocket proxy to the IWD nodejs server. Websockets has not been ported to rust yet as the largest load on the node server currently is serving static files.

## Prerequisites

* [Rust and cargo](https://www.rust-lang.org/tools/install)
* IWD Nodejs server running. The Websocket proxy will not work without the IWD server, but the static content will still be served.

## Run with proxy

```bash
cd isleward/src/rust-server/src
cargo r --features ws-proxy
```

## Run without proxy

This runs just the static fileserver and is not really useful when running locally. This is mostly used in combination with a reverse proxy like nginx that can split requests between the node and rust servers.

```bash
cd isleward/src/rust-server/src
cargo r
```

## Features

### production

Enables all compiler feature flags for use in production.

### ws-proxy

Enables the websocket reverse proxy to a local instance of isleward

### compile-less

Enables less file compilation on server startup. This will crash if lessc is not installed