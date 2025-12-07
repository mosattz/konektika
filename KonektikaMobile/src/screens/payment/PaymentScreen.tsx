import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {Card, TextInput, Button, RadioButton, Portal, Dialog} from 'react-native-paper';
import {useRoute, useNavigation, RouteProp} from '@react-navigation/native';
import {theme} from '../../config/theme';
import {PaymentService} from '../../services/PaymentService';
import {AuthService} from '../../services/AuthService';
import {RootStackParamList} from '../../../App';

type PaymentRouteProp = RouteProp<RootStackParamList, 'Payment'>;

const PaymentScreen = () => {
  const route = useRoute<PaymentRouteProp>();
  const navigation = useNavigation();
  const {bundleId, bundleData} = route.params;

  const [phoneNumber, setPhoneNumber] = useState('');
  const [provider, setProvider] = useState('pesapal');
  const [loading, setLoading] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [confirmPhone, setConfirmPhone] = useState<string | null>(null);

  const providers = [
    {
      value: 'pesapal',
      label: 'PesaPal (Mobile Money & Cards)',
      color: '#1976D2',
    },
  ];

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove spaces and dashes
    const cleaned = phone.replace(/[\s-]/g, '');
    
    // Check if it's a valid Tanzanian number
    const tanzaniaRegex = /^(\+?255|0)[67]\d{8}$/;
    
    return tanzaniaRegex.test(cleaned);
  };

  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/[\s-]/g, '');
    
    // Convert 0XXXXXXXXX to +255XXXXXXXXX
    if (cleaned.startsWith('0')) {
      cleaned = '+255' + cleaned.substring(1);
    } else if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  };

  const handlePayment = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter your phone number');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      Alert.alert(
        'Invalid Phone Number',
        'Please enter a valid Tanzanian phone number (e.g., +255712345678 or 0712345678)'
      );
      return;
    }

    const formattedPhone = formatPhoneNumber(phoneNumber);

    // Show a custom confirmation dialog instead of native Alert,
    // to avoid Android "not attached to an Activity" issues.
    setConfirmText(
      `You will pay TZS ${bundleData.price.toLocaleString()} for ${bundleData.name} using ${provider}.

A payment prompt will be sent to ${formattedPhone}.`,
    );
    setConfirmPhone(formattedPhone);
    setConfirmVisible(true);
  };

  const initiatePayment = async (formattedPhone: string) => {
    setLoading(true);

    // Backend expects a valid payment_method; we use the provider value which is already
    // the backend enum (e.g. "vodacom_mpesa", "tigo_pesa", "airtel_money").
    const payment_method = provider;

    const handleAuthError = async (message?: string) => {
      const msg = message?.toLowerCase() || '';
      if (msg.includes('invalid token') || msg.includes('token has expired') || msg.includes('unauthorized')) {
        // Clear auth data and force app back to Auth flow so a new token is loaded on next login
        await AuthService.logout();
        Alert.alert('Session expired', 'Please log in again to continue.');
        return true;
      }
      return false;
    };

    try {
      const result = await PaymentService.initiatePayment({
        bundle_id: bundleId,
        phone_number: formattedPhone,
        provider: provider,
        payment_method,
      });

      if (result.success && result.payment) {
        console.log('PaymentScreen.initiatePayment result:', JSON.stringify(result, null, 2));
        const checkoutRedirect = result.redirect_url;

        if (checkoutRedirect) {
          // Navigate directly to in-app Pesapal checkout WebView (avoid Alert issues)
          navigation.navigate('PesapalCheckout' as never, {
            paymentId: result.payment!.id.toString(),
            bundleId,
            bundleName: bundleData.name,
            redirectUrl: checkoutRedirect,
          } as never);
        } else {
          // Fallback: go directly to status screen
          navigation.navigate('PaymentStatus' as never, {
            paymentId: result.payment!.id.toString(),
            bundleId,
            bundleName: bundleData.name,
          } as never);
        }
      } else {
        if (!(await handleAuthError(result.error))) {
          Alert.alert('Payment Failed', result.error || 'Could not initiate payment. Please try again.');
        }
      }
    } catch (error: any) {
      if (!(await handleAuthError(error.message))) {
        Alert.alert('Error', error.message || 'An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Bundle Summary */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bundle</Text>
            <Text style={styles.summaryValue}>{bundleData.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Data</Text>
            <Text style={styles.summaryValue}>{bundleData.data_limit_gb} GB</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duration</Text>
            <Text style={styles.summaryValue}>{bundleData.duration_days} days</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>TZS {bundleData.price.toLocaleString()}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Payment Method */}
      <Card style={styles.paymentCard}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          
          <RadioButton.Group
            onValueChange={value => setProvider(value)}
            value={provider}>
            {providers.map(prov => (
              <TouchableOpacity
                key={prov.value}
                style={styles.providerOption}
                onPress={() => setProvider(prov.value)}>
                <RadioButton.Android value={prov.value} color={theme.colors.primary} />
                <Text style={styles.providerLabel}>{prov.label}</Text>
              </TouchableOpacity>
            ))}
          </RadioButton.Group>

          <TextInput
            label="Phone Number"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            mode="outlined"
            style={styles.input}
            keyboardType="phone-pad"
            placeholder="e.g., +255712345678 or 0712345678"
            left={<TextInput.Icon icon="phone" />}
            theme={{colors: {primary: theme.colors.primary}}}
          />

          <Text style={styles.hint}>
            You will receive a payment prompt on your phone. Enter your PIN to complete the payment.
          </Text>
        </Card.Content>
      </Card>

      {/* Pay Button */}
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={handlePayment}
          style={styles.payButton}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          loading={loading}
          disabled={loading}>
          {loading ? 'Processing...' : `Pay TZS ${bundleData.price.toLocaleString()}`}
        </Button>
      </View>
    </ScrollView>

      {/* Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={confirmVisible}
          onDismiss={() => setConfirmVisible(false)}>
          <Dialog.Title>Confirm Payment</Dialog.Title>
          <Dialog.Content>
            <Text>{confirmText}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmVisible(false)}>Cancel</Button>
            <Button
              onPress={() => {
                const phone = confirmPhone;
                setConfirmVisible(false);
                if (phone) {
                  initiatePayment(phone);
                }
              }}>
              Confirm
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  summaryCard: {
    margin: theme.spacing.md,
    elevation: 3,
  },
  paymentCard: {
    margin: theme.spacing.md,
    marginTop: 0,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
  },
  summaryLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    opacity: 0.7,
  },
  summaryValue: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.text,
  },
  totalRow: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  totalLabel: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.primary,
  },
  providerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  providerLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  input: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  hint: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    opacity: 0.6,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  buttonContainer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  payButton: {
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

export default PaymentScreen;
