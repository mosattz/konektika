const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'konektika_user',
  password: process.env.DB_PASSWORD || 'konektika_pass_2024',
  database: process.env.DB_NAME || 'konektika',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

async function connectDB() {
  try {
    if (!pool) {
      pool = mysql.createPool(dbConfig);
      
      // Test the connection
      const connection = await pool.getConnection();
      console.log('✅ Connected to MySQL database');
      connection.release();
    }
    return pool;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    throw error;
  }
}

async function getConnection() {
  if (!pool) {
    await connectDB();
  }
  return pool;
}

async function query(sql, params = []) {
  try {
    const connection = await getConnection();
    const [results] = await connection.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
}

async function closeConnection() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection closed');
  }
}

module.exports = {
  connectDB,
  getConnection,
  query,
  closeConnection,
  pool: () => pool
};