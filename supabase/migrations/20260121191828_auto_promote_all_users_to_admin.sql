/*
  # Auto-promover todos os usuários a admin

  1. Função Trigger
    - `handle_new_user()` - Automaticamente adiciona role "admin" a novos usuários
  
  2. Trigger
    - Executa após inserção na tabela auth.users
    - Define app_metadata com role "admin"
  
  3. Remoção
    - Remove função `promote_user_to_admin` (não mais necessária)
  
  ## Como funciona:
  
  Todo usuário criado via signUp ou pelo dashboard do Supabase
  será automaticamente promovido a admin. Não é necessário nenhum
  passo adicional.
*/

-- Remove função de promoção manual (não mais necessária)
DROP FUNCTION IF EXISTS promote_user_to_admin(uuid);

-- Função que será executada automaticamente para novos usuários
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Adiciona role admin ao app_metadata do novo usuário
  NEW.raw_app_meta_data := COALESCE(NEW.raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb;
  RETURN NEW;
END;
$$;

-- Trigger que executa a função antes de inserir novo usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Atualizar usuários existentes para serem admin (caso já existam)
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE raw_app_meta_data->>'role' IS NULL OR raw_app_meta_data->>'role' != 'admin';

-- Comentário
COMMENT ON FUNCTION handle_new_user() IS 'Trigger que automaticamente promove todos os novos usuários a admin. Todo usuário criado no sistema é um administrador.';
