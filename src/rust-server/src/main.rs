use axum::Router;

use std::net::SocketAddr;
use tower::ServiceBuilder;
use tower_http::trace::TraceLayer;

use tracing_subscriber::prelude::__tracing_subscriber_SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

use tower_http::{compression::CompressionLayer, services::ServeDir};

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let app = Router::new()
        .nest_service("/", ServeDir::new("../../client"))
        .nest("/server", server_router())
        .layer(
            ServiceBuilder::new()
                .layer(CompressionLayer::new())
                .layer(TraceLayer::new_for_http())
                .into_inner(),
        );

    let addr = SocketAddr::from(([127, 0, 0, 1], 4001));
    println!("Server listening on {}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

fn server_router() -> Router {
    Router::new()
        .nest_service(
            "/clientComponents",
            ServeDir::new("../../server/clientComponents"),
        )
        .nest("/mods", mods_router())
}

fn mods_router() -> Router {
    Router::new()
        .nest_service("/ui", ServeDir::new("../../server/mods/ui"))
        .nest_service("/audio", ServeDir::new("../../server/mods/audio"))
}
