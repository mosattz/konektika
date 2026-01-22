import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './ApiService';
import {API_CONFIG} from '../config/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  full_name: string;
  email: string;
  phone: string;
  password: string;
}

export interface User {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  user_type: 'client' | 'owner';
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
  error?: string;
}

type AuthListener = (isAuthenticated: boolean) => void;

export class AuthService {
  private static authListeners: AuthListener[] = [];

  static subscribeAuth(listener: AuthListener): () => void {
    this.authListeners.push(listener);
    return () => {
      this.authListeners = this.authListeners.filter(l => l !== listener);
    };
  }

  private static notifyAuthChange(isAuthenticated: boolean) {
    this.authListeners.forEach(listener => {
      try {
        listener(isAuthenticated);
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }

  /**
   * Login with email and password
   */
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await ApiService.post<any>(
        API_CONFIG.ENDPOINTS.AUTH.LOGIN,
        credentials
      );

      console.log('AuthService.login raw response:', JSON.stringify(response, null, 2));

      // Handle different possible backend response shapes
      const payload = response.data as any;
      const token = payload?.token ?? payload?.accessToken ?? payload?.data?.token;
      const user: User | undefined =
        payload?.user ?? payload?.data?.user ?? payload?.data?.userData ?? payload?.data?.user_profile;

      if (response.success && token && user) {
        // Store token and user data
        await ApiService.setToken(token);
        await AsyncStorage.setItem('user_data', JSON.stringify(user));

        // Notify app that user is now authenticated
        this.notifyAuthChange(true);

        return {
          success: true,
          token,
          user,
          message: payload?.message || 'Login successful',
        };
      }

      // Clear any existing auth data if login response is malformed or unsuccessful
      await ApiService.clearAuth();
      return {
        success: false,
        error: response.error || payload?.message || payload?.error || 'Login failed',
      };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred during login',
      };
    }
  }

  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await ApiService.post<any>(
        API_CONFIG.ENDPOINTS.AUTH.REGISTER,
        {
          full_name: data.full_name,
          email: data.email,
          phone: data.phone,
          password: data.password,
          user_type: 'client', // Default to client type
        }
      );

      console.log('AuthService.register raw response:', JSON.stringify(response, null, 2));

      const payload = response.data as any;
      const token = payload?.token ?? payload?.accessToken ?? payload?.data?.token;
      const user: User | undefined =
        payload?.user ?? payload?.data?.user ?? payload?.data?.userData ?? payload?.data?.user_profile;

      if (response.success && token && user) {
        // Store token and user data
        await ApiService.setToken(token);
        await AsyncStorage.setItem('user_data', JSON.stringify(user));

        // Notify app that user is now authenticated
        this.notifyAuthChange(true);

        return {
          success: true,
          token,
          user,
          message: payload?.message || 'Registration successful',
        };
      }

      // Clear any existing auth data if registration response is malformed or unsuccessful
      await ApiService.clearAuth();
      return {
        success: false,
        error: response.error || payload?.message || payload?.error || 'Registration failed',
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred during registration',
      };
    }
  }

  /**
   * Validate token with server
   */
  static async validateToken(token: string): Promise<boolean> {
    try {
      const response = await ApiService.get(API_CONFIG.ENDPOINTS.AUTH.PROFILE);
      return response.success;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(): Promise<{success: boolean; user?: User; error?: string}> {
    try {
      const response = await ApiService.get<any>(API_CONFIG.ENDPOINTS.AUTH.PROFILE);

      console.log('AuthService.getProfile raw response:', JSON.stringify(response, null, 2));

      const payload = response.data as any;
      const user: User | undefined =
        payload?.user ?? payload?.data?.user ?? payload?.data;

      if (response.success && user) {
        // Update stored user data
        await AsyncStorage.setItem('user_data', JSON.stringify(user));

        return {
          success: true,
          user,
        };
      } else {
        return {
          success: false,
          error: response.error || payload?.message || payload?.error || 'Failed to fetch profile',
        };
      }
    } catch (error: any) {
      console.error('Get profile error:', error);
      return {
        success: false,
        error: error.message || 'An error occurred while fetching profile',
      };
    }
  }

  /**
   * Get stored user data from AsyncStorage
   */
  static async getStoredUser(): Promise<User | null> {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Get stored user error:', error);
      return null;
    }
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    try {
      // Call logout endpoint (optional, doesn't matter if it fails)
      await ApiService.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT);
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear all auth data locally
      await ApiService.clearAuth();
      this.notifyAuthChange(false);
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        return false;
      }
      return await this.validateToken(token);
    } catch (error) {
      console.error('Auth check error:', error);
      return false;
    }
  }
}
