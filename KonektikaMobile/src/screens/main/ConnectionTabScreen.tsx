import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, ActivityIndicator} from 'react-native';
import {Button} from 'react-native-paper';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {theme} from '../../config/theme';
import {VPNService} from '../../services/VPNService';
import VPNConnectionScreen from './VPNConnectionScreen';

/**
 * Connection Tab Screen
 * This replaces the old ConnectionScreen completely
 * 
 * Behavior:
 * - If user has active config: Shows VPNConnectionScreen directly
 * - If user has no active config: Shows "Purchase Bundle" prompt
 */
const ConnectionTabScreen = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [activeConfigId, setActiveConfigId] = useState<number | null>(null);
  const [bundleName, setBundleName] = useState<string>('');

  // Check for active config whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadActiveConfig();
    }, [])
  );

  const loadActiveConfig = async () => {
    try {
      setLoading(true);
      const result = await VPNService.getConfigs();

      if (result.success && result.configs) {
        // Find the first active (non-expired) config
        const activeConfig = result.configs.find(config => {
          const isExpired = new Date(config.expires_at) < new Date();
          return config.is_active && !isExpired;
        });

        if (activeConfig) {
          setActiveConfigId(activeConfig.id);
          setBundleName(activeConfig.bundle_name || `Config #${activeConfig.id}`);
        } else {
          setActiveConfigId(null);
        }
      } else {
        setActiveConfigId(null);
      }
    } catch (error) {
      console.error('Error loading VPN config:', error);
      setActiveConfigId(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // If user has active config, show VPN connection screen
  if (activeConfigId) {
    return (
      <VPNConnectionScreen
        route={{
          params: {
            configId: activeConfigId,
            bundleName: bundleName,
          },
        } as any}
      />
    );
  }

  // If no active config, show purchase prompt
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyContent}>
        <Text style={styles.emptyIcon}>🔒</Text>
        <Text style={styles.emptyTitle}>No Active VPN Bundle</Text>
        <Text style={styles.emptySubtitle}>
          Purchase a VPN bundle to start browsing securely and privately.
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Bundles' as never)}
          style={styles.purchaseButton}
          contentStyle={styles.purchaseButtonContent}
          labelStyle={styles.purchaseButtonLabel}>
          Browse VPN Bundles
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  emptyContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: theme.spacing.xl,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    opacity: 0.7,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
  },
  purchaseButton: {
    borderRadius: theme.borderRadius.lg,
    elevation: 4,
  },
  purchaseButtonContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
  },
  purchaseButtonLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
});

export default ConnectionTabScreen;
