#!/usr/bin/env node

// OpenVPN client disconnect script
// This script is called when a client disconnects from the VPN

const http = require('http');
const querystring = require('querystring');
const fs = require('fs');
const path = require('path');

// Get environment variables from OpenVPN
const clientName = process.env.common_name;
const realIP = process.env.trusted_ip;
const vpnIP = process.env.ifconfig_pool_remote_ip;
const bytesReceived = parseInt(process.env.bytes_received) || 0;
const bytesSent = parseInt(process.env.bytes_sent) || 0;
const duration = parseInt(process.env.time_duration) || 0;

console.log(`Client disconnect: ${clientName} (${realIP} -> ${vpnIP})`);
console.log(`Session stats: ${bytesSent} sent, ${bytesReceived} received, ${duration}s duration`);

// Extract user and bundle info from client name
const nameMatch = clientName.match(/konektika-client-(\d+)-(\d+)-/);
if (!nameMatch) {
  console.error('Invalid client name format:', clientName);
  process.exit(0);
}

const userId = parseInt(nameMatch[1]);
const bundleId = parseInt(nameMatch[2]);

// Prepare disconnection data
const disconnectionData = querystring.stringify({
  user_id: userId,
  bundle_id: bundleId,
  client_ip: vpnIP,
  real_ip: realIP,
  client_name: clientName,
  bytes_sent: bytesSent,
  bytes_received: bytesReceived,
  duration: duration,
  action: 'disconnect'
});

// Send disconnection data to Konektika API
const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/vpn/track-disconnection',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(disconnectionData),
    'X-OpenVPN-Script': 'client-disconnect'
  }
};

const req = http.request(options, (res) => {
  console.log(`Disconnection tracking response: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`Response: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`Disconnection tracking error: ${e.message}`);
});

req.write(disconnectionData);
req.end();

// Clean up client-specific config file
const clientConfigDir = path.join(__dirname, '../configs/clients');
const clientConfigFile = path.join(clientConfigDir, clientName);

if (fs.existsSync(clientConfigFile)) {
  try {
    fs.unlinkSync(clientConfigFile);
    console.log(`Cleaned up client config for ${clientName}`);
  } catch (error) {
    console.error(`Failed to cleanup client config: ${error.message}`);
  }
}

// Log session summary
const logDir = path.join(__dirname, '../logs');
const sessionLogFile = path.join(logDir, 'sessions.log');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const sessionEntry = `${new Date().toISOString()} | DISCONNECT | ${clientName} | ${realIP} -> ${vpnIP} | ${bytesSent}/${bytesReceived} bytes | ${duration}s\n`;

fs.appendFileSync(sessionLogFile, sessionEntry);

console.log(`Session logged for ${clientName}`);
process.exit(0);