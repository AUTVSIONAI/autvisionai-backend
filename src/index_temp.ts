import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

const fastify = Fastify({
  logger: true
});

// Configurar CORS
fastify.register(cors, {
  origin: [
    'http://localhost:3002',
    'http://localhost:3000',
    'http://localhost:5173',
    'https://autvisionai.vercel.app',
    'https://autvisionai.com'
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
  ]
});

// Rota raiz
fastify.get('/', async (request, reply) => {
  return {
    success: true,
    service: 'AUTVISION Backend',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  };
});

// Health check
fastify.get('/health', async (request, reply) => {
  return {
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };
});

// Rota config/health
fastify.get('/config/health', async (request, reply) => {
  return {
    success: true,
    status: 'healthy',
    backend: 'running',
    openvoice: 'available',
    timestamp: new Date().toISOString()
  };
});

// Rota users
fastify.get('/users', async (request, reply) => {
  return {
    success: true,
    users: [],
    message: 'Endpoint users funcionando'
  };
});

// Rota agents
fastify.get('/agents', async (request, reply) => {
  return {
    success: true,
    agents: [],
    message: 'Endpoint agents funcionando'
  };
});

// Iniciar servidor
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3004');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Backend rodando na porta ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
