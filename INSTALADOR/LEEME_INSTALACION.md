# IxT-QMS - Guia de Instalacion

## Requisitos del Sistema

### Software necesario
| Software | Version minima | Descargar |
|----------|----------------|-----------|
| Node.js | 18.x o superior | https://nodejs.org |
| PostgreSQL | 15.x o superior | https://www.postgresql.org/download |
| Git | 2.x | https://git-scm.com |

### Hardware recomendado
- CPU: 2 cores minimo
- RAM: 4 GB minimo (8 GB recomendado)
- Disco: 20 GB libres

---

## Paso 1: Instalar PostgreSQL

1. Descargar e instalar PostgreSQL
2. Durante instalacion, recordar la contrasena del usuario `postgres`
3. El puerto por defecto es `5432`

---

## Paso 2: Crear la Base de Datos

Abrir terminal/CMD y ejecutar:

```bash
# Conectar a PostgreSQL
psql -U postgres

# Crear la base de datos
CREATE DATABASE apqp_system;

# Salir
\q
```

---

## Paso 3: Configurar el Backend

1. Ir a la carpeta del backend:
```bash
cd quality-alert-system/backend
```

2. Copiar archivo de configuracion:
```bash
cp .env.example .env
```

3. Editar `.env` con tus datos:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=apqp_system
DB_USER=postgres
DB_PASSWORD=tu_contrasena_aqui
JWT_SECRET=una_clave_secreta_larga_y_segura
PORT=3001
```

4. Instalar dependencias:
```bash
npm install
```

---

## Paso 4: Ejecutar Migraciones

```bash
cd quality-alert-system/backend
node INSTALADOR/scripts/instalar_bd.js
```

Esto creara todas las tablas, funciones y datos iniciales.

---

## Paso 5: Configurar el Frontend

1. Ir a la carpeta del frontend:
```bash
cd quality-alert-system/frontend
```

2. Instalar dependencias:
```bash
npm install
```

3. Crear archivo `.env`:
```
REACT_APP_API_URL=http://localhost:3001
```

---

## Paso 6: Iniciar el Sistema

### Terminal 1 - Backend:
```bash
cd quality-alert-system/backend
npm start
```
Deberia mostrar: "Server running on: http://localhost:3001"

### Terminal 2 - Frontend:
```bash
cd quality-alert-system/frontend
npm start
```
Deberia abrir el navegador en: http://localhost:3000

---

## Paso 7: Primer Acceso

Usuario administrador por defecto:
- **Email:** admin@company.com
- **Password:** admin123

**IMPORTANTE:** Cambiar esta contrasena inmediatamente despues del primer acceso.

---

## Solucion de Problemas

### Error: "Cannot connect to database"
- Verificar que PostgreSQL este corriendo
- Verificar usuario y contrasena en `.env`
- Verificar que la base de datos `apqp_system` exista

### Error: "Port 3001 already in use"
- Otro proceso usa el puerto
- Cambiar PORT en `.env` a otro numero (ej: 3002)

### Error: "Module not found"
- Ejecutar `npm install` en la carpeta correspondiente

---

## Contacto Soporte

Para soporte tecnico contactar a: [tu email aqui]
