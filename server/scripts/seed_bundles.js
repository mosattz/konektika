const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

const bundles = [
  {
    name: 'Daily Bundle',
    description: 'Perfect for short-term usage. 5GB data valid for 24 hours with unlimited speed.',
    data_limit: 5120, // 5GB in MB
    duration_hours: 24,
    price: 1000,
    max_clients: 50
  },
  {
    name: 'Weekly Bundle',
    description: 'Great value for a week. 20GB data valid for 7 days with high-speed connection.',
    data_limit: 20480, // 20GB in MB
    duration_hours: 168, // 7 days
    price: 3000,
    max_clients: 50
  },
  {
    name: 'Monthly Bundle',
    description: 'Best for regular users. 100GB data valid for 30 days with unlimited speed.',
    data_limit: 102400, // 100GB in MB
    duration_hours: 720, // 30 days
    price: 17000,
    max_clients: 50
  },
  {
    name: 'Premium 3-Month Bundle',
    description: 'Ultimate value for power users. 500GB data valid for 90 days with priority speed and support.',
    data_limit: 512000, // 500GB in MB
    duration_hours: 2160, // 90 days
    price: 45000,
    max_clients: 30
  }
];

async function seedBundles() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'konektika'
    });

    console.log('Connected to database');

    // Create default owner user if not exists
    const ownerEmail = 'owner@konektika.com';
    const ownerPhone = '+255000000001';
    const ownerPassword = await bcrypt.hash('admin123', 10);

    const [existingOwner] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [ownerEmail]
    );

    let ownerId;
    
    if (existingOwner.length > 0) {
      ownerId = existingOwner[0].id;
      console.log(`Owner user already exists with ID: ${ownerId}`);
    } else {
    const [ownerResult] = await connection.execute(
        `INSERT INTO users (email, phone, password, full_name, user_type, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [ownerEmail, ownerPhone, ownerPassword, 'Konektika Admin', 'owner', 'active']
      );
      ownerId = ownerResult.insertId;
      console.log(`Created owner user with ID: ${ownerId}`);
    }

    // Delete existing bundles from this owner
    await connection.execute('DELETE FROM bundles WHERE owner_id = ?', [ownerId]);
    console.log('Cleared existing bundles');

    // Insert new bundles
    for (const bundle of bundles) {
      const [result] = await connection.execute(
        `INSERT INTO bundles (
          owner_id, name, description, data_limit, 
          price, duration_hours, max_clients, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ownerId,
          bundle.name,
          bundle.description,
          bundle.data_limit,
          bundle.price,
          bundle.duration_hours,
          bundle.max_clients,
          'active'
        ]
      );
      
      console.log(`✓ Created: ${bundle.name} (ID: ${result.insertId})`);
    }

    // Display created bundles
    console.log('\n📦 Seeded Bundles:');
    console.log('─'.repeat(80));
    
    const [createdBundles] = await connection.execute(
      `SELECT id, name, data_limit, duration_hours, price 
       FROM bundles WHERE owner_id = ? ORDER BY price ASC`,
      [ownerId]
    );

    createdBundles.forEach(b => {
      const dataGB = Math.round(b.data_limit / 1024);
      const days = Math.round(b.duration_hours / 24);
      console.log(`${b.id}. ${b.name.padEnd(25)} | ${String(dataGB).padStart(3)}GB | ${String(days).padStart(2)} days | TZS ${String(b.price).padStart(6)}`);
    });
    console.log('─'.repeat(80));

    console.log('\n✅ Bundle seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding bundles:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the seeder
if (require.main === module) {
  seedBundles()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedBundles;
