const http = require('http');

// Test endpoint /users/list via HTTP (simulating frontend request)
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/users/list',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

console.log('📡 Testing endpoint: http://localhost:5000/users/list\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);

      console.log(`✅ Status Code: ${res.statusCode}`);
      console.log(`✅ Success: ${response.success}`);
      console.log(`✅ Total users returned: ${response.users?.length || 0}\n`);

      if (response.users) {
        console.log('=== USERS LIST ===');
        response.users.forEach((user, idx) => {
          console.log(`${idx + 1}. ${user.firstName} ${user.lastName} (${user.email})`);
          console.log(`   Position: ${user.position}`);
          console.log(`   Department: ${user.department}`);
          console.log('');
        });

        // Check for admin user
        console.log('\n=== CHECKING FOR admin@8dsystem.com ===');
        const adminUser = response.users.find(u => u.email === 'admin@8dsystem.com');
        if (adminUser) {
          console.log('✅ admin@8dsystem.com IS IN THE RESPONSE');
          console.log(JSON.stringify(adminUser, null, 2));
        } else {
          console.log('❌ admin@8dsystem.com NOT FOUND IN RESPONSE');
        }
      }
    } catch (error) {
      console.error('Error parsing response:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Error making request:', error.message);
  console.log('\n⚠️  Make sure the backend server is running:');
  console.log('   cd C:\\Users\\The Eidrian\\quality-alert-system\\backend');
  console.log('   node server.js');
});

req.end();
