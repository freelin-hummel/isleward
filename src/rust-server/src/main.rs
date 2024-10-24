use axum::routing::get;
use axum::{
    http::{StatusCode, Uri},
    response::IntoResponse,
    Router,
};
use std::env;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use tower::ServiceBuilder;
use tower_http::trace::TraceLayer;
use tracing::debug;
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

    let app_path =
        Path::new(&env::var("SERVE_PATH").unwrap_or_else(|_| "../../".to_string())).to_path_buf();
    debug!("app_path: {app_path:?}");

    #[cfg(feature = "ws-proxy")]
    let app = Router::new().nest("/socket.io/", websocket_router());
    #[cfg(not(feature = "ws-proxy"))]
    let app = Router::new();

    let app = app
        .nest_service("/", ServeDir::new(app_path.join("client")))
        .nest("/server", server_router(&app_path))
        .layer(
            ServiceBuilder::new()
                .layer(CompressionLayer::new())
                .layer(TraceLayer::new_for_http())
                .into_inner(),
        );

    let addr = SocketAddr::from(([0, 0, 0, 0], 4001));
    println!("Server listening on {}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

fn server_router(app_path: &Path) -> Router {
    Router::new()
        .nest_service(
            "/clientComponents",
            ServeDir::new(app_path.join("server/clientComponents")),
        )
        .nest("/mods", mods_router(app_path))
}

fn mods_router(app_path: &Path) -> Router {
    Router::new()
        .route(
            "/*file",
            get({
                let app_path = app_path.to_path_buf(); // Clone app_path into the closure
                move |uri: Uri| serve_png_file(app_path.clone().to_path_buf(), uri)
            }),
        )
        //ui
        .nest_service(
            "/iwd-audio/ui",
            ServeDir::new(app_path.join("server/mods/iwd-audio/ui")),
        )
        .nest_service(
            "/iwd-tutorial/ui",
            ServeDir::new(app_path.join("server/mods/iwd-tutorial/ui")),
        )
        .nest_service(
            "/iwd-leagues/ui",
            ServeDir::new(app_path.join("server/mods/iwd-leagues/ui")),
        )
        .nest_service(
            "/iwd-blisterwind/ui",
            ServeDir::new(app_path.join("server/mods/iwd-blisterwind/ui")),
        )
        .nest_service(
            "/iwd-trials-of-the-abyss/ui",
            ServeDir::new(app_path.join("server/mods/iwd-trials-of-the-abyss/ui")),
        )
        .nest_service(
            "/iwd-mail/ui",
            ServeDir::new(app_path.join("server/mods/iwd-mail/ui")),
        )
        .nest_service(
            "/iwd-mtx-stash/ui",
            ServeDir::new(app_path.join("server/mods/iwd-mtx-stash/ui")),
        )
        .nest_service(
            "/iwd-patreon/ui",
            ServeDir::new(app_path.join("server/mods/iwd-patreon/ui")),
        )
        .nest_service(
            "/iwd-online-list/ui",
            ServeDir::new(app_path.join("server/mods/iwd-online-list/ui")),
        )
        .nest_service(
            "/iwd-report-issue/ui",
            ServeDir::new(app_path.join("server/mods/iwd-report-issue/ui")),
        )
        .nest_service(
            "/iwd-fast-travel/ui",
            ServeDir::new(app_path.join("server/mods/iwd-fast-travel/ui")),
        )
        .nest_service(
            "/iwd-confirm-action/ui",
            ServeDir::new(app_path.join("server/mods/iwd-confirm-action/ui")),
        )
        .nest_service(
            "/iwd-crews/ui",
            ServeDir::new(app_path.join("server/mods/iwd-crews/ui")),
        )
        .nest_service(
            "/iwd-construction/ui",
            ServeDir::new(app_path.join("server/mods/iwd-construction/ui")),
        )
        .nest_service(
            "/iwd-mtx-shop/ui",
            ServeDir::new(app_path.join("server/mods/iwd-mtx-shop/ui")),
        )
        .nest_service(
            "/iwd-trading/ui",
            ServeDir::new(app_path.join("server/mods/iwd-trading/ui")),
        )
        //audio
        .nest_service(
            "/iwd-audio/audio",
            ServeDir::new(app_path.join("server/mods/iwd-audio/audio")),
        )
        //clientComponents
        .nest_service(
            "/iwd-blisterwind/clientComponents",
            ServeDir::new(app_path.join("server/mods/iwd-blisterwind/clientComponents")),
        )
        .nest_service(
            "/iwd-ranger/clientComponents",
            ServeDir::new(app_path.join("server/mods/iwd-ranger/clientComponents")),
        )
        .nest_service(
            "/iwd-gaekatla-temple/clientComponents",
            ServeDir::new(app_path.join("server/mods/iwd-gaekatla-temple/clientComponents")),
        )
}

async fn serve_png_file(app_path: PathBuf, uri: Uri) -> impl IntoResponse {
    // Extract the path from the URI
    let path = uri.path().trim_start_matches('/');

    // Construct the full path
    let mut full_path = app_path.join("server/mods");
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
