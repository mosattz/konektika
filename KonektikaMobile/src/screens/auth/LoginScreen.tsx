import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {Button, TextInput, Card} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {theme} from '../../config/theme';
import {AuthService} from '../../services/AuthService';

const LoginScreen = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await AuthService.login({ email: email.trim(), password });
      
      if (result.success) {
        Alert.alert('Success', result.message || 'Login successful!');
        // App.tsx listens to auth changes and will switch to Main navigator
      } else {
        Alert.alert('Login Failed', result.error || 'Invalid email or password');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert('Forgot Password', 'Password reset functionality coming soon!');
  };

  const navigateToRegister = () => {
    navigation.navigate('Register' as never);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled">
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your Konektika account</Text>
        </View>

        {/* Login Form */}
        <Card style={styles.formCard}>
          <Card.Content style={styles.cardContent}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Enter your email"
              left={<TextInput.Icon icon="email" />}
              theme={{colors: {primary: theme.colors.primary}}}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry={!showPassword}
              placeholder="Enter your password"
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              theme={{colors: {primary: theme.colors.primary}}}
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              style={styles.loginButton}
              loading={loading}
              disabled={loading}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>

            <Button
              mode="text"
              onPress={handleForgotPassword}
              style={styles.forgotButton}
              labelStyle={styles.forgotText}>
              Forgot Password?
            </Button>
          </Card.Content>
        </Card>

        {/* Register Link */}
        <View style={styles.registerSection}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <Button
            mode="text"
            onPress={navigateToRegister}
            contentStyle={styles.registerButtonContent}
            labelStyle={styles.registerButtonText}>
            Sign Up
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: theme.spacing.lg,
    justifyContent: 'center',
  },
  header: {
    marginBottom: theme.spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: theme.typography.sizes.xxxl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
    textAlign: 'center',
    opacity: 0.7,
  },
  formCard: {
    marginBottom: theme.spacing.xl,
    elevation: 4,
  },
  cardContent: {
    padding: theme.spacing.lg,
  },
  input: {
    marginBottom: theme.spacing.md,
  },
  loginButton: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  buttonContent: {
    paddingVertical: theme.spacing.sm,
  },
  buttonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.fontWeights.medium,
  },
  forgotButton: {
    alignSelf: 'center',
  },
  forgotText: {
    color: theme.colors.primary,
    fontSize: theme.typography.sizes.sm,
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  registerText: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.text,
  },
  registerButtonContent: {
    paddingVertical: 0,
    paddingHorizontal: theme.spacing.xs,
  },
  registerButtonText: {
    fontSize: theme.typography.sizes.md,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.primary,
  },
});

export default LoginScreen;