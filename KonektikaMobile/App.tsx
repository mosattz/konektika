import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import ApiService from './src/services/ApiService';
import {createStackNavigator} from '@react-navigation/stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {StatusBar, Alert, LogBox} from 'react-native';
import {Provider as PaperProvider} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screen imports
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import HomeScreen from './src/screens/main/HomeScreen';
import BundlesScreen from './src/screens/main/BundlesScreen';
import ConnectionScreen from './src/screens/main/ConnectionScreen';
import ProfileScreen from './src/screens/main/ProfileScreen';
import BundleDetailScreen from './src/screens/bundles/BundleDetailScreen';
import PaymentScreen from './src/screens/payment/PaymentScreen';
import PaymentStatusScreen from './src/screens/payment/PaymentStatusScreen';
import PesapalCheckoutScreen from './src/screens/payment/PesapalCheckoutScreen';

// Services
import {AuthService} from './src/services/AuthService';
import {theme} from './src/config/theme';

// Types
export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
  BundleDetail: {bundleId: string; bundleName: string; bundleData?: import('./src/services/BundleService').Bundle};
  Payment: {bundleId: string; bundleData: any};
  PesapalCheckout: {paymentId: string; bundleName: string; redirectUrl: string};
  PaymentStatus: {paymentId: string; bundleName: string};
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Bundles: undefined;
  Connection: undefined;
  Profile: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Auth Stack Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
      }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

// Main Tab Navigator
function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#FFFFFF',
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({color, size}) => {
          let iconName: string;

          switch (route.name) {
            case 'Home':
              iconName = 'view-dashboard';
              break;
            case 'Bundles':
              iconName = 'package-variant';
              break;
            case 'Connection':
              iconName = 'vpn';
              break;
            case 'Profile':
              iconName = 'account-circle';
              break;
            default:
              iconName = 'circle';
          }

          return (
            <MaterialCommunityIcons name={iconName} color={color} size={size} />
          );
        },
      })}>
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Dashboard',
          headerTitle: 'Konektika VPN',
        }}
      />
      <Tab.Screen 
        name="Bundles" 
        component={BundlesScreen}
        options={{
          title: 'VPN Bundles',
        }}
      />
      <Tab.Screen 
        name="Connection" 
        component={ConnectionScreen}
        options={{
          title: 'Connection',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

// Silence noisy library deprecation warnings that we cannot control directly
if (__DEV__) {
  LogBox.ignoreLogs([
    'InteractionManager has been deprecated',
  ]);

  // In React Native DevTools / remote debugging, some warnings still go through
  // console.warn even when LogBox filters them. Hard-filter the specific
  // InteractionManager deprecation message so it does not spam the console.
  const originalWarn = console.warn;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.warn = (...args: any[]) => {
    const message = typeof args[0] === 'string' ? args[0] : '';
    if (message.includes('InteractionManager has been deprecated')) {
      return;
    }
    return originalWarn(...args);
  };
}

export default function App(): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();

    // Listen for auth changes (login/logout) from AuthService
    const unsubscribe = AuthService.subscribeAuth(isAuth => {
      setIsAuthenticated(isAuth);
      setIsLoading(false);
    });

    // Global handler for 401s from ApiService (invalid/expired token)
    ApiService.setUnauthorizedHandler(() => {
      setIsAuthenticated(false);
    });

    return () => {
      unsubscribe();
      ApiService.setUnauthorizedHandler(() => {});
    };
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user_data');
      
      if (token && userData) {
        // Validate token with server with timeout
        const timeoutPromise = new Promise<boolean>((resolve) => 
          setTimeout(() => resolve(false), 5000)
        );
        const validatePromise = AuthService.validateToken(token);
        const isValid = await Promise.race([validatePromise, timeoutPromise]);
        setIsAuthenticated(isValid);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <PaperProvider theme={theme}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={theme.colors.primary}
      />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}>
          {isAuthenticated ? (
            <>
              <Stack.Screen name="Main" component={MainNavigator} />
              <Stack.Screen 
                name="BundleDetail" 
                component={BundleDetailScreen}
                options={{
                  headerShown: true,
                  headerStyle: {backgroundColor: theme.colors.primary},
                  headerTintColor: '#FFFFFF',
                  title: 'Bundle Details',
                }}
              />
              <Stack.Screen 
                name="Payment" 
                component={PaymentScreen}
                options={{
                  headerShown: true,
                  headerStyle: {backgroundColor: theme.colors.primary},
                  headerTintColor: '#FFFFFF',
                  title: 'Payment',
                }}
              />
              <Stack.Screen 
                name="PesapalCheckout" 
                component={PesapalCheckoutScreen}
                options={{
                  headerShown: true,
                  headerStyle: {backgroundColor: theme.colors.primary},
                  headerTintColor: '#FFFFFF',
                  title: 'Complete Payment',
                }}
              />
              <Stack.Screen 
                name="PaymentStatus" 
                component={PaymentStatusScreen}
                options={{
                  headerShown: true,
                  headerStyle: {backgroundColor: theme.colors.primary},
                  headerTintColor: '#FFFFFF',
                  title: 'Payment Status',
                }}
              />
            </>
          ) : (
            <Stack.Screen name="Auth" component={AuthNavigator} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
