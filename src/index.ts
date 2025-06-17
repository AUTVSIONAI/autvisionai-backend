import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from 'dotenv';
import { dirname, join } from 'path';

// Para bundle CJS, usar o diretório atual do processo e subir uma pasta
const projectRoot = process.cwd().includes('backend-autvision') ? 
  process.cwd() : 
  join(process.cwd(), 'backend-autvision');

// Carrega variáveis de ambiente do arquivo correto  
config({ path: join(projectRoot, '.env.server') });

// Debug: verificar se as variáveis foram carregadas
console.log('🔍 DEBUG - Variáveis de ambiente:');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Definida' : '❌ Não encontrada');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Definida' : '❌ Não encontrada');
console.log('- OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '✅ Definida' : '❌ Não encontrada');
console.log('- PORT:', process.env.PORT || 'Usando padrão');
console.log('- Arquivo .env.server path:', join(projectRoot, '.env.server'));

// Importar e inicializar LLM Dispatcher APÓS env estar carregado
import { llmDispatcher } from './modules/llm/llmDispatcher.js';
llmDispatcher.initialize();

// Plugins
import supabasePlugin from './plugins/supabaseClient.js';

// Rotas
import commandRoutes from './routes/command.js';
import llmRoutes from './routes/llm.js';
import n8nRoutes from './routes/n8n.js';
import ovosRoutes from './routes/ovos.js';
import logsRoutes from './routes/logs.js';
import configRoutes from './routes/config.js';
import supremoRoutes from './routes/supremo.js';

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
  }
});

/**
 * 🔐 MIDDLEWARE DE AUTENTICAÇÃO
 */
fastify.addHook('preHandler', async (request, reply) => {
  // Pula autenticação para rotas de health check
  if (request.url === '/health' || request.url === '/config/health') {
    return;
  }

  const apiKey = request.headers['x-api-key'];
  const expectedApiKey = process.env.API_KEY;

  if (!expectedApiKey) {
    fastify.log.warn('⚠️ API_KEY não configurada no ambiente');
    return;
  }

  if (!apiKey || apiKey !== expectedApiKey) {
    return reply.code(401).send({
      success: false,
      error: 'API key inválida ou ausente',
      code: 'UNAUTHORIZED'
    });
  }
});

/**
 * 🛡️ CONFIGURAÇÃO DE SEGURANÇA
 */
async function setupSecurity() {
  // CORS - DEVE SER O PRIMEIRO!
  await fastify.register(cors, {
    origin: [
      'https://www.autvisionai.com',
      'https://autvisionai-real.vercel.app',
      'http://localhost:5173',
      'http://localhost:5174', 
      'http://localhost:5175',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      'https://autvision.ai',
      'https://www.autvision.ai',
      'https://autvisionai.com',
      'https://autvisionai-real-kdt1okwaj-maumautremeterra-gmailcoms-projects.vercel.app',
      'https://autvisionai-real-l4qsyx5h9-maumautremeterra-gmailcoms-projects.vercel.app',
      'https://autvisionai-real-qnbo9afel-maumautremeterra-gmailcoms-projects.vercel.app',
      /\.autvision\.ai$/,
      /\.autvisionai\.com$/,
      /\.vercel\.app$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization', 
      'x-api-key',
      'Origin',
      'Accept',
      'access-control-allow-methods',
      'access-control-allow-headers'
    ],
    optionsSuccessStatus: 200,
    preflightContinue: false
  });

  // Helmet para headers de segurança
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  });

  // Rate limiting
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) => ({
      success: false,
      error: 'Muitas requisições. Tente novamente em 1 minuto.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: context.after
    })
  });
}

/**
 * 🔌 REGISTRO DE PLUGINS
 */
async function setupPlugins() {
  await fastify.register(supabasePlugin);
}

/**
 * 🛣️ REGISTRO DE ROTAS
 */
async function setupRoutes() {
  // Rota raiz
  fastify.get('/', async (request, reply) => {
    return {
      success: true,
      service: 'AUTVISION Backend',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),      endpoints: {
        commands: '/command/*',
        llm: '/llm/*',
        n8n: '/n8n/*', 
        ovos: '/ovos/*',
        logs: '/logs/*',
        config: '/config/*',
        visionSupremo: '/supremo/*'
      }
    };
  });

  // Health check público (sem autenticação)
  fastify.get('/health', async (request, reply) => {
    return {
      success: true,
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  });
  // Registro das rotas principais
  await fastify.register(commandRoutes, { prefix: '/command' });
  await fastify.register(llmRoutes, { prefix: '/llm' });
  await fastify.register(n8nRoutes, { prefix: '/n8n' });
  await fastify.register(ovosRoutes, { prefix: '/ovos' });
  await fastify.register(logsRoutes, { prefix: '/logs' });
  await fastify.register(configRoutes, { prefix: '/config' });
  await fastify.register(supremoRoutes, { prefix: '/supremo' });
}

/**
 * 🚀 INICIALIZAÇÃO DO SERVIDOR
 */
async function start() {
  try {
    console.log('🔧 Iniciando configuração...');
    
    // Configuração
    console.log('🛡️ Configurando segurança...');
    await setupSecurity();
    
    console.log('🔌 Configurando plugins...');
    await setupPlugins();
    
    console.log('🛣️ Configurando rotas...');
    await setupRoutes();    // Inicia o servidor
    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

    console.log(`🚀 Iniciando servidor em ${host}:${port}...`);
    await fastify.listen({ port, host });

    fastify.log.info(`
🚀 AUTVISION Backend iniciado com sucesso!

📍 Servidor: http://${host}:${port}
🔐 API Key: ${process.env.API_KEY ? '✅ Configurada' : '❌ Não configurada'}
🗄️ Supabase: ${process.env.SUPABASE_URL ? '✅ Conectado' : '❌ Não configurado'}
🧠 OpenRouter: ${process.env.LLM_LLAMA3_8B_KEY !== 'CONFIGURE_SUA_CHAVE_OPENROUTER_AQUI' ? '✅ Configurado' : '❌ Chaves não configuradas'}
🔄 N8N: ${process.env.N8N_API_URL}
🎙️ OVOS: ${process.env.OVOS_API_URL}

📚 Documentação: http://${host}:${port}/
🏥 Health Check: http://${host}:${port}/health
    `);

  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    fastify.log.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Tratamento de sinais para graceful shutdown
const gracefulShutdown = async (signal: string) => {
  fastify.log.info(`📴 Recebido sinal ${signal}, encerrando servidor...`);
  try {
    await fastify.close();
    fastify.log.info('✅ Servidor encerrado com sucesso');
    process.exit(0);
  } catch (error) {
    fastify.log.error('❌ Erro ao encerrar servidor:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Inicia o servidor
start();
