import Fastify from 'fastify';
import cors from '@fastify/cors';

console.log('🚀 Iniciando backend minimal...');

const fastify = Fastify({
  logger: true
});

// CORS BÁSICO
fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
});

// ENDPOINTS BÁSICOS
fastify.get('/ping', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    message: 'Backend funcionando!'
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

fastify.get('/config/health', async (request, reply) => {
  return { 
    success: true,
    status: 'healthy',
    backend: {
      status: 'healthy',
      uptime: process.uptime(),
      version: '1.0.0'
    },
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };
});

// FAVICON
fastify.get('/favicon.ico', async (request, reply) => {
  reply.code(204);
  return;
});

// Iniciar servidor
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
    
    console.log(`🚀 Iniciando servidor em ${host}:${port}...`);
    await fastify.listen({ port, host });
    
    console.log(`✅ Servidor funcionando em http://${host}:${port}`);
  } catch (err) {
    console.error('❌ Erro ao iniciar servidor:', err);
    process.exit(1);
  }
};

start();
