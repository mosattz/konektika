import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
  RefreshControl,
} from 'react-native';
import {Card, Button, ActivityIndicator, Chip, FAB} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {theme} from '../../config/theme';
import {VPNService, VPNConfig} from '../../services/VPNService';

const ConnectionScreen = () => {
  const navigation = useNavigation();
  const [configs, setConfigs] = useState<VPNConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const result = await VPNService.getConfigs();

      if (result.success && result.configs) {
        setConfigs(result.configs);
      } else {
        Alert.alert('Error', result.error || 'Failed to load VPN configurations');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDownloadConfig = async (config: VPNConfig) => {
    try {
      const result = await VPNService.downloadConfig(config.id);

      if (result.success && result.data) {
        // On mobile, we can share the config file
        await Share.share({
          message: result.data,
          title: result.filename || 'VPN Config',
        });
      } else {
        Alert.alert('Error', result.error || 'Failed to download configuration');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to download configuration');
    }
  };

  const handleViewConfig = (config: VPNConfig) => {
    const info = VPNService.parseConfigInfo(config.config_data);

    Alert.alert(
      'VPN Configuration Details',
      `Server: ${info.server || 'N/A'}\nPort: ${info.port || 'N/A'}\nProtocol: ${info.protocol || 'N/A'}\n\nExpires: ${new Date(config.expires_at).toLocaleDateString()}`,
      [
        {text: 'Close', style: 'cancel'},
        {text: 'Download', onPress: () => handleDownloadConfig(config)},
      ]
    );
  };

  const renderConfigCard = (config: VPNConfig) => {
    const isExpired = new Date(config.expires_at) < new Date();
    const isActive = config.is_active && !isExpired;
    const info = VPNService.parseConfigInfo(config.config_data);

    return (
      <TouchableOpacity
        key={config.id}
        onPress={() => handleViewConfig(config)}
        activeOpacity={0.7}>
        <Card style={styles.configCard}>
          <Card.Content>
            <View style={styles.configHeader}>
              <View style={styles.configInfo}>
                <Text style={styles.configTitle}>VPN Config #{config.id}</Text>
                <Text style={styles.configSubtitle}>
                  {info.server ? `${info.server}:${info.port}` : 'Config available'}
                </Text>
              </View>
              {isActive ? (
                <Chip mode="flat" style={styles.activeChip} textStyle={styles.chipText}>
                  Active
                </Chip>
              ) : (
                <Chip mode="flat" style={styles.expiredChip} textStyle={styles.chipText}>
                  Expired
                </Chip>
              )}
            </View>

            <View style={styles.configDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created</Text>
                <Text style={styles.detailValue}>
                  {new Date(config.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Expires</Text>
                <Text style={[styles.detailValue, isExpired && styles.expiredText]}>
                  {new Date(config.expires_at).toLocaleDateString()}
                </Text>
              </View>
              {info.protocol && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Protocol</Text>
                  <Text style={styles.detailValue}>{info.protocol}</Text>
                </View>
              )}
            </View>

            {isActive && (
              <Button
                mode="contained"
                onPress={() => handleDownloadConfig(config)}
                style={styles.downloadButton}
                icon="download"
                contentStyle={styles.downloadButtonContent}>
                Download Config
              </Button>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No VPN Configurations</Text>
      <Text style={styles.emptySubtitle}>
        Purchase a bundle to get your VPN configuration and start browsing securely.
      </Text>
      <Button
        mode="contained"
        onPress={() => navigation.navigate('Bundles' as never)}
        style={styles.emptyButton}
        contentStyle={styles.emptyButtonContent}>
        Browse Bundles
      </Button>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading configurations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {configs.length > 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadConfigs();
              }}
            />
          }>
          {/* Instructions Card */}
          <Card style={styles.instructionsCard}>
            <Card.Content>
              <Text style={styles.instructionsTitle}>How to Connect</Text>
              <Text style={styles.instructionsText}>
                1. Download your VPN configuration file below{'\n'}
                2. Install OpenVPN Connect app from Play Store/App Store{'\n'}
                3. Import the downloaded .ovpn file{'\n'}
                4. Connect and enjoy secure browsing!
              </Text>
            </Card.Content>
          </Card>

          {/* VPN Configs */}
          {configs.map(config => renderConfigCard(config))}
        </ScrollView>
      ) : (
        renderEmptyState()
      )}

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="refresh"
        onPress={() => {
          setRefreshing(true);
          loadConfigs();
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  instructionsCard: {
    marginBottom: theme.spacing.md,
    backgroundColor: '#E3F2FD',
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  instructionsText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    lineHeight: 20,
  },
  configCard: {
    marginBottom: theme.spacing.md,
    elevation: 3,
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  configInfo: {
    flex: 1,
  },
  configTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  configSubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    opacity: 0.6,
  },
  activeChip: {
    backgroundColor: theme.colors.success,
  },
  expiredChip: {
    backgroundColor: theme.colors.disabled,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.xs,
  },
  configDetails: {
    marginBottom: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
  },
  detailLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    opacity: 0.6,
  },
  detailValue: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text,
  },
  expiredText: {
    color: theme.colors.error,
  },
  downloadButton: {
    marginTop: theme.spacing.sm,
  },
  downloadButtonContent: {
    paddingVertical: theme.spacing.xs,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: theme.spacing.lg,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    opacity: 0.6,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyButton: {
    borderRadius: theme.borderRadius.md,
  },
  emptyButtonContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  fab: {
    position: 'absolute',
    margin: theme.spacing.md,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
});

export default ConnectionScreen;
