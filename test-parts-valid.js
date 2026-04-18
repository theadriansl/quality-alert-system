// Script to create a test Excel file with VALID data
const XLSX = require('xlsx');

const validTestData = [
  {
    'Número de Parte': 'TEST-001',
    'Part Number Cliente': 'CLIENT-TEST-001',
    'Nombre de Parte': 'Test Part 1 - Normal Values',
    'Descripción': 'Part with all fields filled correctly',
    'Revisión': 'Rev A',
    'Especificaciones': 'PPAP Level 3',
    'Peso (kg)': 5.5,
    'Cantidad SNP': 100,
    'Volumen SNP (m³)': 0.15
  },
  {
    'Número de Parte': 'TEST-002',
    'Part Number Cliente': 'CLIENT-TEST-002',
    'Nombre de Parte': 'Test Part 2 - Minimum Values',
    'Descripción': 'Part with minimum valid values',
    'Revisión': 'Rev A',
    'Especificaciones': 'Standard specs',
    'Peso (kg)': 0,
    'Cantidad SNP': 0,
    'Volumen SNP (m³)': 0
  },
  {
    'Número de Parte': 'TEST-003',
    'Part Number Cliente': 'CLIENT-TEST-003',
    'Nombre de Parte': 'Test Part 3 - Maximum Values',
    'Descripción': 'Part with maximum valid values',
    'Revisión': 'Rev C',
    'Especificaciones': 'High volume production',
    'Peso (kg)': 10000,
    'Cantidad SNP': 1000000,
    'Volumen SNP (m³)': 1000
  },
  {
    'Número de Parte': 'TEST-004',
    'Part Number Cliente': '',
    'Nombre de Parte': 'Test Part 4 - Optional Fields Empty',
    'Descripción': '',
    'Revisión': '',
    'Especificaciones': '',
    'Peso (kg)': '',
    'Cantidad SNP': '',
    'Volumen SNP (m³)': ''
  },
  {
    'Número de Parte': 'TEST-005',
    'Part Number Cliente': 'CLIENT-TEST-005',
    'Nombre de Parte': 'Test Part 5 - Decimal Values',
    'Descripción': 'Testing decimal precision',
    'Revisión': 'Rev B',
    'Especificaciones': 'Critical dimensions',
    'Peso (kg)': 2.567,
    'Cantidad SNP': 250,
    'Volumen SNP (m³)': 0.089
  }
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(validTestData);

ws['!cols'] = [
  { wch: 20 },
  { wch: 20 },
  { wch: 35 },
  { wch: 40 },
  { wch: 12 },
  { wch: 35 },
  { wch: 12 },
  { wch: 15 },
  { wch: 18 }
];

XLSX.utils.book_append_sheet(wb, ws, 'Partes');
XLSX.writeFile(wb, 'TEST_Partes_VALIDAS.xlsx');

console.log('✅ Archivo de prueba con datos VÁLIDOS creado: TEST_Partes_VALIDAS.xlsx');
console.log('\nDatos de prueba incluidos:');
console.log('- TEST-001: Valores normales');
console.log('- TEST-002: Valores mínimos (0)');
console.log('- TEST-003: Valores máximos');
console.log('- TEST-004: Campos opcionales vacíos');
console.log('- TEST-005: Valores decimales');
