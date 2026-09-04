# Servidor PocketBase Local

Esta pasta contém as definições do backend (schema, seed e endpoints customizados via hooks) do **Sistema de Receitas Culinárias**.

## Estrutura

- `migrations/`:
  - `0001_bootstrap_schema.js`: Criação das coleções (`categories`, `techniques`, `recipes`, `favorites`, `collections`, `collection_recipes`, `selected_recipes`), seus campos, regras de acesso (RLS) e índices únicos/secundários de forma idempotente.
  - `0002_seed_initial_data.js`: Carga dos dados iniciais reais (usuário `certosergio@gmail.com`, 10 categorias, 11 técnicas, 16 receitas completas, coleção "Para imprimir", 5 receitas na coleção e 5 receitas selecionadas). Idempotente.
- `hooks/`:
  - `share_collection.js`: Rota pública `GET /api/share/:token` para compartilhamento de coleções sem exigir autenticação.

## Configuração de SMTP (Recuperação de Senha)

A funcionalidade de redefinição de senha (`/recuperar-senha` e `/redefinir-senha`) depende do envio de e-mails transacionais do PocketBase:
- No painel admin (`http://localhost:8090/_/`), acesse **Settings > Mail settings**.
- Habilite **Use custom SMTP server**. Em ambiente de teste local, você pode subir o Mailpit (`localhost:1025`) para captura de e-mails em sandbox.
- Se o servidor não tiver SMTP configurado, a chamada de redefinição pode retornar erro de envio. Nesse cenário, o administrador pode trocar a senha do usuário diretamente pela listagem da coleção `users` no painel.

---

## Ritual de Execução Local

### 1. Baixar as atualizações
```bash
git pull
```

### 2. Baixar o binário do PocketBase (se ainda não baixado)
Execute na raiz do projeto:
```bash
bash scripts/setup-local.sh
```
O script baixa o binário compatível com seu SO para a pasta `pb/` e ajusta seu `.env` para `VITE_POCKETBASE_URL=http://localhost:8090`.

### 3. Iniciar o servidor PocketBase
Em um terminal dedicado na raiz do projeto:
```bash
./pb/pocketbase serve --migrationsDir=server/migrations --hooksDir=server/hooks
```

### 4. Iniciar o frontend
Em outro terminal:
```bash
npm run dev
```

---

## Credenciais do Seed
- **Email:** `certosergio@gmail.com`
- **Senha:** `Skip@Pass`
