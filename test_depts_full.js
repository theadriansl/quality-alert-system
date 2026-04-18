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
        path: '/departments?flat=true',
        headers: { 'Authorization': 'Bearer ' + loginRes.token }
      }, (res2) => {
        let d = '';
        res2.on('data', c => d += c);
        res2.on('end', () => {
          const result = JSON.parse(d);
          console.log('=== DEPARTMENTS FULL DATA ===');
          if (result.departments) {
            result.departments.forEach(dept => {
              console.log(`${dept.name}:`);
              console.log(`  - id: ${dept.id}`);
              console.log(`  - managerId: ${dept.managerId}`);
              console.log(`  - managerName: ${dept.managerName || 'N/A'}`);
              console.log(`  - usersCount: ${dept.usersCount}`);
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
