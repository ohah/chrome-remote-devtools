# Installation Guide

This guide shows how to install and use the Chrome Remote DevTools client in your web page.

## Basic Installation

Add the client script to your HTML page:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Page</title>
  <!-- Load client script from server -->
  <script
    src="http://localhost:8080/client.js"
    data-server-url="http://localhost:8080"
  ></script>
</head>
<body>
  <h1>My Page</h1>
  <!-- Your page content -->
</body>
</html>
```

## With Session Replay

Enable rrweb session recording:

```html
<script
  src="http://localhost:8080/client.js"
  data-server-url="http://localhost:8080"
  data-enable-rrweb="true"
></script>
```

## Configuration Options

### Server URL

Set the server WebSocket URL:

```html
<script
  src="http://localhost:8080/client.js"
  data-server-url="http://localhost:8080"
></script>
```

### Session Replay

Enable or disable session replay:

```html
<!-- Enable -->
<script
  src="http://localhost:8080/client.js"
  data-server-url="http://localhost:8080"
  data-enable-rrweb="true"
></script>

<!-- Disable (default) -->
<script
  src="http://localhost:8080/client.js"
  data-server-url="http://localhost:8080"
  data-enable-rrweb="false"
></script>
```

## Next Steps

- See the [Popup Console](/examples/popup) for a complete playground
- Learn about the [Client API](/api/client)
