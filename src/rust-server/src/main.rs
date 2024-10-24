use axum::extract::State;
use axum::response::Response;
use axum::routing::get;
use axum::{
    http::{StatusCode, Uri},
    response::IntoResponse,
    Router,
};
use std::env;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::fs;
use tower::ServiceBuilder;
use tower_http::trace::TraceLayer;
use tracing::{debug, error};

#[cfg(feature = "ws-proxy")]
use ws_proxy::websocket_router;

use tracing_subscriber::prelude::__tracing_subscriber_SubscriberExt;
use tracing_subscriber::util::SubscriberInitExt;

use tower_http::compression::CompressionLayer;

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

    let root_path =
        Path::new(&env::var("SERVE_PATH").unwrap_or_else(|_| "../../".to_string())).to_path_buf();
    debug!("app_path: {root_path:?}");

    let state = Arc::new(AppState { root_path });

    let mut app = Router::new()
        .route("/*file", get(iwd_serve_file))
        .route("/", get(serve_index))
        .with_state(state)
        .layer(
            ServiceBuilder::new()
                .layer(CompressionLayer::new())
                .layer(TraceLayer::new_for_http())
                .into_inner(),
        );

    #[cfg(feature = "ws-proxy")]
    {
        app = app.nest("/socket.io/", websocket_router());
    }
    let addr = SocketAddr::from(([0, 0, 0, 0], 4001));
    println!("Server listening on {}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

#[derive(Clone)]
struct AppState {
    root_path: PathBuf,
}

const VALID_MOD_PATTERNS: &[&str] = &[
    ".png",
    "/ui/",
    "/clientComponents/",
    "/audio/",
    "/clientModules/",
];

async fn iwd_serve_file(State(state): State<Arc<AppState>>, uri: Uri) -> Response {
    // Extract the path from the URI
    let path = uri.path();

    let root = match path.split('/').nth(1) {
        Some("server") => "",
        _ => "client",
    };

    let file = uri
        .path()
        .strip_prefix(&format!("/{root}/"))
        .unwrap_or(uri.path());
    // Reconstruct the file path by removing the root prefix
    // (In this context, since we've already extracted the root, `file` is the relative path)

    // Apply validation logic
    let valid_request = root != "server"
        || file.starts_with("clientComponents")
        || (file.contains("mods/")
            && VALID_MOD_PATTERNS
                .iter()
                .any(|pattern| file.contains(pattern)));

    if !valid_request {
        // Return 404 Not Found if the request is invalid
        return (StatusCode::NOT_FOUND, "Not Found").into_response();
    }

    // Construct the full file path
    let full_path = state
        .root_path
        .join(root)
        .join(file.trim_start_matches('/'));
    debug!("full_path: {full_path:?}");

    // Check if the file exists and is a file
    match fs::metadata(&full_path).await {
        Ok(metadata) => {
            if metadata.is_file() {
                // Read the file contents
                match fs::read(&full_path).await {
                    Ok(contents) => {
                        // Guess the MIME type based on the file extension
                        let mime_type = mime_guess::from_path(&full_path).first_or_octet_stream();
                        // Return the file contents with the appropriate MIME type
                        (
                            axum::http::StatusCode::OK,
                            [(axum::http::header::CONTENT_TYPE, mime_type.to_string())],
                            contents,
                        )
                            .into_response()
                    }
                    Err(e) => {
                        error!("{e:?}");
                        // Return 500 Internal Server Error if the file cannot be read
                        (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error").into_response()
                    }
                }
            } else {
                // If the path exists but is not a file, return 404
                (StatusCode::NOT_FOUND, "Not Found").into_response()
            }
        }
        Err(_) => {
            // If the file does not exist, return 404
            (StatusCode::NOT_FOUND, "Not Found").into_response()
        }
    }
}

async fn serve_index(State(state): State<Arc<AppState>>) -> Response {
    let index_path = state.root_path.join("client/index.html");
    debug!("index_path: {index_path:?}");
    match fs::read(&index_path).await {
        Ok(contents) => {
            let mime_type = mime_guess::from_path(&index_path).first_or_octet_stream();
            (
                axum::http::StatusCode::OK,
                [(axum::http::header::CONTENT_TYPE, mime_type.to_string())],
                contents,
            )
                .into_response()
        }
        Err(e) => {
            error!("{e:?}");
            // Return 500 Internal Server Error if index.html cannot be read
            (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error").into_response()
        }
    }
}
