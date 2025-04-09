FROM rust:1.86-bookworm AS rust

WORKDIR /source
COPY ./rust-server .
RUN cargo b --release --features production

FROM node:lts-bookworm-slim AS node

RUN npm install less -g
WORKDIR /node
COPY . .
RUN for file in $(find . -name '*.less*'); do echo "Processing $file"; lessc -x --strict-imports $file $(dirname $file)/$(basename $file .less).css ; done
WORKDIR /node/client
RUN npm i
RUN npm run build

FROM debian:bookworm-slim

WORKDIR /app/static/client
COPY --from=node ./node/client/dist/. .

WORKDIR /app/
COPY --from=rust /source/target/release/rust-server .
RUN chmod +x rust-server

ENV SERVE_PATH=/app/static/

CMD ["/app/rust-server"]