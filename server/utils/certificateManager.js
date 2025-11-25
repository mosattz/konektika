const { exec, spawn } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const logger = require('./logger');

class CertificateManager {
  constructor() {
    this.openvpnDir = process.env.OPENVPN_DIR || path.join(__dirname, '../openvpn');
    this.easyRsaDir = path.join(this.openvpnDir, 'EasyRSA-3.1.7');
    this.pkiDir = path.join(this.easyRsaDir, 'pki');
    this.keysDir = path.join(this.openvpnDir, 'keys');
    this.easyRsaExe = path.join(this.easyRsaDir, 'EasyRSA-Start.bat');
    
    this.caInitialized = false;
  }

  // Initialize PKI and create CA using Easy-RSA
  async initializePKI() {
    try {
      // Ensure directories exist
      await fs.ensureDir(this.easyRsaDir);
      await fs.ensureDir(this.keysDir);

      // Check if PKI already exists
      if (await fs.pathExists(this.pkiDir)) {
        logger.info('PKI already initialized');
        this.caInitialized = true;
        return { success: true, message: 'PKI already exists' };
      }

      // Initialize PKI
      const initResult = await this.runEasyRSACommand('init-pki');
      if (!initResult.success) {
        throw new Error(`PKI initialization failed: ${initResult.error}`);
      }

      // Build CA
      const caResult = await this.runEasyRSACommand('build-ca nopass', {
        input: 'Konektika-VPN-CA\n' // Common name for CA (no spaces)
      });
      if (!caResult.success) {
        throw new Error(`CA build failed: ${caResult.error}`);
      }

      // Generate DH parameters
      const dhResult = await this.runEasyRSACommand('gen-dh');
      if (!dhResult.success) {
        throw new Error(`DH generation failed: ${dhResult.error}`);
      }

      // Generate TLS auth key
      await this.generateTLSAuthKey();

      // Copy certificates to keys directory
      await this.copyCAFiles();

      this.caInitialized = true;
      logger.info('PKI and CA initialized successfully using Easy-RSA');
      
      return { success: true, message: 'PKI and CA created successfully' };
    } catch (error) {
      logger.error('PKI initialization error:', error);
      throw error;
    }
  }

  // Generate server certificate and key using Easy-RSA
  async generateServerCertificate() {
    try {
      if (!this.caInitialized) {
        await this.initializePKI();
      }

      // Check if server certificate already exists
      const serverCrtPath = path.join(this.pkiDir, 'issued', 'server.crt');
      if (await fs.pathExists(serverCrtPath)) {
        logger.info('Server certificate already exists');
        return { success: true, message: 'Server certificate already exists' };
      }

      // Generate server request
      const reqResult = await this.runEasyRSACommand('gen-req server nopass', {
        input: 'konektika-server\n'
      });
      if (!reqResult.success) {
        throw new Error(`Server request generation failed: ${reqResult.error}`);
      }

      // Sign server certificate
      const signResult = await this.runEasyRSACommand('sign-req server server', {
        input: 'yes\n'
      });
      if (!signResult.success) {
        throw new Error(`Server certificate signing failed: ${signResult.error}`);
      }

      // Copy server files
      await this.copyServerFiles();

      logger.info('Server certificate generated successfully using Easy-RSA');
      return { success: true, message: 'Server certificate created' };
    } catch (error) {
      logger.error('Server certificate generation error:', error);
      throw error;
    }
  }

  // Generate client certificate and key using Easy-RSA
  async generateClientCertificate(clientName) {
    try {
      if (!this.caInitialized) {
        await this.initializePKI();
      }

      // Sanitize client name
      const sanitizedName = clientName.replace(/[^a-zA-Z0-9-]/g, '-');

      // Generate client request
      const reqResult = await this.runEasyRSACommand(`gen-req ${sanitizedName} nopass`, {
        input: `${sanitizedName}\n`
      });
      if (!reqResult.success) {
        throw new Error(`Client request generation failed: ${reqResult.error}`);
      }

      // Sign client certificate
      const signResult = await this.runEasyRSACommand(`sign-req client ${sanitizedName}`, {
        input: 'yes\n'
      });
      if (!signResult.success) {
        throw new Error(`Client certificate signing failed: ${signResult.error}`);
      }

      // Read certificate and key files
      const certPath = path.join(this.pkiDir, 'issued', `${sanitizedName}.crt`);
      const keyPath = path.join(this.pkiDir, 'private', `${sanitizedName}.key`);

      const certificate = await fs.readFile(certPath, 'utf8');
      const privateKey = await fs.readFile(keyPath, 'utf8');

      logger.info(`Client certificate generated for: ${sanitizedName}`);
      
      return {
        success: true,
        clientName: sanitizedName,
        certificate,
        privateKey
      };
    } catch (error) {
      logger.error('Client certificate generation error:', error);
      throw error;
    }
  }

