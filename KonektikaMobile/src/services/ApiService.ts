import axios, {AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_CONFIG, getFullUrl, getAuthHeader} from '../config/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiError {
  message: string;
  status?: number;
  data?: any;
}

class ApiService {
  private axiosInstance: AxiosInstance;
  private token: string | null = null;
  private unauthorizedHandler: (() => void) | null = null;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': API_CONFIG.HEADERS.CONTENT_TYPE,
        'Accept': API_CONFIG.HEADERS.ACCEPT,
        'User-Agent': API_CONFIG.HEADERS.USER_AGENT,
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor - add auth token to requests
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Get token from storage if not in memory
        if (!this.token) {
          this.token = await AsyncStorage.getItem('auth_token');
        }

        // Add authorization header if token exists
        if (this.token && config.headers) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }

        console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
        console.log('Request data:', JSON.stringify(config.data));
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor - handle errors globally
    this.axiosInstance.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.config.url} - Status: ${response.status}`);
        return response;
      },
      async (error: AxiosError) => {
        console.error('API Error:', error.message);
        console.error('Error response status:', error.response?.status);
        console.error('Error response data:', JSON.stringify(error.response?.data));
        
        // Handle 401 Unauthorized - token expired or invalid
        if (error.response?.status === 401) {
          console.log('Unauthorized - clearing auth data');
          await this.clearAuth();
          if (this.unauthorizedHandler) {
            this.unauthorizedHandler();
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  // Allow consumers (e.g. App) to react globally to 401/unauthorized events
  setUnauthorizedHandler(handler: () => void) {
    this.unauthorizedHandler = handler;
  }

  private handleError(error: AxiosError): ApiError {
    if (error.response) {
      // Server responded with error status
      const data = error.response.data as any;
      return {
        message: data?.message || data?.error || 'Server error occurred',
        status: error.response.status,
        data: data,
      };
    } else if (error.request) {
      // Request made but no response received
      return {
        message: 'Network error. Please check your internet connection.',
        status: 0,
      };
    } else {
      // Something else happened
      return {
        message: error.message || 'An unexpected error occurred',
      };
    }
  }

  // Set authentication token
  async setToken(token: string | null | undefined) {
    if (token) {
      this.token = token;
      await AsyncStorage.setItem('auth_token', token);
    } else {
      // If token is null/undefined, clear it from memory and storage
      this.token = null;
      await AsyncStorage.removeItem('auth_token');
    }
  }

  // Clear authentication data
  async clearAuth() {
    this.token = null;
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_data');
  }

  // GET request
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.get(url, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.message,
        data: apiError.data,
      };
    }
  }

  // POST request
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.post(url, data, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.message,
        data: apiError.data,
      };
    }
  }

  // PUT request
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.put(url, data, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.message,
        data: apiError.data,
      };
    }
  }

  // PATCH request
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.patch(url, data, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.message,
        data: apiError.data,
      };
    }
  }

  // DELETE request
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<T> = await this.axiosInstance.delete(url, config);
      return {
        success: true,
        data: response.data,
      };
    } catch (error) {
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.message,
        data: apiError.data,
      };
    }
  }
}

// Export singleton instance
export default new ApiService();
