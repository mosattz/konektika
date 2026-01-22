import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {Card, List, Button, Divider, ActivityIndicator, Avatar} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {theme} from '../../config/theme';
import {AuthService, User} from '../../services/AuthService';
import {BundleService} from '../../services/BundleService';
import {VPNService} from '../../services/VPNService';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<User | null>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [vpnConfigs, setVpnConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      // Load user profile
      const userResult = await AuthService.getProfile();
      if (userResult.success && userResult.user) {
        setUser(userResult.user);
      }

      // Load subscriptions
      const subsResult = await BundleService.getMySubscriptions();
      if (subsResult.success && subsResult.subscriptions) {
        setSubscriptions(subsResult.subscriptions);
      }

      // Load VPN configs
      const configsResult = await VPNService.getConfigs();
      if (configsResult.success && configsResult.configs) {
        setVpnConfigs(configsResult.configs);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.logout();
              // Navigation will be handled by App component
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* User Info Card */}
      <Card style={styles.profileCard}>
        <Card.Content>
          <View style={styles.profileHeader}>
            <Avatar.Text
              size={80}
              label={user?.full_name?.substring(0, 2).toUpperCase() || 'U'}
              style={styles.avatar}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user?.full_name || 'User'}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <Text style={styles.userPhone}>{user?.phone_number}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Statistics Card */}
      <Card style={styles.statsCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{subscriptions.length}</Text>
              <Text style={styles.statLabel}>Active Bundles</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{vpnConfigs.length}</Text>
              <Text style={styles.statLabel}>VPN Configs</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Quick Actions */}
      <Card style={styles.actionsCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <List.Item
            title="My Subscriptions"
            description="View your active bundles"
            left={props => <List.Icon {...props} icon="package-variant" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {/* Navigate to subscriptions */}}
            style={styles.listItem}
          />
          
          <Divider />
          
          <List.Item
            title="VPN Configurations"
            description="Manage your VPN configs"
            left={props => <List.Icon {...props} icon="shield-lock" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('Connection' as never)}
            style={styles.listItem}
          />
          
          <Divider />
          
          <List.Item
            title="Payment History"
            description="View past transactions"
            left={props => <List.Icon {...props} icon="history" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('PaymentHistory' as never)}
            style={styles.listItem}
          />
        </Card.Content>
      </Card>

      {/* Settings */}
      <Card style={styles.settingsCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <List.Item
            title="Account Settings"
            description="Update your profile"
            left={props => <List.Icon {...props} icon="account-cog" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {/* Navigate to account settings */}}
            style={styles.listItem}
          />
          
          <Divider />
          
          <List.Item
            title="Help & Support"
            description="Get help or contact us"
            left={props => <List.Icon {...props} icon="help-circle" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {/* Navigate to help */}}
            style={styles.listItem}
          />
          
          <Divider />
          
          <List.Item
            title="About Konektika"
            description="Version 1.0.0"
            left={props => <List.Icon {...props} icon="information" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {/* Navigate to about */}}
            style={styles.listItem}
          />
        </Card.Content>
      </Card>

      {/* Logout Button */}
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleLogout}
          style={styles.logoutButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          buttonColor={theme.colors.error}>
          Logout
        </Button>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Konektika VPN © 2025</Text>
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
  profileCard: {
    margin: theme.spacing.md,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: theme.colors.primary,
  },
  profileInfo: {
    marginLeft: theme.spacing.lg,
    flex: 1,
  },
  userName: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  userEmail: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    opacity: 0.7,
    marginBottom: theme.spacing.xs,
  },
  userPhone: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    opacity: 0.7,
  },
  statsCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginHorizontal: theme.spacing.md,
  },
  statValue: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    opacity: 0.7,
    textAlign: 'center',
  },
  actionsCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    elevation: 3,
  },
  settingsCard: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    elevation: 3,
  },
  listItem: {
    paddingVertical: theme.spacing.xs,
  },
  buttonContainer: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  logoutButton: {
    borderRadius: theme.borderRadius.md,
  },
  buttonContent: {
    paddingVertical: theme.spacing.sm,
  },
  buttonLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
  },
  footerText: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    opacity: 0.5,
  },
});

export default ProfileScreen;
