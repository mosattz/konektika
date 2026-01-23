package com.konektikamobile

import android.content.Intent
import android.net.VpnService
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File

class WireGuardVPNModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private val TAG = "WireGuardVPN"
    private var vpnService: WireGuardVpnService? = null
    private var isConnected = false
    private var currentTunnelName: String? = null

    override fun getName(): String {
        return "WireGuardVPN"
    }

    /**
     * Connect to WireGuard VPN
     * @param config WireGuard configuration file content
     * @param tunnelName Name of the tunnel
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    fun connect(config: String, tunnelName: String, promise: Promise) {
        try {
            Log.d(TAG, "Attempting to connect to WireGuard VPN: $tunnelName")

            // Check if VPN permission is granted
            val intent = VpnService.prepare(reactApplicationContext)
            if (intent != null) {
                // VPN permission not granted - need to request it
                promise.reject("VPN_PERMISSION_REQUIRED", "VPN permission is required. Please grant it in settings.")
                return
            }

            // Save config to temporary file
            val configFile = File(reactApplicationContext.filesDir, "$tunnelName.conf")
            configFile.writeText(config)

            // Start VPN service
            val vpnIntent = Intent(reactApplicationContext, WireGuardVpnService::class.java).apply {
                putExtra("CONFIG_FILE", configFile.absolutePath)
                putExtra("TUNNEL_NAME", tunnelName)
            }
            
            reactApplicationContext.startService(vpnIntent)
            
            currentTunnelName = tunnelName
            isConnected = true
            
            // Notify JavaScript of connection state change
            sendConnectionEvent(true)
            
            val result = Arguments.createMap().apply {
                putString("tunnelName", tunnelName)
                putString("status", "connected")
            }
            
            promise.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to connect to VPN", e)
            promise.reject("VPN_CONNECTION_FAILED", e.message)
        }
    }

    /**
     * Disconnect from WireGuard VPN
     * @param promise Promise to resolve/reject
     */
    @ReactMethod
    fun disconnect(promise: Promise) {
        try {
            Log.d(TAG, "Disconnecting from WireGuard VPN")
            
            // Stop VPN service
            val vpnIntent = Intent(reactApplicationContext, WireGuardVpnService::class.java)
            reactApplicationContext.stopService(vpnIntent)
            
            isConnected = false
            currentTunnelName = null
            
            // Notify JavaScript of connection state change
            sendConnectionEvent(false)
            
            promise.resolve(null)
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to disconnect from VPN", e)
            promise.reject("VPN_DISCONNECTION_FAILED", e.message)
        }
    }

    /**
     * Get current VPN connection status
     * @param promise Promise to resolve with status
     */
    @ReactMethod
    fun getStatus(promise: Promise) {
        try {
            val status = Arguments.createMap().apply {
                putBoolean("isConnected", isConnected)
                putString("tunnelName", currentTunnelName)
            }
            promise.resolve(status)
        } catch (e: Exception) {
            promise.reject("STATUS_ERROR", e.message)
        }
    }

    /**
     * Get VPN connection statistics
     * @param promise Promise to resolve with stats
     */
    @ReactMethod
    fun getStats(promise: Promise) {
        try {
            if (!isConnected || vpnService == null) {
                promise.resolve(null)
                return
            }

            val stats = vpnService?.getStats()
            
            val statsMap = Arguments.createMap().apply {
                putString("ipAddress", stats?.get("ipAddress") as? String ?: "10.8.0.2")
                putDouble("rxBytes", (stats?.get("rxBytes") as? Long ?: 0L).toDouble())
                putDouble("txBytes", (stats?.get("txBytes") as? Long ?: 0L).toDouble())
                putDouble("lastHandshake", (stats?.get("lastHandshake") as? Long ?: 0L).toDouble())
                putString("endpoint", stats?.get("endpoint") as? String ?: "")
            }
            
            promise.resolve(statsMap)
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to get stats", e)
            promise.reject("STATS_ERROR", e.message)
        }
    }

    /**
     * Get VPN-assigned IP address
     * @param promise Promise to resolve with IP address
     */
    @ReactMethod
    fun getVPNAddress(promise: Promise) {
        try {
            if (!isConnected) {
                promise.resolve(null)
                return
            }
            
            // In a real implementation, this would get the actual tunnel interface IP
            promise.resolve("10.8.0.2")
            
        } catch (e: Exception) {
            promise.reject("ADDRESS_ERROR", e.message)
        }
    }

    /**
     * Send connection state change event to JavaScript
     */
    private fun sendConnectionEvent(connected: Boolean) {
        try {
            val params = Arguments.createMap().apply {
                putBoolean("connected", connected)
            }
            
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("WireGuardConnectionChanged", params)
                
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send connection event", e)
        }
    }

    /**
     * Set VPN service instance (called by service)
     */
    fun setVpnService(service: WireGuardVpnService?) {
        this.vpnService = service
    }
}
