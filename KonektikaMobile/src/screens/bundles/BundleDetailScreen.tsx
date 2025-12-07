import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {Card, Button, ActivityIndicator, Divider, Chip} from 'react-native-paper';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {theme} from '../../config/theme';
import {BundleService, Bundle} from '../../services/BundleService';
import {RootStackParamList} from '../../../App';

type BundleDetailRouteProp = RouteProp<RootStackParamList, 'BundleDetail'>;

const BundleDetailScreen = () => {
  const route = useRoute<BundleDetailRouteProp>();
  const navigation = useNavigation();
  const {bundleId, bundleData} = route.params;

  const [bundle, setBundle] = useState<Bundle | null>(bundleData || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If we already have bundle data from navigation, don't refetch.
    if (bundleData) {
      setLoading(false);
      return;
    }
    loadBundleDetails();
  }, [bundleId, bundleData]);

  const loadBundleDetails = async () => {
    try {
      const result = await BundleService.getBundleById(bundleId);

      if (result.success && result.bundle) {
        setBundle(result.bundle);
      } else {
        Alert.alert('Error', result.error || 'Failed to load bundle details');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = () => {
    if (!bundle) return;

    navigation.navigate('Payment' as never, {
      bundleId: bundle.id,
      bundleData: bundle,
    } as never);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading bundle details...</Text>
      </View>
    );
  }

  if (!bundle) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Bundle not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          {/* Bundle Header */}
          <View style={styles.header}>
            <Text style={styles.bundleName}>{bundle.name}</Text>
            {bundle.is_active ? (
              <Chip mode="flat" style={styles.activeChip} textStyle={styles.chipText}>
                Available
              </Chip>
            ) : (
              <Chip mode="flat" style={styles.inactiveChip} textStyle={styles.chipText}>
                Unavailable
              </Chip>
            )}
          </View>

          <Text style={styles.description}>{bundle.description}</Text>

          <Divider style={styles.divider} />

          {/* Price Section */}
          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.price}>TZS {bundle.price.toLocaleString()}</Text>
          </View>

          <Divider style={styles.divider} />

          {/* Bundle Details */}
          <View style={styles.detailsSection}>
            <Text style={styles.sectionTitle}>Bundle Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Data Limit</Text>
              <Text style={styles.detailValue}>{bundle.data_limit_gb} GB</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{bundle.duration_days} days</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Max Connections</Text>
              <Text style={styles.detailValue}>{bundle.max_connections} devices</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Speed</Text>
              <Text style={styles.detailValue}>Unlimited</Text>
            </View>
          </View>

          <Divider style={styles.divider} />

          {/* Features */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>Features</Text>
            
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>✓</Text>
              <Text style={styles.featureText}>High-speed VPN connection</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>✓</Text>
              <Text style={styles.featureText}>Secure and encrypted data</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>✓</Text>
              <Text style={styles.featureText}>24/7 connection availability</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>✓</Text>
              <Text style={styles.featureText}>Multiple device support</Text>
            </View>
            
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>✓</Text>
              <Text style={styles.featureText}>No bandwidth throttling</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Purchase Button */}
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handlePurchase}
          style={styles.purchaseButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}>
          Purchase Bundle
        </Button>
      </View>
    </ScrollView>
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
  errorText: {
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.error,
  },
  card: {
    margin: theme.spacing.md,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  bundleName: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text,
    flex: 1,
  },
  activeChip: {
    backgroundColor: theme.colors.success,
  },
  inactiveChip: {
    backgroundColor: theme.colors.disabled,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: theme.typography.sizes.xs,
  },
  description: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    opacity: 0.7,
    lineHeight: 22,
  },
  divider: {
    marginVertical: theme.spacing.lg,
  },
  priceSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  priceLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    opacity: 0.6,
    marginBottom: theme.spacing.xs,
  },
  price: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.primary,
  },
  detailsSection: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  detailLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    opacity: 0.7,
  },
  detailValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text,
  },
  featuresSection: {
    marginBottom: theme.spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  featureBullet: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.success,
    marginRight: theme.spacing.sm,
    fontWeight: theme.typography.fontWeights.bold,
  },
  featureText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    flex: 1,
  },
  buttonContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  purchaseButton: {
    borderRadius: theme.borderRadius.md,
  },
  buttonContent: {
    paddingVertical: theme.spacing.md,
  },
  buttonLabel: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
  },
});

export default BundleDetailScreen;
