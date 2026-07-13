-- ============================================================================
-- Migración 104: API Keys para Webhooks
-- Permite autenticación de sistemas externos (SAP, MES, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_api_keys (
  id SERIAL PRIMARY KEY,

  -- Identificación del sistema externo
  system_name VARCHAR(100) NOT NULL,        -- Ej: "SAP", "MES_LINEA_1", "EPICOR"
  description TEXT,

  -- API Key (hash)
  api_key_hash VARCHAR(255) NOT NULL,       -- SHA256 del API key
  api_key_prefix VARCHAR(8) NOT NULL,       -- Primeros 8 chars para identificar (pk_XXXXXXXX)

  -- Permisos
  permissions JSONB DEFAULT '["production:write"]',  -- Permisos permitidos
  allowed_ips TEXT[],                        -- IPs permitidas (NULL = todas)

  -- Rate limiting
  rate_limit_per_minute INTEGER DEFAULT 100,

  -- Estado
  is_active BOOLEAN DEFAULT true,

  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,

  -- Expiración opcional
  expires_at TIMESTAMP,

  UNIQUE(api_key_prefix)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON webhook_api_keys(api_key_prefix) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_system ON webhook_api_keys(system_name);

-- Log de llamadas webhook
CREATE TABLE IF NOT EXISTS webhook_logs (
  id SERIAL PRIMARY KEY,
  api_key_id INTEGER REFERENCES webhook_api_keys(id),

  -- Request info
  endpoint VARCHAR(100) NOT NULL,
  method VARCHAR(10) NOT NULL,
  ip_address INET,
  user_agent TEXT,

  -- Payload
  request_body JSONB,

  -- Response
  response_status INTEGER,
  response_body JSONB,

  -- Timing
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  duration_ms INTEGER,

  -- Resultado
  success BOOLEAN,
  error_message TEXT,
  records_processed INTEGER DEFAULT 0
);

-- Índices para logs
CREATE INDEX IF NOT EXISTS idx_webhook_logs_key ON webhook_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_date ON webhook_logs(received_at);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_success ON webhook_logs(success) WHERE success = false;

-- Limpiar logs antiguos (retener 30 días)
CREATE OR REPLACE FUNCTION cleanup_webhook_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM webhook_logs WHERE received_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE webhook_api_keys IS 'API Keys para autenticación de sistemas externos (webhooks)';
COMMENT ON TABLE webhook_logs IS 'Log de llamadas a webhooks para auditoría y debugging';
COMMENT ON COLUMN webhook_api_keys.api_key_prefix IS 'Prefijo visible del API key para identificación (pk_XXXXXXXX)';
COMMENT ON COLUMN webhook_api_keys.permissions IS 'Permisos: production:write, production:read, etc.';
