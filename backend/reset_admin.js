const bcrypt = require('bcryptjs');
const { query } = require('./config/database');

async function resetAdmin() {
  const hash = bcrypt.hashSync('admin123', 10);
  const result = await query(
    'UPDATE users SET password = $1 WHERE email = $2 RETURNING email',
    [hash, 'admin@8dsystem.com']
  );
  console.log('Updated:', result.rows);
  process.exit(0);
}

resetAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});
