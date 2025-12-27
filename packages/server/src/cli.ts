/**
 * CLI argument parser / CLI 인자 파서
 */
export interface CLIOptions {
  port?: number;
  host?: string;
  useSsl?: boolean;
  sslCertPath?: string;
  sslKeyPath?: string;
  logEnabled?: boolean;
  logMethods?: string;
  logFile?: string;
}

/**
 * Parse command line arguments / 명령줄 인자 파싱
 * @returns Parsed CLI options / 파싱된 CLI 옵션
 */
export function parseCLIArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--port':
      case '-p':
        if (nextArg && !nextArg.startsWith('-')) {
          const port = parseInt(nextArg, 10);
          if (isNaN(port) || port < 1 || port > 65535) {
            console.error(`Invalid port number: ${nextArg}`);
            process.exit(1);
          }
          options.port = port;
          i++;
        } else {
          console.error('--port requires a valid port number');
          process.exit(1);
        }
        break;
      case '--host':
      case '-H':
        if (nextArg && !nextArg.startsWith('-')) {
          options.host = nextArg;
          i++;
        } else {
          console.error('--host requires a host value');
          process.exit(1);
        }
        break;
      case '-h':
      case '--help':
        printHelp();
        process.exit(0);
        break;
      case '--ssl':
        options.useSsl = true;
        break;
      case '--cert':
        if (nextArg && !nextArg.startsWith('-')) {
          options.sslCertPath = nextArg;
          i++;
        } else {
          console.error('--cert requires a certificate file path');
          process.exit(1);
        }
        break;
      case '--key':
        if (nextArg && !nextArg.startsWith('-')) {
          options.sslKeyPath = nextArg;
          i++;
        } else {
          console.error('--key requires a key file path');
          process.exit(1);
        }
        break;
      case '--log-enabled':
        options.logEnabled = true;
        break;
      case '--log-methods':
        if (nextArg && !nextArg.startsWith('-')) {
          options.logMethods = nextArg;
          i++;
        } else {
          console.error('--log-methods requires a methods string');
          process.exit(1);
        }
        break;
      case '--log-file':
        if (nextArg && !nextArg.startsWith('-')) {
          options.logFile = nextArg;
          i++;
        } else {
          console.error('--log-file requires a file path');
          process.exit(1);
        }
        break;
    }
  }

  return options;
}

/**
 * Print help message / 도움말 메시지 출력
 */
function printHelp(): void {
  console.log(`
Chrome Remote DevTools Server

Usage:
  chrome-remote-devtools-server [options]

Options:
  -p, --port <number>        Server port (default: 8080 for HTTP, 8443 for HTTPS)
  -H, --host <string>        Server host (default: 0.0.0.0)
  -h, --help                  Show this help message
  --ssl                      Enable HTTPS/WSS
  --cert <path>              Path to SSL certificate file (required with --ssl)
  --key <path>               Path to SSL private key file (required with --ssl)
  --log-enabled              Enable logging
  --log-methods <methods>    Comma-separated list of CDP methods to log
  --log-file <path>          Path to log file (logs will be written to both console and file)
  --help                     Show this help message

Environment Variables:
  PORT                       Server port
  HOST                       Server host
  USE_SSL                    Enable HTTPS/WSS (true/false)
  SSL_CERT_PATH              Path to SSL certificate file
  SSL_KEY_PATH               Path to SSL private key file
  LOG_ENABLED                Enable logging (true/false)
  LOG_METHODS                Comma-separated list of CDP methods to log
  LOG_FILE_PATH              Path to log file

Examples:
  # HTTP server
  chrome-remote-devtools-server

  # HTTPS server
  chrome-remote-devtools-server --ssl --cert /path/to/cert.pem --key /path/to/key.pem

  # Custom port
  chrome-remote-devtools-server --port 3000

  # With logging
  chrome-remote-devtools-server --log-enabled --log-methods "Runtime.evaluate,Page.navigate"

  # With file logging
  chrome-remote-devtools-server --log-enabled --log-file ./logs/server.log
`);
}
