use axum::routing::get;
use axum::{
    http::{StatusCode, Uri},
    response::IntoResponse,
    Router,
};
use std::net::SocketAddr;
use std::path::PathBuf;
use tower::ServiceBuilder;
use tower_http::trace::TraceLayer;
#[cfg(feature = "ws-proxy")]
use ws_proxy::websocket_router;

use tracing_subscriber::prelude::__tracing_subscriber_SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

use tower_http::{compression::CompressionLayer, services::ServeDir};

#[cfg(feature = "ws-proxy")]
mod ws_proxy;

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    #[cfg(feature = "ws-proxy")]
    let app = Router::new().nest("/socket.io/", websocket_router());
    #[cfg(not(feature = "ws-proxy"))]
    let app = Router::new();

    let app = app
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
        .route("/*file", get(serve_png_file))
        //ui
        .nest_service(
            "/iwd-audio/ui",
            ServeDir::new("../../server/mods/iwd-audio/ui"),
        )
        .nest_service(
            "/iwd-tutorial/ui",
            ServeDir::new("../../server/mods/iwd-tutorial/ui"),
        )
        .nest_service(
            "/iwd-leagues/ui",
            ServeDir::new("../../server/mods/iwd-leagues/ui"),
        )
        .nest_service(
            "/iwd-blisterwind/ui",
            ServeDir::new("../../server/mods/iwd-blisterwind/ui"),
        )
        .nest_service(
            "/iwd-trials-of-the-abyss/ui",
            ServeDir::new("../../server/mods/iwd-trials-of-the-abyss/ui"),
        )
        .nest_service(
            "/iwd-mail/ui",
            ServeDir::new("../../server/mods/iwd-mail/ui"),
        )
        .nest_service(
            "/iwd-mtx-stash/ui",
            ServeDir::new("../../server/mods/iwd-mtx-stash/ui"),
        )
        .nest_service(
            "/iwd-patreon/ui",
            ServeDir::new("../../server/mods/iwd-patreon/ui"),
        )
        .nest_service(
            "/iwd-online-list/ui",
            ServeDir::new("../../server/mods/iwd-online-list/ui"),
        )
        .nest_service(
            "/iwd-report-issue/ui",
            ServeDir::new("../../server/mods/iwd-report-issue/ui"),
        )
        .nest_service(
            "/iwd-fast-travel/ui",
            ServeDir::new("../../server/mods/iwd-fast-travel/ui"),
        )
        .nest_service(
            "/iwd-confirm-action/ui",
            ServeDir::new("../../server/mods/iwd-confirm-action/ui"),
        )
        .nest_service(
            "/iwd-crews/ui",
            ServeDir::new("../../server/mods/iwd-crews/ui"),
        )
        .nest_service(
            "/iwd-construction/ui",
            ServeDir::new("../../server/mods/iwd-construction/ui"),
        )
        .nest_service(
            "/iwd-mtx-shop/ui",
            ServeDir::new("../../server/mods/iwd-mtx-shop/ui"),
        )
        .nest_service(
            "/iwd-trading/ui",
            ServeDir::new("../../server/mods/iwd-trading/ui"),
        )
        //audio
        .nest_service(
            "/iwd-audio/audio",
            ServeDir::new("../../server/mods/iwd-audio/audio"),
        )
        //clientComponents
        .nest_service(
            "/iwd-blisterwind/clientComponents",
            ServeDir::new("../../server/mods/iwd-blisterwind/clientComponents"),
        )
        .nest_service(
            "/iwd-ranger/clientComponents",
            ServeDir::new("../../server/mods/iwd-ranger/clientComponents"),
        )
        .nest_service(
            "/iwd-gaekatla-temple/clientComponents",
            ServeDir::new("../../server/mods/iwd-gaekatla-temple/clientComponents"),
        )
}

async fn serve_png_file(uri: Uri) -> impl IntoResponse {
    // Extract the path from the URI
    let path = uri.path().trim_start_matches('/');

    // Construct the full path
    let mut full_path = PathBuf::from("../../server/mods");
    full_path.push(path);

    // Check if the file has a .png extension
    if full_path.extension().and_then(|ext| ext.to_str()) == Some("png") {
        // Serve the file if it's a PNG
        match tokio::fs::read(full_path).await {
            Ok(file_content) => (
                StatusCode::OK,
                [("Content-Type", "image/png")],
                file_content,
            )
                .into_response(),
            Err(_) => (StatusCode::NOT_FOUND, "File not found".to_string()).into_response(),
        }
    } else {
        // If the file is not a PNG, return 404
        (StatusCode::NOT_FOUND, "Not a PNG file".to_string()).into_response()
    }
}
