# Como Configurar Acesso de Admin

O sistema usa autenticação segura via Supabase. Todo usuário criado é automaticamente um administrador.

## Criar sua Primeira Conta

As contas de administrador devem ser criadas manualmente via Dashboard do Supabase:

1. Acesse o Dashboard do Supabase
2. Vá em **Authentication** → **Users** → **Add User**
3. Preencha:
   - Email do administrador
   - Senha (mínimo 6 caracteres)
4. Clique em "Create user"

O usuário criado será automaticamente promovido a admin pelo sistema.

## Fazer Login

Após criar a conta no Dashboard do Supabase:

1. Acesse `/login` na sua aplicação
2. Digite o email e senha que você configurou
3. Clique em "Entrar"

Pronto! Você terá acesso completo ao painel administrativo.

## Como Funciona

### Promoção Automática

Quando um novo usuário é criado no Dashboard do Supabase, um trigger do banco de dados automaticamente adiciona o role "admin" ao `app_metadata` do usuário.

```sql
CREATE TRIGGER on_auth_user_created
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
```

### Segurança Implementada

#### No Backend (RLS - Row Level Security)

Todas as políticas de acesso ao banco de dados verificam se o usuário tem role de admin:

- `funnels`: Apenas admins podem criar/editar/deletar
- `funnel_blocks`: Apenas admins podem gerenciar
- `conversations`: Apenas admins podem ver todas
- `lead_responses`: Apenas admins podem ver todas
- `lead_tickets`: Apenas admins podem gerenciar

#### No Frontend

- Rotas protegidas verificam `isAdmin` antes de renderizar
- Estado de loading enquanto verifica autenticação
- Redirecionamento automático se não autenticado

#### O que está protegido

- Role armazenado em `raw_app_meta_data` (não pode ser modificado pelo usuário)
- JWT contém o role e é verificado em cada requisição
- Políticas RLS garantem segurança mesmo se o frontend for burlado
- Trigger garante que todos os usuários criados são admin

## Adicionando Mais Administradores

Para adicionar novos administradores:

1. Acesse Dashboard do Supabase
2. Vá em **Authentication** → **Users** → **Add User**
3. Preencha email e senha do novo administrador
4. O usuário será automaticamente promovido a admin
5. Compartilhe as credenciais com o novo administrador

## Desabilitando Confirmação de Email (Desenvolvimento)

Para facilitar o desenvolvimento, você pode desabilitar a confirmação de email:

1. Dashboard do Supabase → **Authentication** → **Email Auth**
2. Desmarque **Enable email confirmations**
3. Salve as alterações

Agora os usuários podem fazer login imediatamente após você criar a conta, sem precisar confirmar o email.

**ATENÇÃO:** Em produção, é recomendado manter a confirmação de email habilitada para maior segurança.

## Troubleshooting

### "Invalid login credentials"

- Verifique se o email e senha estão corretos
- Verifique se o usuário foi criado no Supabase Auth (Dashboard → Authentication → Users)
- Se estiver com confirmação de email habilitada, verifique se o email foi confirmado

### Não consigo ver os funnels/conversas

- Verifique se você está logado
- Confira no console do navegador se há erros de RLS
- Verifique se as migrações do banco foram aplicadas corretamente
- Confirme que o usuário tem role "admin" no app_metadata

### Preciso criar conta mas não tenho acesso ao Dashboard

- Somente administradores com acesso ao Dashboard do Supabase podem criar novas contas
- Se você perdeu o acesso, será necessário recuperar acesso ao projeto no Supabase
- Não há opção de criar conta pela interface por questões de segurança

## Segurança em Produção

Para produção, recomendamos:

1. Habilitar confirmação de email
2. Usar senhas fortes (mínimo 12 caracteres)
3. Limitar acesso ao Dashboard do Supabase apenas para pessoas autorizadas
4. Monitorar logs de acesso no Dashboard do Supabase
5. Revisar periodicamente a lista de usuários ativos
6. Remover usuários inativos ou que não precisam mais de acesso

## Verificar Usuários Existentes

Para ver todos os usuários criados:

1. Dashboard do Supabase → **Authentication** → **Users**
2. Você verá a lista completa de usuários
3. Pode editar, desabilitar ou deletar usuários conforme necessário
4. No app_metadata de cada usuário, confirme que `role: "admin"` está presente
