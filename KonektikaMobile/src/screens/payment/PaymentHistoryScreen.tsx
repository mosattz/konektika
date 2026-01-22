import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {ActivityIndicator, Card, List} from 'react-native-paper';
import {theme} from '../../config/theme';
import {PaymentService, Payment} from '../../services/PaymentService';

type HistoryPayment = Payment & {
  bundle_name?: string;
};

const PaymentHistoryScreen = () => {
  const [payments, setPayments] = useState<HistoryPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await PaymentService.getPaymentHistory();
        if (result.success && result.payments) {
          setPayments(result.payments as HistoryPayment[]);
        } else {
          setError(result.error || 'Failed to load payment history');
        }
      } catch (e: any) {
        setError(e?.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading payment history...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (payments.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.emptyTitle}>No payments found</Text>
        <Text style={styles.emptySubtitle}>
          Your payment history will appear here after you complete a transaction.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {payments.map(payment => {
        const statusColor =
          payment.status === 'completed'
            ? theme.colors.success
            : payment.status === 'pending'
            ? theme.colors.warning
            : theme.colors.error;

        const bundleName = (payment as any).bundle_name || 'VPN Bundle';

        return (
          <Card key={payment.id} style={styles.card}>
            <Card.Content>
              <List.Item
                title={bundleName}
                description={`Amount: TZS ${Number(payment.amount).toLocaleString()}\nStatus: ${payment.status.toUpperCase()}\nDate: ${new Date(payment.created_at).toLocaleString()}`}
                left={props => <List.Icon {...props} icon="history" />}
                right={props => (
                  <View style={styles.statusPill}>
                    <Text style={[styles.statusText, {color: statusColor}]}>
                      {payment.status.toUpperCase()}
                    </Text>
                  </View>
                )}
              />
            </Card.Content>
          </Card>
        );
      })}
    </ScrollView>
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
    padding: theme.spacing.lg,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
  },
  errorText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.error,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.text,
    opacity: 0.7,
    textAlign: 'center',
  },
  card: {
    marginBottom: theme.spacing.md,
    elevation: 2,
  },
  statusPill: {
    alignSelf: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.md,
    backgroundColor: '#F5F5F5',
  },
  statusText: {
    fontSize: theme.typography.sizes.xs,
    fontWeight: theme.typography.fontWeights.bold,
  },
});

export default PaymentHistoryScreen;
