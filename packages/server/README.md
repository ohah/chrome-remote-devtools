# @ohah/chrome-remote-devtools-server

Chrome Remote DevTools WebSocket relay server with SSL support.

## Installation

```bash
npm install @ohah/chrome-remote-devtools-server
```

## Usage

### Basic Usage

```bash
npx chrome-remote-devtools-server
```

### With Environment Variables

```bash
PORT=8080 npx chrome-remote-devtools-server
```

### With SSL (HTTPS/WSS)

For production, you'll need to set up SSL certificates. You can either:

1. Use a reverse proxy (Nginx/Caddy) - Recommended
2. Use Bun's built-in HTTPS support

#### Using CLI Options

```bash
npx chrome-remote-devtools-server \
  --ssl \
  --cert /path/to/cert.pem \
  --key /path/to/key.pem
```

#### Using Environment Variables

```bash
USE_SSL=true \
SSL_CERT_PATH=/path/to/cert.pem \
SSL_KEY_PATH=/path/to/key.pem \
npx chrome-remote-devtools-server
```

### With Logging

#### Enable All Logs

```bash
npx chrome-remote-devtools-server --log-enabled
```

#### Filter Logs by Methods

```bash
npx chrome-remote-devtools-server \
  --log-enabled \
  --log-methods "Runtime.evaluate,Page.navigate"
```

#### File Logging

```bash
npx chrome-remote-devtools-server \
  --log-enabled \
  --log-file ./logs/server.log
```

## Environment Variables

### Basic Configuration

- `PORT` - Server port (default: `8080` for HTTP, `8443` for HTTPS)
- `HOST` - Server host (default: `0.0.0.0`)

### SSL Configuration

- `USE_SSL` - Enable HTTPS/WSS (default: `false`)
- `SSL_CERT_PATH` - Path to SSL certificate file (required when `USE_SSL=true`)
- `SSL_KEY_PATH` - Path to SSL private key file (required when `USE_SSL=true`)

### Logging Configuration

- `LOG_ENABLED` - Enable logging (default: `false`)
- `LOG_METHODS` - Comma-separated list of CDP methods to log (default: all methods)
- `LOG_FILE_PATH` - Path to log file (logs will be written to both console and file)

## CLI Options

- `-p, --port <number>` - Server port
- `-h, --host <string>` - Server host
- `--ssl` - Enable HTTPS/WSS
- `--cert <path>` - Path to SSL certificate file
- `--key <path>` - Path to SSL private key file
- `--log-enabled` - Enable logging
- `--log-methods <methods>` - Comma-separated list of CDP methods to log
- `--log-file <path>` - Path to log file
- `--help` - Show help message

**Note**: CLI options take precedence over environment variables.

## SSL Certificate Setup

### Using Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d your-domain.com

# Use the certificate
USE_SSL=true \
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem \
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem \
npx chrome-remote-devtools-server
```

### Using Self-Signed Certificate (Development Only)

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout key.pem \
  -out cert.pem \
  -days 365 \
  -subj "/CN=localhost"

# Use the certificate
npx chrome-remote-devtools-server \
  --ssl \
  --cert ./cert.pem \
  --key ./key.pem
```

**Warning**: Self-signed certificates are not secure for production use. Use Let's Encrypt or a trusted CA for production.

## Examples

### Development Server

```bash
# HTTP on default port
npx chrome-remote-devtools-server

# HTTP on custom port
npx chrome-remote-devtools-server --port 3000

# With logging
npx chrome-remote-devtools-server --log-enabled
```

### Production Server

```bash
# HTTPS with Let's Encrypt
USE_SSL=true \
SSL_CERT_PATH=/etc/letsencrypt/live/your-domain.com/fullchain.pem \
SSL_KEY_PATH=/etc/letsencrypt/live/your-domain.com/privkey.pem \
LOG_ENABLED=true \
LOG_FILE_PATH=/var/log/chrome-remote-devtools/server.log \
npx chrome-remote-devtools-server
```

## API

The server provides the following HTTP endpoints:

- `GET /json` - Get all clients
- `GET /json/clients` - Get all clients with details
- `GET /json/inspectors` - Get all inspectors
- `GET /json/client/:id` - Get specific client

WebSocket endpoints:

- `WS /remote/debug/client/:id` - Client connection
- `WS /remote/debug/devtools/:id` - DevTools connection

## License

MIT
