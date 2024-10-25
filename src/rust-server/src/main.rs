use axum::extract::State;
use axum::response::Response;
use axum::routing::get;
use axum::{
    http::{StatusCode, Uri},
    response::IntoResponse,
    Router,
};
use std::env;
#[cfg(feature = "compile-less")]
use std::ffi::OsStr;
use std::net::SocketAddr;
use std::path::{Path, PathBuf};
#[cfg(feature = "compile-less")]
use std::process::Command;
use std::sync::Arc;
#[cfg(feature = "compile-less")]
use std::time::Instant;
use tokio::fs;
use tower::ServiceBuilder;
use tower_http::trace::TraceLayer;

use tracing::{debug, error, info};
#[cfg(feature = "compile-less")]
use walkdir::WalkDir;

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

    #[cfg(feature = "compile-less")]
    {
        let rp = root_path.clone();
        std::thread::spawn(move || {
            info!("Compiling less files in the background...");
            let t = Instant::now();
            let count = compile_less_css(&rp);
            info!("Compiled {count} less files in {:?}", t.elapsed());
        });
    }

    let state = Arc::new(AppState { root_path });

    let app = Router::new()
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
    let app = app.nest("/socket.io/", websocket_router());
    let addr = SocketAddr::from(([0, 0, 0, 0], 4001));

    let server = axum::serve(
        tokio::net::TcpListener::bind(addr).await.unwrap(),
        app.into_make_service(),
    );
    info!("Server listening on {}", addr);
    #[cfg(target_family = "unix")]
    let server = server.with_graceful_shutdown(wait_for_sigterm_or_int());
    server.await.unwrap();
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
    let valid_request = !root.is_empty()
        || file.contains("/clientComponents/")
        || (file.contains("/mods/")
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

#[cfg(feature = "compile-less")]
type LessFileCount = usize;
#[cfg(feature = "compile-less")]
fn compile_less_css(root_path: &Path) -> LessFileCount {
    use tracing::trace;

    let to_compile = WalkDir::new(root_path)
        .into_iter()
        .filter_map(|x| x.ok())
        .filter(|x| x.path().is_file())
        .filter(|x| x.path().extension() == Some(OsStr::new("less")))
        .map(|x| x.path().to_path_buf())
        .collect::<Vec<_>>();
    let file_count = to_compile.len();
    for less in to_compile {
        debug!("compiling less file: {less:?}");
        let mut css_file = less.to_path_buf();
        css_file.set_extension("css");

        let output = Command::new("lessc")
            .arg(&less)
            .arg(css_file)
            .current_dir(root_path)
            .output()
            .expect("lessc should be installed and executable");

        if !output.status.success() {
            let err = String::from_utf8_lossy(output.stderr.as_slice());
            error!("{err}. lessc could not compile file: {less:?}");
            continue;
        }
        let out = String::from_utf8_lossy(output.stdout.as_slice());
        trace!("lessc output: {out}")
    }
    file_count
}

/// Wait for a termination signal (SIGTERM)
/// Checks for the SIGTERM signal & sets a flag in the config so that we can stop accepting requests.
#[cfg(target_family = "unix")]
async fn wait_for_sigterm_or_int() {
    use tokio::signal::unix::{signal, SignalKind};

    let term = async {
        signal(SignalKind::terminate())
            .expect("Signal to register")
            .recv()
            .await
    };
    let ctrlc = async {
        signal(SignalKind::interrupt())
            .expect("Signal to register")
            .recv()
            .await
    };

    tokio::select! {
        _ = term => {},
        _ = ctrlc => {},
    }
    info!("Got term or int signal. Stopping...");
}
