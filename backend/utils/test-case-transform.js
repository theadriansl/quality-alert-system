/**
 * Test script for case transformation utilities
 * Run with: node utils/test-case-transform.js
 */

const {
  snakeToCamel,
  camelToSnake,
  transformToCamelCase,
  transformToSnakeCase
} = require('./caseTransform');

console.log('🧪 Testing Case Transformation Utilities\n');

// Test 1: String transformations
console.log('Test 1: String transformations');
console.log('  snake_to_camel:', snakeToCamel('first_name'), '(expected: firstName)');
console.log('  camel_to_snake:', camelToSnake('firstName'), '(expected: first_name)');
console.log('  complex_snake:', snakeToCamel('created_at_timestamp'), '(expected: createdAtTimestamp)');
console.log('  complex_camel:', camelToSnake('createdAtTimestamp'), '(expected: created_at_timestamp)');
console.log('');

// Test 2: Simple object transformation (snake to camel)
console.log('Test 2: Simple object (snake → camel)');
const snakeObj = {
  first_name: 'John',
  last_name: 'Doe',
  is_active: true,
  created_at: '2025-01-01'
};
console.log('  Input:', JSON.stringify(snakeObj));
const camelObj = transformToCamelCase(snakeObj);
console.log('  Output:', JSON.stringify(camelObj));
console.log('');

// Test 3: Simple object transformation (camel to snake)
console.log('Test 3: Simple object (camel → snake)');
const camelInput = {
  firstName: 'Jane',
  lastName: 'Smith',
  isActive: false,
  createdAt: '2025-01-02'
};
console.log('  Input:', JSON.stringify(camelInput));
const snakeOutput = transformToSnakeCase(camelInput);
console.log('  Output:', JSON.stringify(snakeOutput));
console.log('');

// Test 4: Nested objects
console.log('Test 4: Nested objects');
const nestedSnake = {
  user_id: 1,
  user_details: {
    first_name: 'Alice',
    last_name: 'Johnson',
    contact_info: {
      phone_number: '555-1234',
      email_address: 'alice@example.com'
    }
  },
  is_verified: true
};
console.log('  Input:', JSON.stringify(nestedSnake, null, 2));
const nestedCamel = transformToCamelCase(nestedSnake);
console.log('  Output:', JSON.stringify(nestedCamel, null, 2));
console.log('');

// Test 5: Arrays
console.log('Test 5: Arrays of objects');
const arraySnake = [
  { user_id: 1, first_name: 'Bob', is_active: true },
  { user_id: 2, first_name: 'Carol', is_active: false }
];
console.log('  Input:', JSON.stringify(arraySnake));
const arrayCamel = transformToCamelCase(arraySnake);
console.log('  Output:', JSON.stringify(arrayCamel));
console.log('');

// Test 6: Complex object with arrays and nested structures (like database results)
console.log('Test 6: Complex database-like structure');
const dbResult = {
  id: 1,
  client_name: 'Acme Corp',
  client_id: 123,
  is_active: true,
  created_at: '2025-01-01T00:00:00.000Z',
  projects: [
    {
      project_id: 1,
      project_name: 'Project A',
      start_date: '2025-01-15',
      team_members: [
        { member_id: 1, first_name: 'Alice', last_name: 'Anderson' },
        { member_id: 2, first_name: 'Bob', last_name: 'Brown' }
      ]
    }
  ],
  contact_info: {
    primary_email: 'contact@acme.com',
    phone_number: '555-9999',
    billing_address: {
      street_name: 'Main St',
      zip_code: '12345'
    }
  }
};
console.log('  Input:', JSON.stringify(dbResult, null, 2));
const transformed = transformToCamelCase(dbResult);
console.log('  Output:', JSON.stringify(transformed, null, 2));
console.log('');

// Test 7: Null and undefined handling
console.log('Test 7: Null and undefined handling');
console.log('  transformToCamelCase(null):', transformToCamelCase(null));
console.log('  transformToCamelCase(undefined):', transformToCamelCase(undefined));
console.log('  Object with null values:', JSON.stringify(transformToCamelCase({ first_name: null, last_name: undefined })));
console.log('');

// Test 8: JSONB fields (should remain objects)
console.log('Test 8: JSONB fields');
const jsonbData = {
  report_id: '8D-001',
  d1_team_members: [
    { user_id: 1, role: 'champion' },
    { user_id: 2, role: 'member' }
  ],
  process_flow: {
    step_1: 'Receiving',
    step_2: 'Inspection',
    quality_metrics: {
      defect_rate: 0.05,
      sample_size: 1000
    }
  }
};
console.log('  Input:', JSON.stringify(jsonbData, null, 2));
const jsonbTransformed = transformToCamelCase(jsonbData);
console.log('  Output:', JSON.stringify(jsonbTransformed, null, 2));
console.log('');

console.log('✅ All tests completed!');
