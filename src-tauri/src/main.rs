#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod k8s;
mod commands;
mod state;

use commands::config_cmd::*;
use commands::resource_cmd::*;
use commands::log_cmd::*;

fn main() {
    tauri::Builder::default()
        .manage(state::AppState::new())
        .invoke_handler(tauri::generate_handler![
            get_contexts,
            get_namespaces,
            cmd_list_resources,
            cmd_watch_resources,
            cmd_stop_watch,
            open_panel_window,
            get_panel_init_state,
            cmd_apply_resource,
            cmd_stream_logs,
            cmd_stop_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
