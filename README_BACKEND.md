# 🚀 AUTVISION Backend

Backend modular e seguro para o sistema AUTVISION AI, construído com **TypeScript** e **Fastify**.

## 🏗️ Arquitetura

```
/backend-autvision/
├── src/
│   ├── routes/           # Rotas da API
│   │   ├── command.ts    # Comandos e execuções
│   │   ├── llm.ts        # LLMs com fallback
│   │   ├── ovos.ts       # TTS/STT via OVOS
│   │   ├── n8n.ts        # Automações N8N
│   │   ├── logs.ts       # Logs e monitoramento
│   │   └── config.ts     # Configurações
│   ├── plugins/          # Plugins Fastify
│   │   └── supabaseClient.ts
│   ├── utils/            # Utilitários
│   │   └── openRouter.ts # Cliente OpenRouter
│   └── index.ts          # Servidor principal
├── Dockerfile            # Container Docker
├── .env.server          # Configurações
└── README_BACKEND.md    # Esta documentação
```

## 🔐 Segurança

- **API Key**: Proteção via header `x-api-key`
- **Rate Limiting**: 100 req/min por IP
- **CORS**: Configurado para domínios AUTVISION
- **Helmet**: Headers de segurança
- **Validação**: Zod em todas as rotas

## 🛣️ Rotas Disponíveis

### 📝 Comandos (`/command`)
- `POST /command/execute` - Executa comando via agente
- `GET /command/history/:agentId` - Histórico de comandos

### 🧠 LLM (`/llm`)
- `POST /llm/ask` - Consulta LLM com fallback robusto
- `POST /llm/ask-specific` - Consulta modelo específico
- `GET /llm/stats` - Estatísticas de uso

### 🔄 N8N (`/n8n`)
- `POST /n8n/trigger` - Dispara workflow
- `GET /n8n/workflows` - Lista workflows
- `GET /n8n/executions/:workflowId` - Histórico de execuções

### 🎙️ OVOS (`/ovos`)
- `POST /ovos/speak` - Text-to-Speech
- `POST /ovos/listen` - Speech-to-Text
- `GET /ovos/status` - Status do OVOS
- `GET /ovos/interactions` - Histórico de interações

### 📊 Logs (`/logs`)
- `GET /logs/mcp` - Logs de comandos MCP
- `GET /logs/llm` - Logs de LLM
- `GET /logs/n8n` - Logs de N8N
- `GET /logs/ovos` - Logs de OVOS
- `GET /logs/dashboard` - Dashboard geral

### ⚙️ Configuração (`/config`)
- `GET /config/llms` - Lista LLMs disponíveis
- `PUT /config/llms/:id` - Atualiza config LLM
- `GET /config/agents` - Lista agentes
- `GET /config/system` - Configurações do sistema
- `GET /config/health` - Health check de serviços

## 🚀 Como Executar

### 📋 Pré-requisitos

1. **Node.js 20+**
2. **Docker** (para OVOS e N8N)
3. **Supabase** (já configurado)
4. **OpenRouter** (chaves opcionais)

### 🔧 Configuração

1. **Clone e instale dependências:**
   ```bash
   cd backend-autvision
   npm install
   ```

2. **Configure o arquivo `.env.server`:**
   ```bash
   # Copie .env.server e configure as chaves reais
   cp .env.server .env.server.local
   
   # Edite as configurações:
   # - API_KEY (crie uma chave segura)
   # - Chaves OpenRouter (se quiser IA real)
   # - URLs do N8N e OVOS (se estiverem rodando)
   ```

### 🏃‍♂️ Executar em Desenvolvimento

```bash
# Modo desenvolvimento (com hot reload)
npm run dev
```

### 🏭 Executar em Produção

```bash
# Build da aplicação
npm run build

# Inicia em produção
npm start
```

### 🐳 Docker

```bash
# Build da imagem
npm run docker:build

# Executar container
npm run docker:run

# Ou usar docker-compose (recomendado)
docker-compose up autvision-backend
```

## 🔗 Integração com Frontend

O backend está pronto para ser consumido pelo frontend AUTVISION:

```javascript
// Exemplo de uso no frontend
const response = await fetch('http://localhost:3001/llm/ask', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'sua_api_key_aqui'
  },
  body: JSON.stringify({
    prompt: 'Como você está?',
    agentId: 'uuid-do-agente'
  })
});

const data = await response.json();
console.log(data.data.response); // Resposta da LLM
```

## 🧠 Sistema de Fallback LLM

O backend implementa um sistema robusto de fallback que:

1. **Tenta todos os modelos em ordem de prioridade**
2. **Nunca deixa o usuário sem resposta**
3. **Registra tentativas e erros**
4. **Otimiza performance com base no histórico**

### Modelos Configurados:
- 🦙 **LLaMA 3.3 8B** (rápido e eficiente)
- 🧠 **DeepSeek R1** (raciocínio avançado)
- 🌐 **Qwen 3** (multilíngue)
- 💻 **DevStral** (desenvolvimento)
- 🔢 **DeepSeek Prover** (matemática)
- 🚀 **LLaMA 4** (experimental)

## 📊 Monitoramento

O backend oferece logs detalhados e métricas:

- **Logs estruturados** (JSON em produção)
- **Métricas de performance** por rota
- **Health checks** automáticos
- **Dashboard de estatísticas**

## 🔧 Variáveis de Ambiente

```bash
# Servidor
PORT=3001
NODE_ENV=production
API_KEY=sua_chave_segura_aqui

# Supabase (mesmas credenciais do frontend)
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# OpenRouter (uma chave por modelo)
LLM_LLAMA3_8B_KEY=sk-or-v1-...
LLM_DEEPSEEK_R1_KEY=sk-or-v1-...
# ... outras chaves

# Serviços externos
N8N_API_URL=http://localhost:5678
OVOS_API_URL=http://localhost:8181
```

## 🚨 Troubleshooting

### Backend não inicia
- Verifique se a porta 3001 está livre
- Confirme as credenciais do Supabase
- Verifique logs de erro

### LLM retorna erro
- Confirme as chaves OpenRouter
- Verifique connectivity com OpenRouter
- Veja logs detalhados em `/logs/llm`

### Serviços externos não respondem
- Confirme se N8N está rodando na porta 5678
- Confirme se OVOS está rodando na porta 8181
- Use `/config/health` para diagnóstico

## 🤝 Contribuição

1. Fork do projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📝 Licença

MIT License - veja arquivo LICENSE para detalhes.

---

**🎯 Backend AUTVISION - Modular, Seguro e Escalável** 🚀
