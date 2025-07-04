import Fastify from 'fastify';
import cors from '@fastify/cors';

const fastify = Fastify({ logger: true });

// CORS básico
fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

// Endpoint de teste super básico
fastify.get('/ping', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

fastify.get('/health', async (request, reply) => {
  return { 
    status: 'healthy', 
    uptime: process.uptime(),
    env: process.env.NODE_ENV
  };
});

fastify.get('/config/health', async (request, reply) => {
  return { 
    status: 'ok', 
    backend: { status: 'healthy' },
    timestamp: new Date().toISOString()
  };
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001');
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
