#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod k8s;
mod commands;
mod state;

use commands::config_cmd::*;
use commands::resource_cmd::*;
use commands::log_cmd::*;
use commands::events_cmd::*;
use commands::rbac_cmd::cmd_can_i;
use commands::portforward_cmd::*;
use commands::crd_cmd::{cmd_list_crds, cmd_list_custom_resources};
use commands::exec_cmd::{cmd_exec_pod, cmd_exec_send_input, cmd_stop_exec};

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
            cmd_delete_resource,
            cmd_scale_resource,
            cmd_list_events,
            cmd_can_i,
            cmd_start_port_forward,
            cmd_stop_port_forward,
            cmd_list_port_forwards,
            cmd_list_crds,
            cmd_list_custom_resources,
            cmd_exec_pod,
            cmd_exec_send_input,
            cmd_stop_exec,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