  // Revoke client certificate using Easy-RSA
  async revokeClientCertificate(clientName) {
    try {
      const sanitizedName = clientName.replace(/[^a-zA-Z0-9-]/g, '-');
      
      const revokeResult = await this.runEasyRSACommand(`revoke ${sanitizedName}`, {
        input: 'yes\n'
      });
      
      if (!revokeResult.success) {
        throw new Error(`Certificate revocation failed: ${revokeResult.error}`);
      }

      // Generate CRL
      const crlResult = await this.runEasyRSACommand('gen-crl');
      if (!crlResult.success) {
        logger.warn('CRL generation failed, but certificate was revoked');
      }

      logger.info(`Client certificate revoked: ${sanitizedName}`);
      return { success: true, message: 'Certificate revoked successfully' };
    } catch (error) {
      logger.error('Certificate revocation error:', error);
      throw error;
    }
  }

  // Get CA certificate
  async getCACertificate() {
    try {
      const caPath = path.join(this.keysDir, 'ca.crt');
      if (await fs.pathExists(caPath)) {
        return await fs.readFile(caPath, 'utf8');
      }
      
      // Try PKI directory
      const pkiCaPath = path.join(this.pkiDir, 'ca.crt');
      if (await fs.pathExists(pkiCaPath)) {
        return await fs.readFile(pkiCaPath, 'utf8');
      }
      
      throw new Error('CA certificate not found');
    } catch (error) {
      logger.error('Error reading CA certificate:', error);
      throw error;
    }
  }

  // Get TLS auth key
  async getTLSAuthKey() {
    try {
      const taPath = path.join(this.keysDir, 'ta.key');
      if (await fs.pathExists(taPath)) {
        return await fs.readFile(taPath, 'utf8');
      }
      throw new Error('TLS auth key not found');
    } catch (error) {
      logger.error('Error reading TLS auth key:', error);
      throw error;
    }
  }

