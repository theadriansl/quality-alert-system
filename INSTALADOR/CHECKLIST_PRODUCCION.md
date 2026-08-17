# IxT-QMS - Checklist para Produccion

## Antes del Primer Cliente

### Seguridad (OBLIGATORIO)
- [ ] Cambiar JWT_SECRET en .env (usar clave larga y aleatoria)
- [ ] Cambiar contrasena del usuario admin
- [ ] Configurar HTTPS (certificado SSL)
- [ ] Revisar que no haya datos de prueba en la BD

### Backups (OBLIGATORIO)
- [ ] Configurar backup diario de base de datos
- [ ] Configurar backup de carpeta uploads/
- [ ] Probar restauracion de backup

### Configuracion del Cliente
- [ ] Crear usuarios reales (no usar admin para todo)
- [ ] Configurar estaciones de inspeccion
- [ ] Configurar catalogos (defectos, causas raiz, etc.)
- [ ] Cargar partes/productos del cliente
- [ ] Configurar turnos

---

## Opciones de Hosting

### A. Servidor Local del Cliente

**Requisitos:**
- PC con Windows 10/11 o Windows Server
- 8 GB RAM minimo
- Siempre encendida
- Red local estable

**Pasos:**
1. Instalar Node.js
2. Instalar PostgreSQL
3. Ejecutar INSTALAR_WINDOWS.bat
4. Configurar firewall para puertos 3000/3001
5. Configurar IP fija en la red local

**Costo:** $0/mes (solo hardware inicial)

---

### B. Servidor en la Nube (Recomendado)

**Opciones economicas:**

| Proveedor | Plan | Costo/mes | RAM | Disco |
|-----------|------|-----------|-----|-------|
| DigitalOcean | Basic Droplet | $12 USD | 2 GB | 50 GB |
| Vultr | Cloud Compute | $12 USD | 2 GB | 55 GB |
| Linode | Shared CPU | $12 USD | 2 GB | 50 GB |
| AWS Lightsail | Small | $10 USD | 2 GB | 60 GB |
| Hetzner | CX21 | €4.5 EUR | 4 GB | 40 GB |

**Pasos generales:**
1. Crear cuenta en el proveedor
2. Crear servidor Ubuntu 22.04
3. Conectar por SSH
4. Instalar Node.js, PostgreSQL, Nginx
5. Subir codigo
6. Configurar dominio y SSL

---

### C. Servicios Administrados (Mas facil, mas caro)

| Servicio | Que incluye | Costo/mes |
|----------|-------------|-----------|
| Railway | Hosting + BD + SSL | ~$20 USD |
| Render | Hosting + BD + SSL | ~$25 USD |
| Heroku | Hosting + BD + SSL | ~$30 USD |

**Ventaja:** Ellos manejan actualizaciones, backups, SSL
**Desventaja:** Mas caro, menos control

---

## Script de Backup (agregar a servidor)

Crear archivo `backup.sh`:
```bash
#!/bin/bash
FECHA=$(date +%Y%m%d_%H%M)
BACKUP_DIR="/backups"

# Backup base de datos
pg_dump -U postgres apqp_system > $BACKUP_DIR/db_$FECHA.sql

# Backup archivos
tar -czf $BACKUP_DIR/uploads_$FECHA.tar.gz /ruta/backend/uploads/

# Eliminar backups mayores a 30 dias
find $BACKUP_DIR -mtime +30 -delete

echo "Backup completado: $FECHA"
```

Programar con cron (ejecutar cada noche a las 2am):
```
0 2 * * * /ruta/backup.sh
```

---

## Antes de Cada Actualizacion

- [ ] Hacer backup de BD
- [ ] Hacer backup de uploads/
- [ ] Probar actualizacion en ambiente de pruebas
- [ ] Notificar a usuarios del mantenimiento
- [ ] Ejecutar nuevas migraciones si hay
- [ ] Verificar que todo funcione
- [ ] Documentar cambios realizados

---

## Contactos de Emergencia

- Soporte tecnico: [tu telefono]
- Email: [tu email]
- Horario: [tus horarios]

---

## Notas Importantes

1. **NUNCA** compartir el archivo .env (contiene contrasenas)
2. **NUNCA** usar "admin123" como contrasena en produccion
3. **SIEMPRE** probar backups periodicamente
4. **SIEMPRE** tener al menos 2 usuarios admin (por si uno se bloquea)
