import React from 'react';
import {View, StyleSheet, Text} from 'react-native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import {Button, ActivityIndicator} from 'react-native-paper';
import {WebView} from 'react-native-webview';
import {RootStackParamList} from '../../../App';
import {theme} from '../../config/theme';

// NOTE: Ensure `react-native-webview` is installed in your project.
// npm install react-native-webview

export type PesapalCheckoutRouteProp = RouteProp<RootStackParamList, 'PesapalCheckout'>;

const PesapalCheckoutScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<PesapalCheckoutRouteProp>();
  const {paymentId, bundleId, bundleName, redirectUrl} = route.params;

  const handleDone = () => {
    navigation.navigate('PaymentStatus' as never, {
      paymentId,
      bundleId,
      bundleName,
    } as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Please complete your payment in the secure PesaPal window below. Once you are done, tap
          "Check Payment Status".
        </Text>
      </View>

      <View style={styles.webviewContainer}>
        <WebView
          source={{uri: redirectUrl}}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading payment page...</Text>
            </View>
          )}
        />
      </View>

      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handleDone}
          style={styles.button}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}>
          Check Payment Status
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  infoContainer: {
    padding: theme.spacing.md,
  },
  infoText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
  },
  webviewContainer: {
    flex: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
  },
  buttonContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  button: {
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

export default PesapalCheckoutScreen;
