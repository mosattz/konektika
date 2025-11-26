import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, Alert} from 'react-native';
import {Card, Button, ActivityIndicator} from 'react-native-paper';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {theme} from '../../config/theme';
import {PaymentService, Payment} from '../../services/PaymentService';
import {RootStackParamList} from '../../../App';

type PaymentStatusRouteProp = RouteProp<RootStackParamList, 'PaymentStatus'>;

const PaymentStatusScreen = () => {
  const route = useRoute<PaymentStatusRouteProp>();
  const navigation = useNavigation();
  const {paymentId, bundleName} = route.params;

  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    checkPaymentStatus();

    // Poll every 2 seconds for status updates so the UI reflects
    // provider-confirmed payments a bit faster.
    const interval = setInterval(() => {
      if (polling) {
        checkPaymentStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [paymentId, polling]);

  const checkPaymentStatus = async () => {
    try {
      const result = await PaymentService.checkPaymentStatus(paymentId);

      if (result.success && result.payment) {
        setPayment(result.payment);

        // Stop polling if payment is completed or failed
        if (result.payment.status === 'completed' || result.payment.status === 'failed' || result.payment.status === 'cancelled') {
          setPolling(false);
        }
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    if (payment?.status === 'completed') {
      // After successful payment, navigate to Connection tab so user can see VPN configs
      navigation.navigate('Main' as never, {screen: 'Connection'} as never);
    } else {
      navigation.goBack();
    }
  };

  const getStatusIcon = () => {
    if (!payment) return '⏳';

    switch (payment.status) {
      case 'completed':
        return '✓';
      case 'failed':
        return '✗';
      case 'cancelled':
        return '✗';
      case 'pending':
      default:
        return '⏳';
    }
  };

  const getStatusColor = () => {
    if (!payment) return theme.colors.primary;

    switch (payment.status) {
      case 'completed':
        return theme.colors.success;
      case 'failed':
      case 'cancelled':
        return theme.colors.error;
      case 'pending':
      default:
        return theme.colors.warning;
    }
  };

  const getStatusText = () => {
    if (!payment) return 'Checking payment status...';

    switch (payment.status) {
      case 'completed':
        return 'Payment Successful!';
      case 'failed':
        return 'Payment Failed';
      case 'cancelled':
        return 'Payment Cancelled';
      case 'pending':
      default:
        return 'Payment Pending';
    }
  };

  const getStatusMessage = () => {
    if (!payment) return 'Please wait while we verify your payment...';

    switch (payment.status) {
      case 'completed':
        return `Your ${bundleName} has been activated successfully. You can now download your VPN configuration from the Connection tab.`;
      case 'failed':
        return 'Your payment could not be processed. Please try again or contact support if the issue persists.';
      case 'cancelled':
        return 'You cancelled the payment. No charges have been made to your account.';
      case 'pending':
      default:
        return 'Please check your phone and enter your PIN to complete the payment. This may take a few moments...';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading payment status...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          {/* Status Icon */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, {backgroundColor: getStatusColor()}]}>
              <Text style={styles.icon}>{getStatusIcon()}</Text>
            </View>
          </View>

          {/* Status Text */}
          <Text style={[styles.statusText, {color: getStatusColor()}]}>
            {getStatusText()}
          </Text>

          <Text style={styles.statusMessage}>{getStatusMessage()}</Text>

          {payment && (
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bundle</Text>
                <Text style={styles.detailValue}>{bundleName}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount</Text>
                <Text style={styles.detailValue}>TZS {payment.amount.toLocaleString()}</Text>
              </View>

              {/* Reference is not provided directly in Payment type; it is shown in initiation message instead. */}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <Text style={[styles.detailValue, {color: getStatusColor(), fontWeight: 'bold'}]}>
                  {payment.status.toUpperCase()}
                </Text>
              </View>
            </View>
          )}

          {polling && payment?.status === 'pending' && (
            <View style={styles.pollingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.pollingText}>Checking payment status...</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        {payment?.status === 'completed' && (
          <Button
            mode="contained"
            onPress={handleDone}
            style={styles.button}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}>
            Go to Home
          </Button>
        )}

        {(payment?.status === 'failed' || payment?.status === 'cancelled') && (
          <>
            <Button
              mode="contained"
              onPress={() => navigation.goBack()}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}>
              Try Again
            </Button>
            <Button
              mode="outlined"
              onPress={handleDone}
              style={[styles.button, styles.outlinedButton]}
              contentStyle={styles.buttonContent}
              labelStyle={styles.outlinedButtonLabel}>
              Go Back
            </Button>
          </>
        )}

        {payment?.status === 'pending' && (
          <Button
            mode="outlined"
            onPress={() => {
              Alert.alert(
                'Cancel Payment',
                'Are you sure you want to cancel this payment check? You can always check the status later from your payment history.',
                [
                  {text: 'No', style: 'cancel'},
                  {text: 'Yes', onPress: () => navigation.navigate('Main' as never)},
                ]
              );
            }}
            style={[styles.button, styles.outlinedButton]}
            contentStyle={styles.buttonContent}
            labelStyle={styles.outlinedButtonLabel}>
            Cancel
          </Button>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
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
  card: {
    flex: 1,
    elevation: 4,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: theme.spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 60,
    color: '#FFFFFF',
  },
  statusText: {
    fontSize: theme.typography.sizes.xxl,
    fontWeight: theme.typography.fontWeights.bold,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  statusMessage: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  detailsContainer: {
    marginTop: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  detailLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    opacity: 0.6,
  },
  detailValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text,
  },
  pollingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: '#F5F5F5',
    borderRadius: theme.borderRadius.md,
  },
  pollingText: {
    marginLeft: theme.spacing.sm,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    opacity: 0.7,
  },
  buttonContainer: {
    marginTop: theme.spacing.md,
  },
  button: {
    marginBottom: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  outlinedButton: {
    borderColor: theme.colors.primary,
  },
  buttonContent: {
    paddingVertical: theme.spacing.sm,
  },
  buttonLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
  outlinedButtonLabel: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.primary,
  },
});

export default PaymentStatusScreen;
