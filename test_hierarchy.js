const http = require('http');

const loginData = JSON.stringify({ email: 'admin@8dsystem.com', password: 'admin123' });

const loginReq = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const loginRes = JSON.parse(data);
    if (loginRes.token) {
      http.get({
        hostname: 'localhost',
        port: 5000,
        path: '/users/list',
        headers: { 'Authorization': 'Bearer ' + loginRes.token }
      }, (res2) => {
        let d = '';
        res2.on('data', c => d += c);
        res2.on('end', () => {
          const result = JSON.parse(d);
          console.log('=== USERS HIERARCHY & DEPARTMENTS ===');
          if (result.users) {
            result.users.forEach(u => {
              console.log(`${u.firstName} ${u.lastName}:`);
              console.log(`  - hierarchyLevel: ${u.hierarchyLevel}`);
              console.log(`  - managerId: ${u.managerId}`);
              console.log(`  - departmentId: ${u.departmentId}`);
              console.log(`  - departmentName: ${u.departmentName || 'N/A'}`);
              console.log('');
            });
          }
        });
      });
    }
  });
});

loginReq.write(loginData);
loginReq.end();
