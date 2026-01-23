package com.konektikamobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Log
import androidx.core.app.NotificationCompat
import java.io.File
import java.io.FileInputStream
import java.net.InetSocketAddress
import java.nio.ByteBuffer
import java.nio.channels.DatagramChannel

/**
 * WireGuard VPN Service
 * Handles actual VPN tunnel creation and packet routing
 * 
 * NOTE: This is a simplified implementation for demonstration.
 * For production, integrate the official WireGuard Android library:
 * https://git.zx2c4.com/wireguard-android/
 */
class WireGuardVpnService : VpnService() {

    private val TAG = "WireGuardVpnService"
    private var vpnInterface: ParcelFileDescriptor? = null
    private var isRunning = false
    private var startTime: Long = 0
    private var rxBytes: Long = 0
    private var txBytes: Long = 0

    companion object {
        private const val NOTIFICATION_ID = 1
        private const val CHANNEL_ID = "wireguard_vpn_channel"
    }

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "VPN Service created")
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) {
            return START_NOT_STICKY
        }

        val configPath = intent.getStringExtra("CONFIG_FILE")
        val tunnelName = intent.getStringExtra("TUNNEL_NAME") ?: "Konektika"

        if (configPath == null) {
            Log.e(TAG, "No config file path provided")
            stopSelf()
            return START_NOT_STICKY
        }

        try {
            Log.d(TAG, "Starting VPN with config: $configPath")
            startVPN(configPath, tunnelName)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start VPN", e)
            stopSelf()
        }

        return START_STICKY
    }

    /**
     * Start VPN tunnel
     */
    private fun startVPN(configPath: String, tunnelName: String) {
        try {
            // Read WireGuard configuration
            val config = File(configPath).readText()
            val parsedConfig = parseWireGuardConfig(config)

            // Build VPN interface
            val builder = Builder()
                .setSession(tunnelName)
                .setMtu(parsedConfig.mtu)
                .addAddress(parsedConfig.address, parsedConfig.prefixLength)
                .addDnsServer(parsedConfig.dns)
                .addRoute("0.0.0.0", 0) // Route all traffic through VPN

            // Establish VPN interface
            vpnInterface = builder.establish()

            if (vpnInterface == null) {
                Log.e(TAG, "Failed to establish VPN interface")
                return
            }

            isRunning = true
            startTime = System.currentTimeMillis()

            // Start foreground notification
            startForeground(NOTIFICATION_ID, createNotification(tunnelName, true))

            Log.d(TAG, "VPN tunnel established successfully")

            // Start packet routing in background
            Thread {
                routePackets()
            }.start()

        } catch (e: Exception) {
            Log.e(TAG, "Failed to start VPN", e)
            stopVPN()
        }
    }

    /**
     * Parse WireGuard configuration file
     */
    private fun parseWireGuardConfig(config: String): WireGuardConfig {
        val lines = config.lines()
        var address = "10.8.0.2"
        var prefixLength = 24
        var dns = "1.1.1.1"
        var mtu = 1420

        for (line in lines) {
            val trimmed = line.trim()
            when {
                trimmed.startsWith("Address") -> {
                    val addrParts = trimmed.substringAfter("=").trim().split("/")
                    address = addrParts[0]
                    if (addrParts.size > 1) {
                        prefixLength = addrParts[1].toIntOrNull() ?: 24
                    }
                }
                trimmed.startsWith("DNS") -> {
                    dns = trimmed.substringAfter("=").trim().split(",")[0]
                }
                trimmed.startsWith("MTU") -> {
                    mtu = trimmed.substringAfter("=").trim().toIntOrNull() ?: 1420
                }
            }
        }

        return WireGuardConfig(address, prefixLength, dns, mtu)
    }

    /**
     * Route packets through VPN tunnel
     * This is a simplified implementation
     */
    private fun routePackets() {
        try {
            val inputStream = FileInputStream(vpnInterface!!.fileDescriptor)
            val buffer = ByteBuffer.allocate(32767)

            while (isRunning) {
                // Read packets from VPN interface
                val length = inputStream.channel.read(buffer)
                if (length > 0) {
                    txBytes += length
                    buffer.flip()

                    // In a real implementation, this would:
                    // 1. Encrypt packet using WireGuard protocol
                    // 2. Send to WireGuard server endpoint
                    // 3. Receive encrypted response
                    // 4. Decrypt and write back to VPN interface

                    buffer.clear()
                }

                // Update notification periodically
                if (System.currentTimeMillis() % 5000 < 100) {
                    updateNotification()
                }
            }
        } catch (e: Exception) {
            if (isRunning) {
                Log.e(TAG, "Error routing packets", e)
            }
        }
    }

    /**
     * Stop VPN tunnel
     */
    private fun stopVPN() {
        isRunning = false

        try {
            vpnInterface?.close()
            vpnInterface = null
        } catch (e: Exception) {
            Log.e(TAG, "Error closing VPN interface", e)
        }

        stopForeground(true)
        stopSelf()
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "VPN Service destroyed")
        stopVPN()
    }

    /**
     * Get connection statistics
     */
    fun getStats(): Map<String, Any> {
        val duration = if (isRunning) System.currentTimeMillis() - startTime else 0
        return mapOf(
            "ipAddress" to "10.8.0.2",
            "rxBytes" to rxBytes,
            "txBytes" to txBytes,
            "lastHandshake" to System.currentTimeMillis(),
            "endpoint" to "server:51820",
            "duration" to duration
        )
    }

    /**
     * Create notification channel (required for Android O+)
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "WireGuard VPN",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "VPN connection status"
                setShowBadge(false)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }

    /**
     * Create notification for VPN status
     */
    private fun createNotification(tunnelName: String, connected: Boolean): Notification {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val status = if (connected) "Connected" else "Disconnected"
        val icon = if (connected) android.R.drawable.ic_dialog_info else android.R.drawable.ic_dialog_alert

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("$tunnelName VPN")
            .setContentText("Status: $status")
            .setSmallIcon(icon)
            .setContentIntent(pendingIntent)
            .setOngoing(connected)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    /**
     * Update notification with current stats
     */
    private fun updateNotification() {
        val notification = createNotification("Konektika", isRunning)
        val notificationManager = getSystemService(NotificationManager::class.java)
        notificationManager.notify(NOTIFICATION_ID, notification)
    }

    /**
     * Data class for WireGuard configuration
     */
    private data class WireGuardConfig(
        val address: String,
        val prefixLength: Int,
        val dns: String,
        val mtu: Int
    )
}
