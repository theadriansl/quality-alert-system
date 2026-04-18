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
    if (!loginRes.token) {
      console.log('Login failed');
      return;
    }

    // Test departments
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
        console.log('=== DEPARTMENTS ===');
        console.log('Count:', result.departments?.length || 0);
        if (result.departments && result.departments.length > 0) {
          result.departments.forEach(dept => {
            console.log(`  - ${dept.id}: ${dept.name}`);
          });
        }
      });
    });

    // Test roles
    http.get({
      hostname: 'localhost',
      port: 5000,
      path: '/roles',
      headers: { 'Authorization': 'Bearer ' + loginRes.token }
    }, (res3) => {
      let d = '';
      res3.on('data', c => d += c);
      res3.on('end', () => {
        const result = JSON.parse(d);
        console.log('=== ROLES ===');
        console.log('Count:', result.roles?.length || 0);
        if (result.roles && result.roles.length > 0) {
          result.roles.forEach(role => {
            console.log(`  - ${role.id}: ${role.name}`);
          });
        }
      });
    });
  });
});

loginReq.write(loginData);
loginReq.end();
