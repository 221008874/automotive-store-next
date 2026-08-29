use std::fs;
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

// CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP: run the embedded JVM without a
// console window so it cannot be killed by stray console Ctrl+C / window close.
#[cfg(windows)]
const JAVA_CREATION_FLAGS: u32 = 0x0800_0200;

struct ServerProcess(Mutex<Option<Child>>);

/// Tauri resolves paths on Windows with the `\\?\` extended-length prefix, which
/// the JVM does not accept for `-jar`/`java`. Strip it before handing paths to Java.
fn win_path(p: &Path) -> String {
    let s = p.to_string_lossy().into_owned();
    s.strip_prefix(r"\\?\").unwrap_or(&s).to_string()
}

/// Returns a per-machine JWT signing secret, creating and persisting a random one
/// in the user-writable app data dir on first launch. The embedded server requires
/// `SHOP_JWT_SECRET` (>= 32 chars) and fails fast without it.
fn jwt_secret(app_data: &Path) -> String {
    fs::create_dir_all(app_data).ok();
    let path = app_data.join("jwt.secret");
    if let Ok(existing) = fs::read_to_string(&path) {
        let existing = existing.trim().to_string();
        if existing.len() >= 32 {
            return existing;
        }
    }
    let mut buf = [0u8; 32];
    getrandom::getrandom(&mut buf).expect("failed to generate JWT secret");
    let secret: String = buf.iter().map(|b| format!("{:02x}", b)).collect();
    fs::write(&path, &secret).ok();
    secret
}

/// Extracts the bundled JRE into the user-writable app data dir (`%APPDATA%/<app>`).
/// The install dir (e.g. `C:\Program Files`) is not writable by a normal launch, so
/// extracting there would panic and close the app immediately.
fn extract_jre(app_data: &Path, resource_dir: &Path) -> PathBuf {
    let extract_dir = app_data.join("jre");
    let java = extract_dir.join("bin/java.exe");
    if java.exists() {
        return java;
    }
    let zip_path = resource_dir.join("resources/jre.zip");
    if !zip_path.exists() {
        panic!("jre.zip not found at {}", zip_path.display());
    }
    fs::create_dir_all(&extract_dir).expect("failed to create JRE directory");
    let zip_file = fs::read(&zip_path).expect("failed to read jre.zip");
    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(zip_file))
        .expect("failed to open jre.zip");
    archive.extract(&extract_dir).expect("failed to extract jre.zip");
    if !java.exists() {
        panic!("jre.zip does not contain bin/java.exe");
    }
    java
}

fn spawn_log_reader(reader: impl std::io::Read + Send + 'static, path: PathBuf) {
    std::thread::spawn(move || {
        let Ok(file) = fs::OpenOptions::new().create(true).append(true).open(&path) else {
            return;
        };
        let mut writer = BufWriter::new(file);
        for line in BufReader::new(reader).lines().flatten() {
            let _ = writeln!(writer, "{}", line);
            let _ = writer.flush();
        }
    });
}

fn lifecycle_note(app_data: &Path, msg: &str) {
    if let Ok(mut f) = fs::OpenOptions::new().create(true).append(true)
        .open(app_data.join("lifecycle.log"))
    {
        let _ = writeln!(f, "{}: {}", std::process::id(), msg);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(ServerProcess(Mutex::new(None)))
        .setup(|app| {
            let resource_dir = app.path().resource_dir()
                .expect("failed to resolve resource dir");
            let app_data = app.path().app_data_dir()
                .expect("failed to resolve app data dir");
            fs::create_dir_all(&app_data).ok();
            lifecycle_note(&app_data, "setup-complete");

            let jar_path = resource_dir.join("resources/automotive-store-server.jar");
            let java_path = extract_jre(&app_data, &resource_dir);

            let shop_appdata = std::env::var("APPDATA")
                .unwrap_or_else(|_| ".".into());
            // SQLite cannot create parent directories itself; a fresh install must
            // have the data + backup dirs in place before the server starts.
            fs::create_dir_all(Path::new(&shop_appdata).join("AutomotiveStore/data")).ok();
            fs::create_dir_all(Path::new(&shop_appdata).join("AutomotiveStore/backup")).ok();
            let shop_db = win_path(&Path::new(&shop_appdata).join("AutomotiveStore/data/shop.db"));
            let shop_backup = win_path(&Path::new(&shop_appdata).join("AutomotiveStore/backup"));

            let mut cmd = Command::new(win_path(&java_path));
            cmd.arg("-jar")
                .arg(win_path(&jar_path))
                .arg("--server.port=8081")
                .env("SHOP_JWT_SECRET", jwt_secret(&app_data))
                .env("SHOP_DB_FILE", &shop_db)
                .env("SHOP_BACKUP_DIR", &shop_backup)
                .env("SPRING_PROFILES_ACTIVE", "prod,cloud")
                .stdout(Stdio::piped())
                .stderr(Stdio::piped());
            #[cfg(windows)]
            cmd.creation_flags(JAVA_CREATION_FLAGS);
            let mut child = cmd
                .spawn()
                .unwrap_or_else(|_| panic!("failed to start server at {} (java: {})",
                    jar_path.display(), java_path.display()));
            lifecycle_note(&app_data, &format!("server-start db={}", shop_db));

            let log_dir = app_data.join("logs");
            fs::create_dir_all(&log_dir).ok();
            if let Some(out) = child.stdout.take() {
                spawn_log_reader(out, log_dir.join("server.log"));
            }
            if let Some(err) = child.stderr.take() {
                spawn_log_reader(err, log_dir.join("server.err"));
            }

            let state = app.state::<ServerProcess>();
            *state.0.lock().unwrap() = Some(child);

            let watch_handle = app.handle().clone();
            let watch_data = app_data.clone();
            std::thread::spawn(move || loop {
                let exit = {
                    let state = watch_handle.state::<ServerProcess>();
                    let mut guard = state.0.lock().unwrap();
                    guard.as_mut().and_then(|c| c.try_wait().ok().flatten())
                };
                if let Some(st) = exit {
                    let state = watch_handle.state::<ServerProcess>();
                    let _ = state.0.lock().unwrap().take();
                    lifecycle_note(&watch_data, &format!(
                        "java-exited code={:?} success={}",
                        st.code(), st.success()));
                    break;
                }
                let gone = {
                    let state = watch_handle.state::<ServerProcess>();
                    let guard = state.0.lock().unwrap();
                    guard.is_none()
                };
                if gone {
                    lifecycle_note(&watch_data, "java-child-removed-by-window-close");
                    break;
                }
                std::thread::sleep(std::time::Duration::from_millis(1000));
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            if let Some(state) = window.try_state::<ServerProcess>() {
                let app_data = window.path().app_data_dir().unwrap_or_default();
                match event {
                    tauri::WindowEvent::Destroyed => {
                        lifecycle_note(&app_data, "window-destroyed");
                        if let Some(mut child) = state.0.lock().unwrap().take() {
                            let _ = child.kill();
                            let _ = child.wait();
                        }
                    }
                    tauri::WindowEvent::CloseRequested { .. } => {
                        lifecycle_note(&app_data, "close-requested");
                    }
                    _ => {}
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    if let Ok(data) = std::env::var("APPDATA") {
        lifecycle_note(&Path::new(&data).join("com.automotivestore.app"), "run-returned");
    }
}
