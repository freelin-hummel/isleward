use std::sync::Arc;

use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use futures::{SinkExt, StreamExt};
use tracing::debug;

use tokio_tungstenite::connect_async;

use tungstenite::protocol::{CloseFrame, Message as TungsteniteMessage};

use crate::AppState;

pub fn websocket_router() -> Router {
    Router::new().route("/", get(ws_handler))
}

async fn ws_handler(ws: WebSocketUpgrade) -> impl IntoResponse {
    ws.on_upgrade(websocket_proxy)
}

async fn websocket_proxy(client_ws: WebSocket) {
    // Connect to the old Node.js server
    let old_server_url = "ws://localhost:4000/socket.io/?EIO=4&transport=websocket";
    let (old_ws_stream, _) = connect_async(old_server_url)
        .await
        .expect("Failed to connect to old server");
    let (mut old_ws_sink, mut old_ws_stream) = old_ws_stream.split();

    let (mut client_ws_sink, mut client_ws_stream) = client_ws.split();

    // Relay messages from client to old server
    let client_to_server = async move {
        while let Some(result) = client_ws_stream.next().await {
            match result {
                Ok(msg) => {
                    debug!("{msg:?}. Sending message to node server.");
                    let t_msg = match msg {
                        Message::Text(s) => TungsteniteMessage::Text(s),
                        Message::Binary(b) => TungsteniteMessage::Binary(b),
                        Message::Ping(v) => TungsteniteMessage::Ping(v),
                        Message::Pong(v) => TungsteniteMessage::Pong(v),
                        Message::Close(c) => {
                            old_ws_sink
                                .send(TungsteniteMessage::Close(c.map(|c| CloseFrame {
                                    code: c.code.into(),
                                    reason: c.reason,
                                })))
                                .await
                                .unwrap_or(());
                            break;
                        }
                    };
                    old_ws_sink.send(t_msg).await.unwrap_or(());
                }
                Err(_) => break,
            }
        }
    };

    // Relay messages from old server to client
    let server_to_client = async move {
        while let Some(result) = old_ws_stream.next().await {
            match result {
                Ok(msg) => {
                    debug!("{msg:?}. Sending message to client.");
                    let axum_msg = match msg {
                        TungsteniteMessage::Text(s) => Message::Text(s),
                        TungsteniteMessage::Binary(b) => Message::Binary(b),
                        TungsteniteMessage::Ping(v) => Message::Ping(v),
                        TungsteniteMessage::Pong(v) => Message::Pong(v),
                        TungsteniteMessage::Close(c) => {
                            client_ws_sink
                                .send(Message::Close(c.map(|c| axum::extract::ws::CloseFrame {
                                    code: c.code.into(),
                                    reason: c.reason,
                                })))
                                .await
                                .unwrap_or(());
                            break;
                        }
                        _ => continue,
                    };
                    client_ws_sink.send(axum_msg).await.unwrap_or(());
                }
                Err(_) => break,
            }
        }
    };

    // Run both tasks concurrently
    let (one, two) = tokio::join! {
         tokio::task::spawn(client_to_server) ,
         tokio::task::spawn(server_to_client) ,
    };
    one.unwrap();
    two.unwrap();
}
