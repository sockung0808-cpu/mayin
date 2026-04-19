const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',        // tên user PostgreSQL
  host: 'localhost',       // địa chỉ server
  database: 'dashboard',   // tên database bạn đã tạo
  password: 'yourpassword',// mật khẩu PostgreSQL
  port: 5432,              // cổng mặc định
});

module.exports = pool;
