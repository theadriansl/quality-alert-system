// Script to create a test Excel file with VALIDATION ERRORS
const XLSX = require('xlsx');

const errorTestData = [
  {
    'Número de Parte': 'ERROR-001',
    'Part Number Cliente': 'CLIENT-ERR-001',
    'Nombre de Parte': 'Error Test 1 - Weight Too High',
    'Descripción': 'This should fail - weight exceeds 10000 kg',
    'Revisión': 'Rev A',
    'Especificaciones': 'Should fail validation',
    'Peso (kg)': 15000,  // ❌ Exceeds maximum
    'Cantidad SNP': 100,
    'Volumen SNP (m³)': 0.5
  },
  {
    'Número de Parte': 'ERROR-002',
    'Part Number Cliente': 'CLIENT-ERR-002',
    'Nombre de Parte': 'Error Test 2 - Negative Weight',
    'Descripción': 'This should fail - negative weight',
    'Revisión': 'Rev A',
    'Especificaciones': 'Should fail validation',
    'Peso (kg)': -5,  // ❌ Negative value
    'Cantidad SNP': 100,
    'Volumen SNP (m³)': 0.5
  },
  {
    'Número de Parte': 'VALID-001',
    'Part Number Cliente': 'CLIENT-VALID-001',
    'Nombre de Parte': 'Valid Part - Should Import',
    'Descripción': 'This one should import successfully',
    'Revisión': 'Rev A',
    'Especificaciones': 'All values are valid',
    'Peso (kg)': 5.5,  // ✅ Valid
    'Cantidad SNP': 100,  // ✅ Valid
    'Volumen SNP (m³)': 0.5  // ✅ Valid
  },
  {
    'Número de Parte': 'ERROR-003',
    'Part Number Cliente': 'CLIENT-ERR-003',
    'Nombre de Parte': 'Error Test 3 - Quantity Too High',
    'Descripción': 'This should fail - quantity exceeds 1,000,000',
    'Revisión': 'Rev B',
    'Especificaciones': 'Should fail validation',
    'Peso (kg)': 5,
    'Cantidad SNP': 2000000,  // ❌ Exceeds maximum
    'Volumen SNP (m³)': 0.5
  },
  {
    'Número de Parte': 'ERROR-004',
    'Part Number Cliente': 'CLIENT-ERR-004',
    'Nombre de Parte': 'Error Test 4 - Volume Too High',
    'Descripción': 'This should fail - volume exceeds 1000 m³',
    'Revisión': 'Rev C',
    'Especificaciones': 'Should fail validation',
    'Peso (kg)': 5,
    'Cantidad SNP': 100,
    'Volumen SNP (m³)': 1500  // ❌ Exceeds maximum
  },
  {
    'Número de Parte': 'ERROR-005',
    'Part Number Cliente': 'CLIENT-ERR-005',
    'Nombre de Parte': 'Error Test 5 - Invalid Text in Number Field',
    'Descripción': 'This should fail - text in numeric field',
    'Revisión': 'Rev A',
    'Especificaciones': 'Should fail validation',
    'Peso (kg)': 'NOT_A_NUMBER',  // ❌ Invalid type
    'Cantidad SNP': 100,
    'Volumen SNP (m³)': 0.5
  },
  {
    'Número de Parte': '',  // ❌ Missing required field
    'Part Number Cliente': 'CLIENT-ERR-006',
    'Nombre de Parte': 'Error Test 6 - Missing Part Number',
    'Descripción': 'This should be skipped - no part number',
    'Revisión': 'Rev A',
    'Especificaciones': 'Should be skipped',
    'Peso (kg)': 5,
    'Cantidad SNP': 100,
    'Volumen SNP (m³)': 0.5
  },
  {
    'Número de Parte': 'ERROR-007',
    'Part Number Cliente': 'CLIENT-ERR-007',
    'Nombre de Parte': '',  // ❌ Missing required field
    'Descripción': 'This should be skipped - no part name',
    'Revisión': 'Rev A',
    'Especificaciones': 'Should be skipped',
    'Peso (kg)': 5,
    'Cantidad SNP': 100,
    'Volumen SNP (m³)': 0.5
  },
  {
    'Número de Parte': 'VALID-002',
    'Part Number Cliente': 'CLIENT-VALID-002',
    'Nombre de Parte': 'Another Valid Part',
    'Descripción': 'This should also import successfully',
    'Revisión': 'Rev D',
    'Especificaciones': 'All good here',
    'Peso (kg)': 3.2,  // ✅ Valid
    'Cantidad SNP': 500,  // ✅ Valid
    'Volumen SNP (m³)': 0.25  // ✅ Valid
  }
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(errorTestData);

ws['!cols'] = [
  { wch: 20 },
  { wch: 20 },
  { wch: 40 },
  { wch: 45 },
  { wch: 12 },
  { wch: 35 },
  { wch: 20 },
  { wch: 15 },
  { wch: 20 }
];

XLSX.utils.book_append_sheet(wb, ws, 'Partes');
XLSX.writeFile(wb, 'TEST_Partes_CON_ERRORES.xlsx');

console.log('✅ Archivo de prueba con ERRORES creado: TEST_Partes_CON_ERRORES.xlsx');
console.log('\nErrores incluidos para validación:');
console.log('❌ ERROR-001: Peso excede máximo (15000 kg)');
console.log('❌ ERROR-002: Peso negativo (-5 kg)');
console.log('❌ ERROR-003: Cantidad excede máximo (2,000,000)');
console.log('❌ ERROR-004: Volumen excede máximo (1500 m³)');
console.log('❌ ERROR-005: Texto en campo numérico');
console.log('❌ ERROR-006: Falta número de parte (requerido)');
console.log('❌ ERROR-007: Falta nombre de parte (requerido)');
console.log('\n✅ Partes válidas que deberían importarse:');
console.log('✅ VALID-001: Todos los valores correctos');
console.log('✅ VALID-002: Todos los valores correctos');
console.log('\nResultado esperado: 2 partes importadas, 7 errores reportados');
