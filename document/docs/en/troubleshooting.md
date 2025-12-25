# Troubleshooting

Common issues and solutions when using Chrome Remote DevTools.

## Connection Issues

### Client Not Appearing in Inspector

**Problem**: Client doesn't show up in the Inspector's client list.

**Solutions:**
1. Ensure the server is running: `bun run dev:server`
2. Check that the client script is loaded correctly
3. Verify the `data-server-url` attribute matches the server URL
4. Check browser console for connection errors

### WebSocket Connection Failed

**Problem**: WebSocket connection fails to establish.

**Solutions:**
1. Verify server is running on the correct port (default: 8080)
2. Check firewall settings
3. Ensure CORS is properly configured
4. Check browser console for detailed error messages

## DevTools Issues

### DevTools Not Loading

**Problem**: DevTools iframe doesn't load or shows blank.

**Solutions:**
1. Ensure devtools-frontend is built: See [Development Guide](/guide/development)
2. Check that bundled files exist in `devtools/bundled/front_end`
3. Verify WebSocket URL is correctly formatted
4. Check browser console for loading errors

### DevTools Features Not Working

**Problem**: Some DevTools features don't work as expected.

**Solutions:**
1. Check which CDP domains are implemented: See [API Documentation](/api/domains)
2. Verify client is properly connected
3. Check server logs for error messages
4. Ensure CDP protocol compatibility

## Build Issues

### DevTools Build Fails

**Problem**: Building devtools-frontend fails.

**Solutions:**
1. Ensure depot_tools is installed and in PATH
2. Run `gclient sync` to sync dependencies
3. Check build logs for specific errors
4. Try fast-build option: `npm run build -- -t fast-build`

## Performance Issues

### Slow Connection

**Problem**: Messages are slow to relay.

**Solutions:**
1. Check network latency
2. Reduce log verbosity (disable `LOG_ENABLED`)
3. Filter logs by specific methods if needed
4. Check server resource usage

## Getting Help

If you encounter issues not covered here:

1. Check the [GitHub Issues](https://github.com/ohah/chrome-remote-devtools/issues)
2. Review the [Contributing Guide](/contributing)
3. Check server and client logs for detailed error messages

