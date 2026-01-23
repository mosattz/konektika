const { query, connectDB } = require('../config/database');
const logger = require('../utils/logger');

async function migrateVpnConfigs() {
  try {
    logger.info('Starting vpn_configs table migration...');
    
    // Connect to database
    await connectDB();
    logger.info('Connected to database');

    // Check if client_ip column exists
    const columns = await query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'vpn_configs' 
        AND COLUMN_NAME = 'client_ip'
    `);

    if (columns.length === 0) {
      logger.info('Adding client_ip column to vpn_configs table...');
      
      // Add client_ip column
      await query(`
        ALTER TABLE vpn_configs 
        ADD COLUMN client_ip VARCHAR(45) AFTER client_cert
      `);
      
      // Add index on client_ip
      await query(`
        ALTER TABLE vpn_configs 
        ADD INDEX idx_client_ip (client_ip)
      `);
      
      logger.info('✅ Added client_ip column and index');
    } else {
      logger.info('✅ client_ip column already exists');
    }

    // Check if ovpn_config column exists
    const ovpnColumns = await query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'vpn_configs' 
        AND COLUMN_NAME = 'ovpn_config'
    `);

    if (ovpnColumns.length === 0) {
      logger.info('Renaming config_content to ovpn_config...');
      
      // Check if config_content exists
      const configContentExists = await query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = 'vpn_configs' 
          AND COLUMN_NAME = 'config_content'
      `);

      if (configContentExists.length > 0) {
        // Rename config_content to ovpn_config
        await query(`
          ALTER TABLE vpn_configs 
          CHANGE COLUMN config_content ovpn_config TEXT NOT NULL
        `);
        logger.info('✅ Renamed config_content to ovpn_config');
      } else {
        // Add ovpn_config column
        await query(`
          ALTER TABLE vpn_configs 
          ADD COLUMN ovpn_config TEXT NOT NULL AFTER config_name
        `);
        logger.info('✅ Added ovpn_config column');
      }
    } else {
      logger.info('✅ ovpn_config column already exists');
    }

    // Fix protocol column type
    logger.info('Checking protocol column type...');
    const protocolColumn = await query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'vpn_configs' 
        AND COLUMN_NAME = 'protocol'
    `);

    if (protocolColumn.length > 0) {
      const columnType = protocolColumn[0].COLUMN_TYPE;
      logger.info(`Current protocol column type: ${columnType}`);
      
      // If it's not VARCHAR(20) or doesn't allow 'wireguard', change it
      if (!columnType.includes('varchar') || columnType === "enum('udp','tcp')") {
        logger.info('Updating protocol column to VARCHAR(20)...');
        await query(`
          ALTER TABLE vpn_configs 
          MODIFY COLUMN protocol VARCHAR(20) DEFAULT 'wireguard'
        `);
        logger.info('✅ Updated protocol column type');
      } else {
        logger.info('✅ Protocol column type is correct');
      }
    }

    logger.info('✅ VPN configs table migration completed successfully!');
    return true;
  } catch (error) {
    logger.error('❌ VPN configs migration failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  migrateVpnConfigs()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = { migrateVpnConfigs };