  // Generate TLS auth key using OpenVPN
  async generateTLSAuthKey() {
    return new Promise((resolve, reject) => {
      const taPath = path.join(this.keysDir, 'ta.key');
      const cmd = `"C:\\Program Files\\OpenVPN\\bin\\openvpn.exe" --genkey secret "${taPath}"`;
      
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          logger.error('TLS auth key generation failed:', error);
          reject(error);
        } else {
          logger.info('TLS auth key generated successfully');
          resolve({ success: true });
        }
      });
    });
  }

  // Copy CA files to keys directory
  async copyCAFiles() {
    try {
      const files = [
        { src: path.join(this.pkiDir, 'ca.crt'), dest: path.join(this.keysDir, 'ca.crt') },
        { src: path.join(this.pkiDir, 'dh.pem'), dest: path.join(this.keysDir, 'dh2048.pem') }
      ];

      for (const file of files) {
        if (await fs.pathExists(file.src)) {
          await fs.copy(file.src, file.dest);
          logger.info(`Copied ${path.basename(file.src)} to keys directory`);
        }
      }
    } catch (error) {
      logger.error('Error copying CA files:', error);
      throw error;
    }
  }

  // Copy server files to keys directory
  async copyServerFiles() {
    try {
      const files = [
        { src: path.join(this.pkiDir, 'issued', 'server.crt'), dest: path.join(this.keysDir, 'server.crt') },
        { src: path.join(this.pkiDir, 'private', 'server.key'), dest: path.join(this.keysDir, 'server.key') }
      ];

      for (const file of files) {
        if (await fs.pathExists(file.src)) {
          await fs.copy(file.src, file.dest);
          logger.info(`Copied ${path.basename(file.src)} to keys directory`);
        }
      }
    } catch (error) {
      logger.error('Error copying server files:', error);
      throw error;
    }
  }

  // Run Easy-RSA command with proper Windows input handling
  async runEasyRSACommand(command, options = {}) {
    return new Promise(async (resolve, reject) => {
      const shExe = path.join(this.easyRsaDir, 'bin', 'sh.exe');
      
      // Use short path names to avoid issues with spaces and special characters
      const shortEasyRsaDir = this.easyRsaDir.replace(/\\/g, '/');
      const shortPkiDir = this.pkiDir.replace(/\\/g, '/');
      
      let cmd;
      let tempBatFile = null;
      let tempInputFile = null;
      
      if (options.input) {
        // Create temporary files for input handling
        const timestamp = Date.now();
        tempBatFile = path.join(this.easyRsaDir, `temp_cmd_${timestamp}.bat`);
        tempInputFile = path.join(this.easyRsaDir, `temp_input_${timestamp}.txt`);
        
        // Write input to text file
        const inputs = options.input.split('\n').filter(i => i.trim());
        await fs.writeFile(tempInputFile, inputs.join('\r\n') + '\r\n');
        
        // Create batch file that uses the input file
        let batContent = '@echo off\r\n';
        batContent += `set PATH=${path.join(this.easyRsaDir, 'bin')};${this.easyRsaDir};%PATH%\r\n`;
        batContent += `set EASYRSA=${shortEasyRsaDir}\r\n`;
        batContent += `set EASYRSA_PKI=${shortPkiDir}\r\n`;
        batContent += `cd /d "${this.easyRsaDir}"\r\n`;
        batContent += `"${shExe}" -c "./easyrsa ${command}" < "${tempInputFile}"\r\n`;
        
        await fs.writeFile(tempBatFile, batContent);
        cmd = `"${tempBatFile}"`;
      } else {
        // Simple command without input using direct environment variables
        cmd = `"${shExe}" -c "./easyrsa ${command}"`;
      }
      
      logger.info(`Running Easy-RSA command: ${command}`);
      if (options.input) {
        logger.info(`With input: ${options.input.replace(/\n/g, ' | ')}`);
      }
      
      const child = exec(cmd, { 
        cwd: this.easyRsaDir,
        windowsHide: true,
        timeout: 60000, // 60 second timeout
        env: { 
          ...process.env, 
          EASYRSA: shortEasyRsaDir,
          EASYRSA_PKI: shortPkiDir,
          PATH: `${path.join(this.easyRsaDir, 'bin')};${this.easyRsaDir};${process.env.PATH}`
        }
      }, async (error, stdout, stderr) => {
        // Clean up temporary files
        if (tempBatFile) {
          try {
            await fs.remove(tempBatFile);
          } catch (cleanupError) {
            logger.warn('Failed to clean up temp batch file:', cleanupError);
          }
        }
        if (tempInputFile) {
          try {
            await fs.remove(tempInputFile);
          } catch (cleanupError) {
            logger.warn('Failed to clean up temp input file:', cleanupError);
          }
        }
        
        if (error) {
          logger.error(`Easy-RSA command failed: ${command}`);
          logger.error(`Error: ${error.message}`);
          if (stdout) logger.error(`STDOUT: ${stdout}`);
          if (stderr) logger.error(`STDERR: ${stderr}`);
          resolve({ success: false, error: error.message, stdout, stderr });
        } else {
          logger.info(`Easy-RSA command completed successfully: ${command}`);
          if (stdout) logger.debug(`STDOUT: ${stdout}`);
          if (stderr && !stderr.includes('Warning')) logger.debug(`STDERR: ${stderr}`);
          resolve({ success: true, stdout, stderr });
        }
      });
    });
  }

  // Check if certificates are ready
  async areCertificatesReady() {
    try {
      const requiredFiles = [
        path.join(this.keysDir, 'ca.crt'),
        path.join(this.keysDir, 'server.crt'),
        path.join(this.keysDir, 'server.key'),
        path.join(this.keysDir, 'dh2048.pem'),
        path.join(this.keysDir, 'ta.key')
      ];

      for (const file of requiredFiles) {
        if (!(await fs.pathExists(file))) {
          return false;
        }
      }

      return true;
    } catch (error) {
      logger.error('Error checking certificate readiness:', error);
      return false;
    }
  }

  // Get certificate status
  async getCertificateStatus() {
    try {
      const ready = await this.areCertificatesReady();
      const caExists = await fs.pathExists(path.join(this.pkiDir, 'ca.crt'));
      const serverExists = await fs.pathExists(path.join(this.pkiDir, 'issued', 'server.crt'));
      
      return {
        ready,
        ca_initialized: caExists,
        server_certificate: serverExists,
        pki_directory: await fs.pathExists(this.pkiDir)
      };
    } catch (error) {
      logger.error('Error getting certificate status:', error);
      return {
        ready: false,
        ca_initialized: false,
        server_certificate: false,
        pki_directory: false
      };
    }
  }
}

module.exports = new CertificateManager();