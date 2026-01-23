import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Easing,
} from 'react-native';
import {Button, ActivityIndicator} from 'react-native-paper';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {theme} from '../../config/theme';
import {
  VPNConnectionService,
  ConnectionStatus,
  ConnectionStats,
} from '../../services/VPNConnectionService';
import {RootStackParamList} from '../../../App';

type VPNConnectionRouteProp = RouteProp<RootStackParamList, 'VPNConnection'>;

const VPNConnectionScreen = () => {
  const route = useRoute<VPNConnectionRouteProp>();
  const navigation = useNavigation();
  const {configId, bundleName} = route.params || {};

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    VPNConnectionService.getStatus()
  );
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [shieldAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    // Initialize VPN service
    VPNConnectionService.initialize();

    // Subscribe to connection status changes
    const unsubscribe = VPNConnectionService.addListener(status => {
      setConnectionStatus(status);
    });

    // Update stats every second when connected
    const statsInterval = setInterval(async () => {
      if (connectionStatus.isConnected) {
        const currentStats = await VPNConnectionService.getStats();
        setStats(currentStats);
      } else {
        setStats(null);
      }
    }, 1000);

    // If configId was provided, auto-connect
    if (configId && !connectionStatus.isConnected && !connectionStatus.isConnecting) {
      handleConnect();
    }

    return () => {
      unsubscribe();
      clearInterval(statsInterval);
    };
  }, [configId]);

  useEffect(() => {
    // Animate shield when connection status changes
    if (connectionStatus.isConnected) {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(shieldAnimation, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
          Animated.timing(shieldAnimation, {
            toValue: 1,
            duration: 1000,
            easing: Easing.ease,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      shieldAnimation.setValue(1);
    }
  }, [connectionStatus.isConnected]);

  const handleConnect = async () => {
    if (!configId) {
      Alert.alert(
        'No Configuration',
        'Please purchase a bundle first to get a VPN configuration.',
        [
          {
            text: 'Browse Bundles',
            onPress: () => navigation.navigate('Bundles' as never),
          },
          {text: 'Cancel', style: 'cancel'},
        ]
      );
      return;
    }

    const result = await VPNConnectionService.connect(configId);
    if (!result.success) {
      Alert.alert('Connection Failed', result.error || 'Failed to connect to VPN');
    }
  };

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect VPN',
      'Are you sure you want to disconnect from the VPN?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            const result = await VPNConnectionService.disconnect();
            if (!result.success) {
              Alert.alert('Disconnection Failed', result.error || 'Failed to disconnect');
            }
          },
        },
      ]
    );
  };

  const handleToggleConnection = () => {
    if (connectionStatus.isConnected) {
      handleDisconnect();
    } else if (!connectionStatus.isConnecting) {
      handleConnect();
    }
  };

  const getStatusText = () => {
    if (connectionStatus.isConnecting) return 'CONNECTING...';
    if (connectionStatus.isConnected) return 'CONNECTED';
    return 'DISCONNECTED';
  };

  const getStatusColor = () => {
    if (connectionStatus.isConnecting) return theme.colors.warning;
    if (connectionStatus.isConnected) return theme.colors.success;
    return theme.colors.disabled;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VPN</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => navigation.navigate('Profile' as never)}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Shield Icon */}
      <View style={styles.shieldContainer}>
        <Animated.View
          style={[
            styles.shieldBackground,
            {
              backgroundColor: connectionStatus.isConnected
                ? 'rgba(76, 175, 80, 0.1)'
                : 'rgba(158, 158, 158, 0.1)',
              transform: [{scale: shieldAnimation}],
            },
          ]}
        />
        <View
          style={[
            styles.shield,
            {
              backgroundColor: getStatusColor(),
            },
          ]}>
          {connectionStatus.isConnecting ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <Text style={styles.shieldIcon}>
              {connectionStatus.isConnected ? '✓' : '🔒'}
            </Text>
          )}
        </View>
      </View>

      {/* Status Text */}
      <Text style={[styles.statusText, {color: getStatusColor()}]}>
        {getStatusText()}
      </Text>

      {/* Bundle Name */}
      {bundleName && (
        <Text style={styles.bundleName}>{bundleName}</Text>
      )}

      {/* Connect/Disconnect Button */}
      <Button
        mode="contained"
        onPress={handleToggleConnection}
        disabled={connectionStatus.isConnecting}
        style={[
          styles.actionButton,
          {
            backgroundColor: connectionStatus.isConnected
              ? theme.colors.success
              : theme.colors.primary,
          },
        ]}
        contentStyle={styles.actionButtonContent}
        labelStyle={styles.actionButtonLabel}>
        {connectionStatus.isConnecting
          ? 'CONNECTING...'
          : connectionStatus.isConnected
          ? 'DISCONNECT'
          : 'CONNECT'}
      </Button>

      {/* Connection Stats */}
      {connectionStatus.isConnected && stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statRow}>
            <View style={styles.statIcon}>
              <Text style={styles.statIconText}>📡</Text>
            </View>
            <Text style={styles.statLabel}>
              IP: <Text style={styles.statValue}>{stats.ipAddress}</Text>
            </Text>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statIcon}>
              <Text style={styles.statIconText}>⏱️</Text>
            </View>
            <Text style={styles.statLabel}>
              Time Connected:{' '}
              <Text style={styles.statValue}>
                {VPNConnectionService.formatDuration(stats.durationSeconds)}
              </Text>
            </Text>
          </View>
        </View>
      )}

      {/* Error Display */}
      {connectionStatus.error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{connectionStatus.error}</Text>
        </View>
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Bundles' as never)}>
          <Text style={styles.navIcon}>📍</Text>
          <Text style={styles.navLabel}>Locations</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>🔒</Text>
          <Text style={styles.navLabel}>Security</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Text style={styles.navIcon}>⚡</Text>
          <Text style={styles.navLabel}>Speed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Profile' as never)}>
          <Text style={styles.navIcon}>⚙️</Text>
          <Text style={styles.navLabel}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  backIcon: {
    fontSize: 28,
    color: theme.colors.text,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.success,
  },
  settingsButton: {
    padding: theme.spacing.sm,
  },
  settingsIcon: {
    fontSize: 24,
  },
  shieldContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    height: 200,
  },
  shieldBackground: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  shield: {
    width: 120,
    height: 140,
    borderRadius: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  shieldIcon: {
    fontSize: 60,
    color: '#FFFFFF',
  },
  statusText: {
    fontSize: 32,
    fontWeight: theme.typography.fontWeights.bold,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  bundleName: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    opacity: 0.7,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  actionButton: {
    marginHorizontal: theme.spacing.xl,
    marginVertical: theme.spacing.lg,
    borderRadius: 30,
    elevation: 4,
  },
  actionButtonContent: {
    paddingVertical: theme.spacing.md,
  },
  actionButtonLabel: {
    fontSize: 18,
    fontWeight: theme.typography.fontWeights.bold,
    color: '#FFFFFF',
  },
  statsContainer: {
    marginHorizontal: theme.spacing.xl,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    elevation: 2,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  statIconText: {
    fontSize: 20,
  },
  statLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    opacity: 0.7,
  },
  statValue: {
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.success,
    opacity: 1,
  },
  errorContainer: {
    marginHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: '#FFEBEE',
    borderRadius: theme.borderRadius.md,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: theme.typography.sizes.sm,
    textAlign: 'center',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: theme.spacing.lg,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  navItem: {
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: theme.spacing.xs,
  },
  navLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
    opacity: 0.7,
  },
});

export default VPNConnectionScreen;
