/*
  # Adicionar Campos de Tracking e Conversão

  1. Alterações na Tabela `conversations`
    - Campos de Tracking UTM:
      - `utm_source` (text) - Origem do tráfego (google, facebook, etc)
      - `utm_medium` (text) - Tipo de mídia (cpc, social, email, etc)
      - `utm_campaign` (text) - Nome da campanha
      - `utm_content` (text) - Identificador de conteúdo/variação
      - `utm_term` (text) - Termo de pesquisa (para anúncios)
    - Campos de Tracking Facebook:
      - `fbc` (text) - Facebook Click ID (rastreamento de cliques)
      - `fbp` (text) - Facebook Browser ID (rastreamento de navegador)
      - `referrer` (text) - URL de referência
    - Campos de Conversão:
      - `is_paid` (boolean) - Se o lead converteu em pagamento
      - `paid_amount` (numeric) - Valor pago em reais
      - `paid_at` (timestamptz) - Data/hora do pagamento
      - `sent_to_facebook_at` (timestamptz) - Data/hora que Purchase foi enviado ao Facebook

  2. Alterações na Tabela `funnels`
    - Campos de Configuração Facebook:
      - `facebook_pixel_id` (text) - ID do Pixel do Facebook
      - `facebook_capi_token` (text) - Token de acesso para Conversions API

  3. Notas Importantes
    - Todos os campos de tracking são opcionais (nullable)
    - Se não houver dados de tracking, o evento pode ser enviado assim mesmo
    - Os campos de pagamento são opcionais até que o admin marque como pago
    - Token do CAPI deve ser armazenado com segurança
*/

-- Adicionar campos de tracking e conversão na tabela conversations
DO $$
BEGIN
  -- Campos UTM
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'utm_source'
  ) THEN
    ALTER TABLE conversations ADD COLUMN utm_source text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'utm_medium'
  ) THEN
    ALTER TABLE conversations ADD COLUMN utm_medium text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'utm_campaign'
  ) THEN
    ALTER TABLE conversations ADD COLUMN utm_campaign text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'utm_content'
  ) THEN
    ALTER TABLE conversations ADD COLUMN utm_content text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'utm_term'
  ) THEN
    ALTER TABLE conversations ADD COLUMN utm_term text;
  END IF;

  -- Campos Facebook
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'fbc'
  ) THEN
    ALTER TABLE conversations ADD COLUMN fbc text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'fbp'
  ) THEN
    ALTER TABLE conversations ADD COLUMN fbp text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'referrer'
  ) THEN
    ALTER TABLE conversations ADD COLUMN referrer text;
  END IF;

  -- Campos de Conversão
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'is_paid'
  ) THEN
    ALTER TABLE conversations ADD COLUMN is_paid boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'paid_amount'
  ) THEN
    ALTER TABLE conversations ADD COLUMN paid_amount numeric(10, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE conversations ADD COLUMN paid_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'sent_to_facebook_at'
  ) THEN
    ALTER TABLE conversations ADD COLUMN sent_to_facebook_at timestamptz;
  END IF;
END $$;

-- Adicionar campos de configuração Facebook na tabela funnels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funnels' AND column_name = 'facebook_pixel_id'
  ) THEN
    ALTER TABLE funnels ADD COLUMN facebook_pixel_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'funnels' AND column_name = 'facebook_capi_token'
  ) THEN
    ALTER TABLE funnels ADD COLUMN facebook_capi_token text;
  END IF;
END $$;

-- Criar índices para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_conversations_utm_source ON conversations(utm_source);
CREATE INDEX IF NOT EXISTS idx_conversations_utm_campaign ON conversations(utm_campaign);
CREATE INDEX IF NOT EXISTS idx_conversations_is_paid ON conversations(is_paid);
CREATE INDEX IF NOT EXISTS idx_conversations_paid_at ON conversations(paid_at);

-- Comentários nas colunas para documentação
COMMENT ON COLUMN conversations.utm_source IS 'Origem do tráfego (ex: google, facebook, instagram)';
COMMENT ON COLUMN conversations.utm_medium IS 'Tipo de mídia (ex: cpc, social, email, organic)';
COMMENT ON COLUMN conversations.utm_campaign IS 'Nome da campanha de marketing';
COMMENT ON COLUMN conversations.utm_content IS 'Identificador de conteúdo ou variação do anúncio';
COMMENT ON COLUMN conversations.utm_term IS 'Termo de pesquisa usado (para anúncios de busca)';
COMMENT ON COLUMN conversations.fbc IS 'Facebook Click ID - rastreia cliques de anúncios do Facebook';
COMMENT ON COLUMN conversations.fbp IS 'Facebook Browser ID - rastreia navegador do usuário';
COMMENT ON COLUMN conversations.referrer IS 'URL de referência de onde o lead veio';
COMMENT ON COLUMN conversations.is_paid IS 'Indica se o lead converteu em pagamento';
COMMENT ON COLUMN conversations.paid_amount IS 'Valor pago pelo lead em reais';
COMMENT ON COLUMN conversations.paid_at IS 'Data e hora em que o pagamento foi realizado';
COMMENT ON COLUMN conversations.sent_to_facebook_at IS 'Data e hora em que o evento Purchase foi enviado ao Facebook via CAPI';
COMMENT ON COLUMN funnels.facebook_pixel_id IS 'ID do Pixel do Facebook para este funil';
COMMENT ON COLUMN funnels.facebook_capi_token IS 'Token de acesso para Facebook Conversions API';
