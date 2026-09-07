// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn read_db() -> Result<String, String> {
    let path = PathBuf::from("db.json");
    if !path.exists() {
        let initial = serde_json::json!({
            "tasks": [],
            "habits": [],
            "events": [],
            "notes": []
        });
        let _ = fs::write(&path, serde_json::to_string_pretty(&initial).unwrap_or_default());
    }
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_db(data: String) -> Result<bool, String> {
    let path = PathBuf::from("db.json");
    fs::write(&path, data).map_err(|e| e.to_string())?;
    Ok(true)
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![read_db, write_db])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
