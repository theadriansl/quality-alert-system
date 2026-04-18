const http = require('http');

// Login first
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
      console.log('Login failed:', loginRes);
      return;
    }

    // Now get users
    const usersReq = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/users/list',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${loginRes.token}` }
    }, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        const result = JSON.parse(data2);
        console.log('=== USERS RESPONSE ===');

        if (result.users && result.users.length > 0) {
          console.log('\n=== FIRST USER KEYS ===');
          const first = result.users[0];
          console.log('Keys:', Object.keys(first));
          console.log('\nChecking new fields:');
          console.log('- departmentId:', first.departmentId);
          console.log('- departmentName:', first.departmentName);
          console.log('- assignedRoles:', first.assignedRoles);
          console.log('- userType:', first.userType);

          console.log('\n=== ALL USERS SUMMARY ===');
          result.users.forEach(u => {
            console.log(`${u.firstName} ${u.lastName}: dept=${u.departmentName || 'N/A'}, roles=${JSON.stringify(u.assignedRoles) || 'none'}`);
          });
        }
      });
    });
    usersReq.end();
  });
});

loginReq.write(loginData);
loginReq.end();
