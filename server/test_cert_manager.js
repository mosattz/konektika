const certificateManager = require('./utils/certificateManager');

async function testCertManager() {
  try {
    console.log('Testing certificate manager directly...');
    
    // Check current status
    console.log('Checking certificate status...');
    const status = await certificateManager.getCertificateStatus();
    console.log('Current status:', status);
    
    // Test PKI initialization
    console.log('\nInitializing PKI...');
    const initResult = await certificateManager.initializePKI();
    console.log('PKI Init result:', initResult);
    
    // Check status after init
    const statusAfter = await certificateManager.getCertificateStatus();
    console.log('Status after init:', statusAfter);
    
  } catch (error) {
    console.error('Certificate manager error:', error.message);
    console.error('Stack:', error.stack);
  }
}

testCertManager();