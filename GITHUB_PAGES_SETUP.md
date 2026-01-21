# Setup Rápido para GitHub Pages

## Passos para Deploy Automático

### 1️⃣ Adicionar Secrets no GitHub

No seu repositório GitHub:

**Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Adicione 2 secrets:

```
VITE_SUPABASE_URL = sua_url_do_supabase
VITE_SUPABASE_ANON_KEY = sua_chave_publica_do_supabase
```

### 2️⃣ Ativar GitHub Pages

**Settings** → **Pages** → **Source** → Selecione **GitHub Actions**

### 3️⃣ (Opcional) Se NÃO for username.github.io

**Settings** → **Secrets and variables** → **Actions** → **Variables** tab → **New repository variable**

```
VITE_BASE_PATH = /nome-do-seu-repositorio/
```

Por exemplo, se o repo for `https://github.com/joao/chat-app`:
```
VITE_BASE_PATH = /chat-app/
```

### 4️⃣ Push para Main

```bash
git add .
git commit -m "feat: setup GitHub Pages"
git push origin main
```

### 5️⃣ Aguarde o Deploy

- Vá em **Actions** no GitHub
- Aguarde completar (2-5 min)
- Seu site estará em: `https://seu-usuario.github.io/nome-repo/`

---

## Deploy Manual

Se quiser forçar um deploy:

1. **Actions** → **Deploy to GitHub Pages** → **Run workflow**
2. Selecione branch **main**
3. Clique **Run workflow**

---

## Verificar Logs

Se algo der errado, verifique os logs em **Actions** → Clique no workflow com erro → Veja os detalhes de cada step.

---

## Atualizar o Site

Todo push na branch `main` fará deploy automático. Não precisa fazer nada extra!

```bash
git add .
git commit -m "update: minhas mudanças"
git push origin main
```

Em 2-5 minutos seu site estará atualizado!
