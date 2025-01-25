## What is this?

A rust project that implements physics functions to be used by IWD nodejs code.

## Building the module

On first clone the module has to be build before IWD server can start

### Prerequisites

* [Rust and cargo](https://www.rust-lang.org/tools/install)

### Optimized build (Takes longer)
```bash
cd isleward/src/rust-modules
npm run build
```

### Unoptimized build (Faster to complete)
```bash
cd isleward/src/rust-modules
npm run build:debug
```

After the build has completed you can start the IWD server

```bash
cd ../server
node index.js
```

### Logging

To enable debug/trace information from the rust module you can set an environment variable in the shell before starting the IWD server

```bash
# can be `RUST_LOG=trace` for verbose output
export RUST_LOG=debug
node index.js
```

This should show ouput like below:

```
Server: ready
2024-10-22T19:13:11.062785Z DEBUG rust_modules::physics: Building graph.
2024-10-22T19:13:11.103295Z DEBUG rust_modules::physics: Physics initialized
(M fjolarok): Ready
```