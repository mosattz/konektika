// API Configuration
export const API_CONFIG = {
  // Base URL for your Konektika server
  // In development, use the host machine's LAN IP so both emulator and physical devices can reach it.
  // Updated automatically to match your current WiFi IPv4 (see `ipconfig`).
  BASE_URL: 'https://konektika.online/api', // Production URL
  
  TIMEOUT: 30000, // 30 seconds
  
  // API Endpoints
  ENDPOINTS: {
    // Authentication
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/register',
      PROFILE: '/auth/profile',
      LOGOUT: '/auth/logout',
      REFRESH: '/auth/refresh',
    },
    
    // Bundles
    BUNDLES: {
      LIST: '/bundles',
      DETAIL: (id: string) => `/bundles/${id}`,
      SEARCH: '/bundles/search',
    },
    
    // Payments
    PAYMENTS: {
      PROVIDERS: '/payments/providers',
      INITIATE: '/payments/initiate',
      STATUS: (id: string) => `/payments/status/${id}`,
      HISTORY: '/payments/history',
      QUERY: (id: string) => `/payments/query/${id}`,
    },
    
    // VPN
    VPN: {
      CONFIGS: '/vpn/configs',
      GENERATE: '/vpn/generate-config',
      STATUS: '/vpn/status',
      INITIALIZE: '/vpn/initialize',
    },
    
    // User
    USER: {
      SUBSCRIPTIONS: '/users/subscriptions',
      PROFILE: '/users/profile',
      UPDATE: '/users/profile',
    },
    
    // Analytics
    ANALYTICS: {
      USAGE: '/analytics/usage',
      CONNECTIONS: '/analytics/connections',
    },
  },
  
  // HTTP Status Codes
  STATUS_CODES: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503,
  },
  
  // Request Headers
  HEADERS: {
    CONTENT_TYPE: 'application/json',
    ACCEPT: 'application/json',
    USER_AGENT: 'KonektikaMobile/1.0',
  },
};

// Helper function to get full URL
export const getFullUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to get authorization header
export const getAuthHeader = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

// Common HTTP methods
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;