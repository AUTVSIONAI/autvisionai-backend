# 🚀 AUTVISION BACKEND

Backend modular do AUTVISION AI construído com Fastify + TypeScript, fornecendo APIs robustas para LLMs, automação e comandos de voz.

## 🔧 Tecnologias

- **Fastify** - Framework web rápido e eficiente
- **TypeScript** - Tipagem estática
- **Supabase** - Banco de dados e autenticação
- **OpenRouter** - Gateway para múltiplos LLMs
- **N8N Integration** - Automação de workflows
- **OVOS Integration** - Comandos de voz

## 🚀 Deploy Automático

Este repositório está conectado à Vercel para deploy automático:
- **Push na branch main** → Deploy automático em produção
- **CORS configurado** para domínios AUTVISION
- **Rate limiting** e segurança implementados

## 📡 Endpoints Principais

### Health Check
```
GET /health
```

### LLMs
```
GET /config/llms - Lista modelos disponíveis
POST /llm/chat - Chat com LLMs
```

### N8N
```
GET /n8n/workflows - Lista workflows
POST /n8n/trigger - Executa workflow
```

### OVOS
```
GET /ovos/status - Status do OVOS
POST /ovos/command - Executa comando de voz
```

## 🔐 Autenticação

Todas as rotas (exceto /health) requerem header:
```
x-api-key: autvision_backend_secure_key_2025
```

## 🌐 URLs de Produção

- **Backend**: Auto-deployado via Vercel
- **Frontend**: https://www.autvisionai.com
- **Proxy**: Frontend redireciona `/api/*` para este backend

## ⚙️ Configuração Local

```bash
npm install
npm run build
npm start
```

Servidor roda em: http://localhost:3001

## 🔄 CI/CD

- **Git Push** → **Vercel Build** → **Deploy Automático**
- **TypeScript Build** → **Dist Generation** → **Node.js Runtime**
- **Environment Variables** configuradas na Vercel

---

**🔥 AUTVISION BACKEND - PODER TOTAL DA IA! 🔥**
