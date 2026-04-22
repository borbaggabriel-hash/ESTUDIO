# Hub Studio

Plataforma de dublagem colaborativa em tempo real com sincronização de vídeo, gravação de áudio e gestão de produções.

## 🚀 Features

- **Gravação de Áudio**: Captura de takes com visualização de forma de onda
- **Sincronização em Tempo Real**: WebSocket para colaboração multi-usuário
- **Gestão de Produções**: Criação e gerenciamento de sessões de dublagem
- **Controle de Permissões**: Sistema de roles (Admin, Director, Actor)
- **Loop de Vídeo**: Seleção customizada de trechos para repetição
- **Aprovação de Takes**: Workflow de revisão e aprovação
- **Storage Supabase**: Upload e armazenamento de arquivos de áudio

## 📋 Pré-requisitos

- Node.js 20+
- PostgreSQL 14+
- Conta Supabase (para storage de arquivos)

## 🛠️ Setup Local

### 1. Clone o repositório
```bash
git clone <repo-url>
cd SITE-HUB-STUDIO
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure variáveis de ambiente
```bash
cp .env.example .env
```

Edite `.env` com suas credenciais:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hubstudio

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Session (gere com: openssl rand -base64 32)
SESSION_SECRET=your-random-secret-here

# Admin
ADMIN_EMAILS=admin@example.com

# Environment
NODE_ENV=development
PORT=5002
```

### 4. Configure o banco de dados
```bash
# Crie o banco de dados
createdb hubstudio

# Rode as migrations
npm run db:push
```

### 5. Inicie o servidor de desenvolvimento
```bash
npm run dev
```

Acesse: `http://localhost:5002`

## 🐳 Docker

### Build e run com Docker Compose
```bash
docker-compose up --build
```

### Build manual
```bash
docker build -t hub-studio .
docker run -p 5002:5002 --env-file .env hub-studio
```

## 📦 Build para Produção

```bash
npm run build
npm start
```

## 🧪 Testes

```bash
npm test
```

## 🔒 Segurança

### Variáveis de Ambiente Obrigatórias em Produção

- `SESSION_SECRET`: **NUNCA** use o valor padrão em produção
- `DATABASE_URL`: Credenciais do PostgreSQL
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço do Supabase
- `CORS_ORIGIN`: Domínio permitido (ex: `https://yourdomain.com`)

### Rate Limiting

- Login: 5 tentativas / 15 minutos
- Uploads: 10 arquivos / minuto
- API geral: 300 requisições / 15 minutos

### Validação de Uploads

- **Áudio**: WAV, MP3, WebM, OGG (máx 50MB)
- **Vídeo**: MP4, WebM, MOV, AVI (máx 100MB)

## 📊 Monitoramento

### Logs Estruturados (Pino)
```bash
# Development: pretty-printed
# Production: JSON para agregação

# Nível de log (default: info)
LOG_LEVEL=debug npm run dev
```

### Error Tracking (Sentry)
```env
SENTRY_DSN=https://your-sentry-dsn
```

### Health Check
```bash
curl http://localhost:5002/api/health
```

## 🏗️ Arquitetura

```
├── client/          # React SPA (Vite)
│   ├── src/
│   │   ├── studio/  # Recording Room UI
│   │   └── lib/     # Audio engine, utils
├── server/          # Express API + WebSocket
│   ├── routes.ts    # REST endpoints
│   ├── video-sync.ts # WebSocket sync
│   └── lib/         # Logger, Supabase, utils
├── migrations/      # SQL migrations
└── public/          # Static assets + uploads
```

## 🔧 Scripts Disponíveis

```bash
npm run dev          # Dev server (Vite HMR)
npm run build        # Build client + server
npm start            # Production server
npm test             # Run tests
npm run db:push      # Apply database migrations
npm run check        # TypeScript type check
```

## 📝 Licença

MIT

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'Add nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📞 Suporte

Para problemas ou dúvidas, abra uma issue no GitHub.
