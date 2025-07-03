import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import { config } from 'dotenv';
import { dirname, join } from 'path';

console.log('🟢 process.cwd():', process.cwd());

// Carrega variáveis de ambiente do arquivo .env no diretório do backend
// Tenta primeiro no diretório atual, depois no diretório pai
const envPaths = [
  join(process.cwd(), '.env'),
  join(process.cwd(), 'autvisionai-backend', '.env'),
  join(__dirname, '..', '.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    config({ path: envPath });
    if (process.env.SUPABASE_URL) {
      console.log('🟢 Variáveis carregadas de:', envPath);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continua tentando outros caminhos
  }
}

if (!envLoaded) {
  console.log('⚠️ Tentando carregar .env padrão...');
  config();
}

// Debug: verificar se as variáveis foram carregadas
console.log('🔍 DEBUG - Variáveis de ambiente:');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Definida' : '❌ Não encontrada');
console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Definida' : '❌ Não encontrada');
console.log('- OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? '✅ Definida' : '❌ Não encontrada');
console.log('- PORT:', process.env.PORT || 'Usando padrão');

// Importar e inicializar LLM Dispatcher APÓS env estar carregado
import { llmDispatcher } from './modules/llm/llmDispatcher';
// Initialize LLM dispatcher after environment is loaded
try {
  llmDispatcher.initialize();
  console.log('✅ LLM Dispatcher inicializado com sucesso');
} catch (error) {
  console.log('⚠️ Erro ao inicializar LLM Dispatcher:', error);
}

// Plugins
import supabasePlugin from './plugins/supabaseClient';

// Rotas
import commandRoutes from './routes/command';
import llmRoutes from './routes/llm';
import n8nRoutes from './routes/n8n';
import ovosRoutes from './routes/ovos';
import logsRoutes from './routes/logs';
import analyticsRoutes from './routes/analytics';
import configRoutes from './routes/config';
import supremoRoutes from './routes/supremo';
import tutorialsRoutes from './routes/tutorials';
import routinesRoutes from './routes/routines';
import missionsRoutes from './routes/missions';
import badgesRoutes from './routes/badges';
import agentsRoutes from './routes/agents';
import voiceDispatcherRoutes from './routes/voice-dispatcher';
import sqlExecutorRoutes from './routes/sql-executor';
// 🔥 NOVAS ROTAS
import usersRoutes from './routes/users';
import plansRoutes from './routes/plans';
import integrationsRoutes from './routes/integrations';
import affiliatesRoutes from './routes/affiliates';
import llmConfigRoutes from './routes/llm-config';
import platformConfigRoutes from './routes/platform-config';
import visionsRoutes from './routes/visions';
import adminRoutes from './routes/admin';

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

  // 🚀 TEMPORÁRIO: Permitir acesso sem API_KEY para testar agentes
  if (process.env.NODE_ENV === 'development') {
    fastify.log.warn('⚠️ MODO DESENVOLVIMENTO - Autenticação desabilitada temporariamente');
    return;
  }

  // Em desenvolvimento, permite bypass da autenticação se API_KEY não estiver configurada
  const expectedApiKey = process.env.API_KEY;
  if (!expectedApiKey && process.env.NODE_ENV === 'development') {
    fastify.log.warn('⚠️ API_KEY não configurada - modo desenvolvimento ativo');
    return;
  }

  const apiKey = request.headers['x-api-key'];

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
      'https://autvisionai.vercel.app',
      'https://autvisionai-backend-five.vercel.app',
      'https://autvisionai-real.vercel.app',
      'http://localhost:3002',
      'http://localhost:3003',
      'http://localhost:5173',
      'http://localhost:5174', 
      'http://localhost:5175',
      'http://localhost:5179',
      'http://localhost:5180',
      'http://localhost:5181',
      'http://localhost:5182',
      'http://localhost:3000',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3003',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:5175',
      'http://127.0.0.1:5179',
      'http://127.0.0.1:5180',
      'http://127.0.0.1:5181',
      'http://127.0.0.1:5182',
      'https://autvision.ai',
      'https://www.autvision.ai',
      'https://autvisionai.com',
      'https://autvisionai-real-kdt1okwaj-maumautremeterra-gmailcoms-projects.vercel.app',
      'https://autvisionai-real-l4qsyx5h9-maumautremeterra-gmailcoms-projects.vercel.app',
      'https://autvisionai-real-qnbo9afel-maumautremeterra-gmailcoms-projects.vercel.app',
      /^https:\/\/autvisionai.*\.vercel\.app$/,
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
      'Access-Control-Allow-Origin'
    ],
    optionsSuccessStatus: 200,
    preflightContinue: false
  });

  // Helmet para headers de segurança
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  });

  // Rate limiting (mais permissivo para desenvolvimento)
  await fastify.register(rateLimit, {
    max: process.env.NODE_ENV === 'production' ? 200 : 1000,
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
  // Plugin para upload de arquivos
  console.log('🔧 Registrando plugin multipart...');
  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB
    }
  });
  console.log('✅ Plugin multipart registrado com sucesso');
  
  console.log('🔧 Registrando plugin Supabase...');
  await fastify.register(supabasePlugin);
  console.log('✅ Plugin Supabase registrado com sucesso');
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
      timestamp: new Date().toISOString(),
      endpoints: {
        commands: '/command/*',
        llm: '/llm/*',
        n8n: '/n8n/*', 
        ovos: '/ovos/*',
        logs: '/logs/*',
        config: '/config/*',
        visionSupremo: '/supremo/*',
        tutorials: '/tutorials/*',
        routines: '/routines/*',
        missions: '/missions/*',
        badges: '/badges/*',
        agents: '/agents/*',
        voiceDispatcher: '/voice-dispatcher/*',
        visions: '/visions/*',
        admin: '/admin/*'
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
  });  // Registro das rotas principais
  await fastify.register(commandRoutes, { prefix: '/command' });
  await fastify.register(llmRoutes, { prefix: '/llm' });
  await fastify.register(n8nRoutes, { prefix: '/n8n' });
  await fastify.register(ovosRoutes, { prefix: '/ovos' });
  await fastify.register(logsRoutes, { prefix: '/logs' });
  await fastify.register(analyticsRoutes, { prefix: '/analytics' });
  await fastify.register(configRoutes, { prefix: '/config' });
  await fastify.register(supremoRoutes, { prefix: '/supremo' });
  await fastify.register(tutorialsRoutes, { prefix: '/tutorials' });
  await fastify.register(routinesRoutes, { prefix: '/routines' });
  await fastify.register(missionsRoutes, { prefix: '/missions' });
  await fastify.register(badgesRoutes, { prefix: '/badges' });
  await fastify.register(agentsRoutes, { prefix: '/agents' });
  await fastify.register(voiceDispatcherRoutes, { prefix: '/voice-dispatcher' });
  await fastify.register(sqlExecutorRoutes, { prefix: '/sql' });
  
  // 🔥 NOVAS ROTAS QUE ESTAVAM FALTANDO
  await fastify.register(usersRoutes, { prefix: '/users' });
  await fastify.register(plansRoutes, { prefix: '/plans' });
  await fastify.register(integrationsRoutes, { prefix: '/integrations' });
  await fastify.register(affiliatesRoutes, { prefix: '/affiliates' });
  await fastify.register(llmConfigRoutes, { prefix: '/llm-config' });
  await fastify.register(platformConfigRoutes, { prefix: '/platform-config' });
  await fastify.register(visionsRoutes, { prefix: '/visions' });
  await fastify.register(adminRoutes, { prefix: '/admin' });
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
