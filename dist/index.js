import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env.server') });
import supabasePlugin from './plugins/supabaseClient.js';
import commandRoutes from './routes/command.js';
import llmRoutes from './routes/llm.js';
import n8nRoutes from './routes/n8n.js';
import ovosRoutes from './routes/ovos.js';
import logsRoutes from './routes/logs.js';
import configRoutes from './routes/config.js';
const fastify = Fastify({
    logger: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
    }
});
fastify.addHook('preHandler', async (request, reply) => {
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
async function setupSecurity() {
    await fastify.register(cors, {
        origin: [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5175',
            'https://autvision.ai',
            /\.autvision\.ai$/
        ],
        credentials: true
    });
    await fastify.register(helmet, {
        contentSecurityPolicy: false
    });
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
async function setupPlugins() {
    await fastify.register(supabasePlugin);
}
async function setupRoutes() {
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
                config: '/config/*'
            }
        };
    });
    fastify.get('/health', async (request, reply) => {
        return {
            success: true,
            status: 'healthy',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };
    });
    await fastify.register(commandRoutes, { prefix: '/command' });
    await fastify.register(llmRoutes, { prefix: '/llm' });
    await fastify.register(n8nRoutes, { prefix: '/n8n' });
    await fastify.register(ovosRoutes, { prefix: '/ovos' });
    await fastify.register(logsRoutes, { prefix: '/logs' });
    await fastify.register(configRoutes, { prefix: '/config' });
}
async function start() {
    try {
        console.log('🔧 Iniciando configuração...');
        console.log('🛡️ Configurando segurança...');
        await setupSecurity();
        console.log('🔌 Configurando plugins...');
        await setupPlugins();
        console.log('🛣️ Configurando rotas...');
        await setupRoutes();
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
    }
    catch (error) {
        console.error('❌ Erro ao iniciar servidor:', error);
        fastify.log.error('❌ Erro ao iniciar servidor:', error);
        process.exit(1);
    }
}
const gracefulShutdown = async (signal) => {
    fastify.log.info(`📴 Recebido sinal ${signal}, encerrando servidor...`);
    try {
        await fastify.close();
        fastify.log.info('✅ Servidor encerrado com sucesso');
        process.exit(0);
    }
    catch (error) {
        fastify.log.error('❌ Erro ao encerrar servidor:', error);
        process.exit(1);
    }
};
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
start();
