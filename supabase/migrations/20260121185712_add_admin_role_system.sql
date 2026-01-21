/*
  # Sistema de Roles de Admin

  1. Novas Funções
    - `is_admin()` - Verifica se o usuário logado é admin através do app_metadata
    - `promote_user_to_admin(user_id)` - Função para promover usuário a admin (apenas para admins)
  
  2. Atualização de RLS
    - Todas as tabelas de admin agora verificam se o usuário é admin
    - Apenas admins podem criar/editar/deletar funnels
    - Apenas admins podem ver todas as conversas e respostas
  
  3. Segurança
    - Role armazenado em `raw_app_meta_data` (não modificável pelo usuário)
    - Função helper para verificar role via JWT
    - RLS policies restritivas que verificam o role

  ## Como promover o primeiro admin:
  
  ### Opção 1: Via SQL Editor do Supabase
  ```sql
  UPDATE auth.users 
  SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
  WHERE email = 'seu-email@exemplo.com';
  ```
  
  ### Opção 2: Via interface web do Supabase
  Authentication → Users → Selecione o usuário → User Metadata → 
  Adicione no "App Metadata": {"role": "admin"}
*/

-- Função para verificar se o usuário atual é admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
      false
    )
  );
END;
$$;

-- Função para promover usuário a admin (apenas admins podem executar)
CREATE OR REPLACE FUNCTION promote_user_to_admin(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verifica se quem está executando é admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can promote users';
  END IF;
  
  -- Atualiza o app_metadata do usuário alvo
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
  WHERE id = target_user_id;
  
  RETURN true;
END;
$$;

-- Políticas para funnels (apenas admins podem gerenciar)
CREATE POLICY "Anyone can view active funnels"
  ON funnels FOR SELECT
  USING (is_active = true OR is_admin());

CREATE POLICY "Admins can create funnels"
  ON funnels FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update funnels"
  ON funnels FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete funnels"
  ON funnels FOR DELETE
  TO authenticated
  USING (is_admin());

-- Políticas para funnel_blocks (apenas admins podem gerenciar)
CREATE POLICY "Anyone can view blocks of active funnels"
  ON funnel_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM funnels
      WHERE funnels.id = funnel_blocks.funnel_id
      AND (funnels.is_active = true OR is_admin())
    )
  );

CREATE POLICY "Admins can create blocks"
  ON funnel_blocks FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update blocks"
  ON funnel_blocks FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete blocks"
  ON funnel_blocks FOR DELETE
  TO authenticated
  USING (is_admin());

-- Políticas para conversations (admins veem todas)
CREATE POLICY "Admins can view all conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Anyone can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete conversations"
  ON conversations FOR DELETE
  TO authenticated
  USING (is_admin());

-- Políticas para lead_responses (admins veem todas)
CREATE POLICY "Admins can view all responses"
  ON lead_responses FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Anyone can create responses"
  ON lead_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update responses"
  ON lead_responses FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete responses"
  ON lead_responses FOR DELETE
  TO authenticated
  USING (is_admin());

-- Políticas para lead_tickets (apenas admins)
CREATE POLICY "Admins can view all tickets"
  ON lead_tickets FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can create tickets"
  ON lead_tickets FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update tickets"
  ON lead_tickets FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete tickets"
  ON lead_tickets FOR DELETE
  TO authenticated
  USING (is_admin());

-- Comentário com instruções
COMMENT ON FUNCTION is_admin() IS 'Verifica se o usuário logado tem role de admin no app_metadata. Para promover o primeiro admin, execute: UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || ''{"role": "admin"}''::jsonb WHERE email = ''seu-email@exemplo.com'';';
