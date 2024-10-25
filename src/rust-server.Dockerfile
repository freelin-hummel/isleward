FROM rust:1.82-bullseye as rust

WORKDIR /source

COPY ./rust-server/ .

RUN cargo b --release --features production

FROM debian:bullseye-slim

RUN apt update && apt install -y node-less
WORKDIR /app/static/

COPY ./client/ ./client/
COPY ./server/clientComponents/ ./server/clientComponents/
COPY ./server/mods/ ./server/mods/

WORKDIR /app/

COPY --from=rust /source/target/release/rust-server .
RUN chmod +x rust-server

ENV SERVE_PATH=/app/static/

CMD ["/app/rust-server"]