import React, {useEffect} from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {theme} from '../config/theme';

const {width, height} = Dimensions.get('window');

interface SplashScreenProps {
  onTimeout?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({onTimeout}) => {
  useEffect(() => {
    // Auto-close splash after 2 seconds if onTimeout is provided
    if (onTimeout) {
      const timer = setTimeout(onTimeout, 2000);
      return () => clearTimeout(timer);
    }
  }, [onTimeout]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* App Logo/Name */}
        <View style={styles.logoContainer}>
          <Text style={styles.appName}>Konektika</Text>
          <Text style={styles.tagline}>VPN Bundle Sharing</Text>
        </View>

        {/* Loading indicator */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="large" 
            color={theme.colors.secondary} 
          />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>

        {/* Version info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.poweredBy}>Powered by Konektika</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: height * 0.15,
    paddingHorizontal: theme.spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: theme.typography.sizes.xxxl + 8,
    fontWeight: theme.typography.fontWeights.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  tagline: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.normal,
    color: '#E3F2FD',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.typography.sizes.md,
    color: '#FFFFFF',
    marginTop: theme.spacing.md,
    fontWeight: theme.typography.fontWeights.medium,
  },
  versionContainer: {
    alignItems: 'center',
  },
  versionText: {
    fontSize: theme.typography.sizes.sm,
    color: '#E3F2FD',
    marginBottom: theme.spacing.xs,
  },
  poweredBy: {
    fontSize: theme.typography.sizes.xs,
    color: '#BBDEFB',
  },
});

export default SplashScreen;