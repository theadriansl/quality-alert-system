const crypto = require('crypto');
const pool = require('../config/database');

/**
 * Middleware de autenticación para webhooks
 * Espera header: X-API-Key: pk_XXXXXXXX_secretkey
 * O header: Authorization: Bearer pk_XXXXXXXX_secretkey
 */
const authenticateWebhook = async (req, res, next) => {
  const startTime = Date.now();

  try {
    // Obtener API key del header
    let apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      }
    }

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key requerida',
        code: 'MISSING_API_KEY'
      });
    }

    // Extraer prefijo (primeros 8 caracteres después de "pk_")
    const prefix = apiKey.substring(0, 11); // "pk_" + 8 chars = 11

    // Buscar API key por prefijo
    const keyResult = await pool.query(`
      SELECT id, system_name, api_key_hash, permissions, allowed_ips,
             rate_limit_per_minute, is_active, expires_at
      FROM webhook_api_keys
      WHERE api_key_prefix = $1
    `, [prefix]);

    if (keyResult.rows.length === 0) {
      await logWebhookCall(null, req, 401, { error: 'API key no encontrada' }, startTime, false);
      return res.status(401).json({
        success: false,
        error: 'API key inválida',
        code: 'INVALID_API_KEY'
      });
    }

    const keyData = keyResult.rows[0];

    // Verificar si está activa
    if (!keyData.is_active) {
      await logWebhookCall(keyData.id, req, 401, { error: 'API key desactivada' }, startTime, false);
      return res.status(401).json({
        success: false,
        error: 'API key desactivada',
        code: 'DISABLED_API_KEY'
      });
    }

    // Verificar expiración
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      await logWebhookCall(keyData.id, req, 401, { error: 'API key expirada' }, startTime, false);
      return res.status(401).json({
        success: false,
        error: 'API key expirada',
        code: 'EXPIRED_API_KEY'
      });
    }

    // Verificar hash del API key completo
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    if (keyHash !== keyData.api_key_hash) {
      await logWebhookCall(keyData.id, req, 401, { error: 'API key incorrecta' }, startTime, false);
      return res.status(401).json({
        success: false,
        error: 'API key inválida',
        code: 'INVALID_API_KEY'
      });
    }

    // Verificar IP permitida
    if (keyData.allowed_ips && keyData.allowed_ips.length > 0) {
      const clientIp = req.ip || req.connection.remoteAddress;
      const normalizedIp = clientIp.replace('::ffff:', ''); // IPv4-mapped IPv6

      if (!keyData.allowed_ips.includes(normalizedIp) && !keyData.allowed_ips.includes(clientIp)) {
        await logWebhookCall(keyData.id, req, 403, { error: 'IP no autorizada', ip: clientIp }, startTime, false);
        return res.status(403).json({
          success: false,
          error: 'IP no autorizada',
          code: 'FORBIDDEN_IP'
        });
      }
    }

    // TODO: Rate limiting (implementar con Redis para producción)

    // Actualizar último uso
    await pool.query(`
      UPDATE webhook_api_keys
      SET last_used_at = CURRENT_TIMESTAMP, usage_count = usage_count + 1
      WHERE id = $1
    `, [keyData.id]);

    // Adjuntar info al request
    req.webhookAuth = {
      keyId: keyData.id,
      systemName: keyData.system_name,
      permissions: keyData.permissions || ['production:write'],
      startTime
    };

    next();

  } catch (error) {
    console.error('Error en webhook auth:', error);
    return res.status(500).json({
      success: false,
      error: 'Error de autenticación',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Verificar permiso específico
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.webhookAuth) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const perms = req.webhookAuth.permissions || [];
    if (!perms.includes(permission) && !perms.includes('*')) {
      return res.status(403).json({
        success: false,
        error: `Permiso requerido: ${permission}`,
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

/**
 * Log de llamada webhook
 */
const logWebhookCall = async (keyId, req, status, responseBody, startTime, success, recordsProcessed = 0) => {
  try {
    const duration = Date.now() - startTime;
    await pool.query(`
      INSERT INTO webhook_logs (
        api_key_id, endpoint, method, ip_address, user_agent,
        request_body, response_status, response_body,
        processed_at, duration_ms, success, records_processed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, $9, $10, $11)
    `, [
      keyId,
      req.originalUrl,
      req.method,
      req.ip || req.connection.remoteAddress,
      req.headers['user-agent'],
      req.body ? JSON.stringify(req.body) : null,
      status,
      JSON.stringify(responseBody),
      duration,
      success,
      recordsProcessed
    ]);
  } catch (err) {
    console.error('Error logging webhook call:', err);
  }
};

/**
 * Generar nueva API key
 */
const generateApiKey = () => {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  const prefix = 'pk_' + crypto.randomBytes(4).toString('hex');
  const fullKey = prefix + '_' + randomBytes;
  const hash = crypto.createHash('sha256').update(fullKey).digest('hex');

  return {
    fullKey,      // Mostrar solo una vez al crear
    prefix,       // Guardar para identificación
    hash          // Guardar para validación
  };
};

module.exports = {
  authenticateWebhook,
  requirePermission,
  logWebhookCall,
  generateApiKey
};
