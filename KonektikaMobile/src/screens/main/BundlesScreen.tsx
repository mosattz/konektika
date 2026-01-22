import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {Card, Searchbar, ActivityIndicator, Chip} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {theme} from '../../config/theme';
import {BundleService, Bundle} from '../../services/BundleService';

const BundlesScreen = () => {
  const navigation = useNavigation();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [filteredBundles, setFilteredBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadBundles();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = bundles.filter(
        bundle =>
          bundle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bundle.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredBundles(filtered);
    } else {
      setFilteredBundles(bundles);
    }
  }, [searchQuery, bundles]);

  const loadBundles = async () => {
    try {
      const result = await BundleService.getBundles();
      
      if (result.success && result.bundles) {
        setBundles(result.bundles);
        setFilteredBundles(result.bundles);
      } else {
        Alert.alert('Error', result.error || 'Failed to load bundles');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBundles();
  };

  const handleBundlePress = (bundle: Bundle) => {
    navigation.navigate('BundleDetail' as never, {
      bundleId: bundle.id.toString(),
      bundleName: bundle.name,
      bundleData: bundle,
    } as never);
  };

  const renderBundleItem = ({item}: {item: Bundle}) => (
    <TouchableOpacity onPress={() => handleBundlePress(item)}>
      <Card style={styles.bundleCard}>
        <Card.Content>
          <View style={styles.bundleHeader}>
            <Text style={styles.bundleName}>{item.name}</Text>
            {item.is_active ? (
              <Chip mode="flat" style={styles.activeChip} textStyle={styles.chipText}>
                Active
              </Chip>
            ) : (
              <Chip mode="flat" style={styles.inactiveChip} textStyle={styles.chipText}>
                Inactive
              </Chip>
            )}
          </View>

          <Text style={styles.bundleDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.bundleDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Data Limit</Text>
              <Text style={styles.detailValue}>{item.data_limit_gb} GB</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Duration</Text>
              <Text style={styles.detailValue}>{item.duration_days} days</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Price</Text>
              <Text style={styles.priceValue}>TZS {item.price.toLocaleString()}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>No Bundles Available</Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery
          ? 'No bundles match your search'
          : 'There are no VPN bundles available at the moment'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading bundles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Search bundles..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
      />

      <FlatList
        data={filteredBundles}
        renderItem={renderBundleItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
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
  searchBar: {
    margin: theme.spacing.md,
    elevation: 2,
  },
  searchInput: {
    fontSize: theme.typography.sizes.md,
  },
  listContainer: {
    padding: theme.spacing.md,
    paddingTop: 0,
  },
  bundleCard: {
    marginBottom: theme.spacing.md,
    elevation: 3,
  },
  bundleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  bundleName: {
    fontSize: theme.typography.sizes.lg,
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
  bundleDescription: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    opacity: 0.7,
    marginBottom: theme.spacing.md,
  },
  bundleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.text,
    opacity: 0.6,
    marginBottom: theme.spacing.xs,
  },
  detailValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text,
  },
  priceValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  emptySubtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    opacity: 0.6,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
});

export default BundlesScreen;
