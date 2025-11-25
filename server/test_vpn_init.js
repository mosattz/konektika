const axios = require('axios');

async function testVPNInit() {
  try {
    console.log('Testing VPN initialization...');
    
    // First register a test user
    const uniqueId = Date.now();
    const registerResponse = await axios.post('http://localhost:3000/api/auth/register', {
      username: `testadmin${uniqueId}`,
      email: `test${uniqueId}@admin.com`,
      password: 'password123',
      full_name: 'Test Admin',
      phone: `+25571234${uniqueId.toString().slice(-4)}`,
      user_type: 'owner'
    });
    
    console.log('User registered:', registerResponse.data.message);
    
    // Use token from registration response
    const token = registerResponse.data.data.token;
    console.log('Registration successful, token received');
    
    // Test VPN initialization
    const vpnResponse = await axios.post('http://localhost:3000/api/vpn/initialize', {}, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('VPN initialization result:', vpnResponse.data);
    
  } catch (error) {
    if (error.response) {
      console.error('HTTP Error Status:', error.response.status);
      console.error('Error Details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Network Error:', error.message);
    }
  }
}

testVPNInit();