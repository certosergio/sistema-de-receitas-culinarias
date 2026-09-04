# Projeto Criado com o Skip

Este projeto foi criado de ponta a ponta com o [Skip](https://goskip.dev).

## 🚀 Stack Tecnológica

- **React 19** - Biblioteca JavaScript para construção de interfaces
- **Vite** - Build tool extremamente rápida
- **TypeScript** - Superset tipado do JavaScript
- **Shadcn UI** - Componentes reutilizáveis e acessíveis
- **Tailwind CSS** - Framework CSS utility-first
- **React Router** - Roteamento para aplicações React
- **React Hook Form** - Gerenciamento de formulários performático
- **Zod** - Validação de schemas TypeScript-first
- **Recharts** - Biblioteca de gráficos para React

## 📋 Pré-requisitos

- Node.js 18+
- npm

## 🔧 Instalação

```bash
npm install
```

## 🏠 Rodando localmente (com PocketBase)

O backend do projeto é um [PocketBase](https://pocketbase.com) provisionado no
Skip Cloud. Para rodar tudo na sua máquina, há um script que baixa o binário do
PocketBase e configura o ambiente automaticamente.

```bash
# 1. Configura o PocketBase local (baixa o binário para pb/, cria pb_data e ajusta .env)
bash scripts/setup-local.sh

# 2. Em um terminal, suba o PocketBase apontando para as migrations e hooks em server/:
./pb/pocketbase serve --migrationsDir=server/migrations --hooksDir=server/hooks

# 3. Em outro terminal, suba o frontend
npm run dev
```

- **App:** http://localhost:5173
- **Admin do PocketBase:** http://localhost:8090/_/ — na primeira execução,
  crie uma conta de superusuário pelo painel se desejar.
- **Usuário pré-semeado no seed:** `certosergio@gmail.com` / senha: `Skip@Pass`
- **`.env`:** para desenvolvimento local, use
  `VITE_POCKETBASE_URL=http://localhost:8090`. O script cuida disso
  automaticamente; para voltar à instância do Skip Cloud, ajuste a variável no
  `.env` conforme necessário.

> As migrations de schema e seed ficam em `server/migrations/` e os hooks em `server/hooks/`.
> Os dados locais ficam em `pb_data/` e o executável em `pb/` (ambos ignorados no `.gitignore`).

### Configuração de Envio de E-mail (SMTP) para Recuperação de Senha

Para testar o fluxo de "Esqueci minha senha" e redefinição de credenciais:
1. Acesse o painel administrativo do PocketBase em `http://localhost:8090/_/` (ou na instância do Cloud).
2. Vá em **Settings > Mail settings**.
3. Ative a opção **Use custom SMTP server** ou utilize uma ferramenta como **Mailpit** (`localhost:1025`) para captura de e-mails em sandbox de desenvolvimento local.
4. Caso o SMTP não esteja configurado, as senhas de usuários podem ser redefinidas manualmente pela interface administrativa do PocketBase em **Collections > users**.

## 💻 Scripts Disponíveis

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm start
# ou
npm run dev
```

Abre a aplicação em modo de desenvolvimento em [http://localhost:5173](http://localhost:5173).

### Build

```bash
# Build para produção
npm run build

# Build para desenvolvimento
npm run build:dev
```

Gera os arquivos otimizados para produção na pasta `dist/`.

### Preview

```bash
# Visualizar build de produção localmente
npm run preview
```

Permite visualizar a build de produção localmente antes do deploy.

### Linting e Formatação

```bash
# Executar linter
npm run lint

# Executar linter e corrigir problemas automaticamente
npm run lint:fix

# Formatar código com Oxfmt
npm run format
```

## 📁 Estrutura do Projeto

```
.
├── src/              # Código fonte da aplicação
├── public/           # Arquivos estáticos
├── dist/             # Build de produção (gerado)
├── node_modules/     # Dependências (gerado)
└── package.json      # Configurações e dependências do projeto
```

## 🎨 Componentes UI

Este template inclui uma biblioteca completa de componentes Shadcn UI baseados em Radix UI:

- Accordion
- Alert Dialog
- Avatar
- Button
- Checkbox
- Dialog
- Dropdown Menu
- Form
- Input
- Label
- Select
- Switch
- Tabs
- Toast
- Tooltip
- E muito mais...

## 📝 Ferramentas de Qualidade de Código

- **TypeScript**: Tipagem estática
- **Oxlint**: Linter extremamente rápido
- **Oxfmt**: Formatação automática de código

## 🔄 Workflow de Desenvolvimento

1. Instale as dependências: `npm install`
2. Inicie o servidor de desenvolvimento: `npm start`
3. Faça suas alterações
4. Verifique o código: `npm run lint`
5. Formate o código: `npm run format`
6. Crie a build: `npm run build`
7. Visualize a build: `npm run preview`

## 📦 Build e Deploy

Para criar uma build otimizada para produção:

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/` e estarão prontos para deploy.
