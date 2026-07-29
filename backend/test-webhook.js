/**
 * Script para probar webhooks de producción
 *
 * Uso:
 *   1. Crear API key en /defect-admin → Producción → API Keys
 *   2. Copiar la key generada
 *   3. Ejecutar: node test-webhook.js TU_API_KEY
 */

const API_KEY = process.argv[2];
const BASE_URL = 'http://localhost:5000';

if (!API_KEY) {
  console.log('\n❌ Uso: node test-webhook.js TU_API_KEY\n');
  console.log('Primero crea una API key en:');
  console.log('  http://localhost:3000/defect-admin → Producción → API Keys\n');
  process.exit(1);
}

async function test() {
  console.log('\n🧪 PROBANDO WEBHOOKS DE PRODUCCIÓN\n');
  console.log('API Key:', API_KEY.substring(0, 15) + '...\n');

  // Test 1: Enviar un serial
  console.log('─'.repeat(50));
  console.log('TEST 1: Enviar serial único');
  console.log('─'.repeat(50));

  try {
    const res1 = await fetch(`${BASE_URL}/webhook/production`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        serial_number: `TEST-${Date.now()}`,
        part_number: 'TF-GEN-001',
        lot_number: 'LOT-TEST-001',
        work_order: 'WO-TEST-001',
        produced_at: new Date().toISOString()
      })
    });

    const data1 = await res1.json();
    console.log('Status:', res1.status);
    console.log('Response:', JSON.stringify(data1, null, 2));
    console.log(data1.success ? '✅ PASSED' : '❌ FAILED');
  } catch (err) {
    console.log('❌ ERROR:', err.message);
  }

  // Test 2: Enviar batch
  console.log('\n' + '─'.repeat(50));
  console.log('TEST 2: Enviar batch (5 seriales)');
  console.log('─'.repeat(50));

  try {
    const entries = [];
    const timestamp = Date.now();
    for (let i = 1; i <= 5; i++) {
      entries.push({
        serial_number: `BATCH-${timestamp}-${i.toString().padStart(3, '0')}`,
        part_number: 'TF-GEN-001',
        lot_number: 'LOT-BATCH-001',
        work_order: 'WO-BATCH-001'
      });
    }

    const res2 = await fetch(`${BASE_URL}/webhook/production`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ entries })
    });

    const data2 = await res2.json();
    console.log('Status:', res2.status);
    console.log('Response:', JSON.stringify(data2, null, 2));
    console.log(data2.success ? '✅ PASSED' : '❌ FAILED');
  } catch (err) {
    console.log('❌ ERROR:', err.message);
  }

  // Test 3: Consultar estado
  console.log('\n' + '─'.repeat(50));
  console.log('TEST 3: Consultar estado de serial');
  console.log('─'.repeat(50));

  try {
    const testSerial = `TEST-${Date.now()}`;

    // Primero crear
    await fetch(`${BASE_URL}/webhook/production`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        serial_number: testSerial,
        part_number: 'TF-GEN-001'
      })
    });

    // Luego consultar
    const res3 = await fetch(`${BASE_URL}/webhook/production/status/${testSerial}`, {
      headers: { 'X-API-Key': API_KEY }
    });

    const data3 = await res3.json();
    console.log('Serial:', testSerial);
    console.log('Status:', res3.status);
    console.log('Response:', JSON.stringify(data3, null, 2));
    console.log(data3.success ? '✅ PASSED' : '❌ FAILED');
  } catch (err) {
    console.log('❌ ERROR:', err.message);
  }

  // Test 4: Duplicado (debe reportar duplicate)
  console.log('\n' + '─'.repeat(50));
  console.log('TEST 4: Enviar duplicado (debe ignorar)');
  console.log('─'.repeat(50));

  try {
    const dupSerial = `DUP-${Date.now()}`;

    // Enviar primera vez
    await fetch(`${BASE_URL}/webhook/production`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        serial_number: dupSerial,
        part_number: 'TF-GEN-001'
      })
    });

    // Enviar segunda vez
    const res4 = await fetch(`${BASE_URL}/webhook/production`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        serial_number: dupSerial,
        part_number: 'TF-GEN-001'
      })
    });

    const data4 = await res4.json();
    console.log('Status:', res4.status);
    console.log('Response:', JSON.stringify(data4, null, 2));
    console.log(data4.results?.duplicates === 1 ? '✅ PASSED (detectó duplicado)' : '❌ FAILED');
  } catch (err) {
    console.log('❌ ERROR:', err.message);
  }

  // Test 5: Part number no configurado
  console.log('\n' + '─'.repeat(50));
  console.log('TEST 5: Part number no configurado (warning)');
  console.log('─'.repeat(50));

  try {
    const res5 = await fetch(`${BASE_URL}/webhook/production`, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        serial_number: `UNMATCHED-${Date.now()}`,
        part_number: 'PARTE-NO-EXISTE-XYZ'
      })
    });

    const data5 = await res5.json();
    console.log('Status:', res5.status);
    console.log('Response:', JSON.stringify(data5, null, 2));
    console.log(data5.warnings?.length > 0 ? '✅ PASSED (generó warning)' : '⚠️ Sin warning');
  } catch (err) {
    console.log('❌ ERROR:', err.message);
  }

  console.log('\n' + '═'.repeat(50));
  console.log('🏁 PRUEBAS COMPLETADAS');
  console.log('═'.repeat(50));
  console.log('\nRevisa los datos en:');
  console.log('  http://localhost:3000/defect-admin → Producción → Lista\n');
}

test();
