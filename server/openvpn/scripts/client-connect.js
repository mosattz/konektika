#!/usr/bin/env node

// OpenVPN client connect script
// This script is called when a client connects to the VPN
// Environment variables available:
// - common_name: Client certificate common name
// - trusted_ip: Client's real IP address
// - ifconfig_pool_remote_ip: VPN IP assigned to client

const http = require('http');
const querystring = require('querystring');

// Get environment variables from OpenVPN
const clientName = process.env.common_name;
const realIP = process.env.trusted_ip;
const vpnIP = process.env.ifconfig_pool_remote_ip;
const bytesReceived = parseInt(process.env.bytes_received) || 0;
const bytesSent = parseInt(process.env.bytes_sent) || 0;

console.log(`Client connect: ${clientName} (${realIP} -> ${vpnIP})`);

// Extract user and bundle info from client name (format: konektika-client-userId-bundleId-timestamp)
const nameMatch = clientName.match(/konektika-client-(\d+)-(\d+)-/);
if (!nameMatch) {
  console.error('Invalid client name format:', clientName);
  process.exit(0); // Don't block connection for naming issues
}

const userId = parseInt(nameMatch[1]);
const bundleId = parseInt(nameMatch[2]);

// Prepare connection data
const connectionData = querystring.stringify({
  user_id: userId,
  bundle_id: bundleId,
  client_ip: vpnIP,
  real_ip: realIP,
  client_name: clientName,
  bytes_sent: bytesSent,
  bytes_received: bytesReceived,
  action: 'connect'
});

// Send connection data to Konektika API
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/vpn/track-connection',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(connectionData),
    'X-OpenVPN-Script': 'client-connect'
  }
};

const req = http.request(options, (res) => {
  console.log(`Connection tracking response: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`Response: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`Connection tracking error: ${e.message}`);
});

req.write(connectionData);
req.end();

// Create client-specific config file if needed
const fs = require('fs');
const path = require('path');
const clientConfigDir = path.join(__dirname, '../configs/clients');

// Ensure client config directory exists
if (!fs.existsSync(clientConfigDir)) {
  fs.mkdirSync(clientConfigDir, { recursive: true });
}

// Create client-specific configuration (bandwidth limits, etc.)
const clientConfig = `# Client-specific config for ${clientName}
# Generated on connection

# Bandwidth limits (bytes per second)
# These would be set based on bundle configuration
# shaper 1000000  # 1 MB/s download
# shaper 500000   # 500 KB/s upload

# Push client-specific routes if needed
# push "route 192.168.1.0 255.255.255.0"

# Client timeout
keepalive 10 60
`;

fs.writeFileSync(path.join(clientConfigDir, clientName), clientConfig);

console.log(`Client configuration created for ${clientName}`);
process.exit(0);