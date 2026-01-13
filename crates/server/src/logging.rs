// Logging implementation / 로깅 구현
use std::collections::HashSet;
use std::fs::{File, OpenOptions};
use std::io::{self, Write};
use std::path::Path;
use std::sync::{Arc, Mutex, RwLock};
use std::time::SystemTime;

/// Log type / 로그 타입
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogType {
    Client,
    DevTools,
    Server,
    RnInspector,
}

impl LogType {
    fn as_str(&self) -> &'static str {
        match self {
            LogType::Client => "client",
            LogType::DevTools => "devtools",
            LogType::Server => "server",
            LogType::RnInspector => "rn-inspector",
        }
    }
}

/// Log configuration / 로그 설정
#[derive(Clone)]
pub struct LogConfig {
    enabled: bool,
    allowed_methods: Option<HashSet<String>>,
    #[allow(dead_code)]
    log_file: Option<String>,
}

impl LogConfig {
    /// Create new log configuration / 새로운 로그 설정 생성
    pub fn new(
        enabled: bool,
        methods: Option<String>,
        log_file: Option<String>,
    ) -> Result<Self, io::Error> {
        let allowed_methods = methods.map(|m| {
            m.split(',')
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty())
                .collect()
        });

        // Create log file directory if needed / 필요시 로그 파일 디렉토리 생성
        if let Some(ref file_path) = log_file {
            if let Some(parent) = Path::new(file_path).parent() {
                std::fs::create_dir_all(parent)?;
            }
        }

        Ok(Self {
            enabled,
            allowed_methods,
            log_file,
        })
    }

    /// Check if logging is enabled / 로깅이 활성화되어 있는지 확인
    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    /// Check if method should be logged / 메소드가 로깅되어야 하는지 확인
    pub fn should_log_method(&self, method: Option<&str>) -> bool {
        if !self.enabled {
            return false;
        }

        if let Some(ref allowed) = self.allowed_methods {
            if let Some(method) = method {
                return allowed.contains(method);
            }
            return false;
        }

        true
    }
}

/// Log writer / 로그 작성기
pub struct LogWriter {
    file: Option<Arc<Mutex<File>>>,
}

impl LogWriter {
    /// Create new log writer / 새로운 로그 작성기 생성
    pub fn new(log_file: Option<String>) -> Result<Self, io::Error> {
        let file = if let Some(ref file_path) = log_file {
            if let Some(parent) = Path::new(file_path).parent() {
                std::fs::create_dir_all(parent)?;
            }
            Some(Arc::new(Mutex::new(
                OpenOptions::new()
                    .create(true)
                    .append(true)
                    .open(file_path)?,
            )))
        } else {
            None
        };

        Ok(Self { file })
    }

    /// Write log message / 로그 메시지 작성
    pub fn write(&self, message: &str) -> Result<(), io::Error> {
        if let Some(ref file) = self.file {
            let mut file = file.lock().unwrap();
            file.write_all(message.as_bytes())?;
            file.flush()?;
        }
        Ok(())
    }
}

/// Logger instance / 로거 인스턴스
pub struct Logger {
    config: Arc<RwLock<LogConfig>>,
    writer: Arc<RwLock<LogWriter>>,
}

impl Logger {
    /// Create new logger / 새로운 로거 생성
    pub fn new(
        enabled: bool,
        methods: Option<String>,
        log_file: Option<String>,
    ) -> Result<Self, io::Error> {
        let config = Arc::new(RwLock::new(LogConfig::new(
            enabled,
            methods,
            log_file.clone(),
        )?));
        let writer = Arc::new(RwLock::new(LogWriter::new(log_file)?));

        Ok(Self { config, writer })
    }

    /// Update log configuration / 로그 설정 업데이트
    #[allow(dead_code)]
    pub fn update_config(
        &self,
        enabled: bool,
        methods: Option<String>,
        log_file: Option<String>,
    ) -> Result<(), io::Error> {
        let new_config = LogConfig::new(enabled, methods.clone(), log_file.clone())?;
        let new_writer = LogWriter::new(log_file)?;

        {
            let mut config = self.config.write().unwrap();
            *config = new_config;
        }

        {
            let mut writer = self.writer.write().unwrap();
            *writer = new_writer;
        }

        Ok(())
    }

    /// Log message / 메시지 로깅
    pub fn log(
        &self,
        log_type: LogType,
        id: &str,
        message: &str,
        data: Option<&serde_json::Value>,
        method: Option<&str>,
    ) {
        let config = self.config.read().unwrap();
        if !config.should_log_method(method) {
            return;
        }
        drop(config);

        let timestamp = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let prefix = format!("[{}] {}", log_type.as_str(), id);

        let log_message = if let Some(data) = data {
            let data_str = serde_json::to_string_pretty(data).unwrap_or_else(|_| "{}".to_string());
            println!("{} {}", prefix, message);
            println!("{}", data_str);
            format!("{} {} {} {}\n", timestamp, prefix, message, data_str)
        } else {
            format!("{} {} {}\n", timestamp, prefix, message)
        };

        if let Ok(writer) = self.writer.read() {
            let _ = writer.write(&log_message);
        }
    }

    /// Log error / 에러 로깅
    pub fn log_error(&self, log_type: LogType, id: &str, message: &str, error: Option<&str>) {
        let config = self.config.read().unwrap();
        if !config.is_enabled() {
            return;
        }
        drop(config);

        let timestamp = SystemTime::now()
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let prefix = format!("[{}] {}", log_type.as_str(), id);

        let log_message = if let Some(error) = error {
            format!("{} {} {}: {}\n", timestamp, prefix, message, error)
        } else {
            format!("{} {} {}\n", timestamp, prefix, message)
        };

        eprintln!("{} {}: {}", prefix, message, error.unwrap_or(""));
        if let Ok(writer) = self.writer.read() {
            let _ = writer.write(&log_message);
        }
    }
}

impl Default for Logger {
    fn default() -> Self {
        Self::new(false, None, None).unwrap()
    }
}
