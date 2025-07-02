const { Pool } = require('pg');
require('dotenv').config();


const pool = new Pool({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: 5432,
    ssl: true
});

module.exports = pool;

// setup
// CREATE TABLE files (
//     id SERIAL PRIMARY KEY,
//     public_key VARCHAR(64) UNIQUE NOT NULL,
//     private_key VARCHAR(64) NOT NULL,
//     filename TEXT NOT NULL,
//     original_name TEXT NOT NULL,
//     mime_type TEXT NOT NULL,
//     created_at TIMESTAMP DEFAULT NOW()
// );