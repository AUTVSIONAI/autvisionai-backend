/**
 * 🚀 ROTAS DE USUÁRIOS - AUTVISION BACKEND
 */

import { FastifyInstance } from 'fastify';

export default async function usersRoutes(fastify: FastifyInstance) {
  
  // GET /users/me - Obter dados do usuário atual
  fastify.get('/me', async (request, reply) => {
    try {
      // Verificar se há um usuário autenticado (mock por enquanto)
      const user = {
        id: 'user_123',
        email: 'user@example.com',
        full_name: 'Usuário Teste',
        role: 'user',
        plan_id: 'starter',
        tokens: 100,
        created_at: new Date().toISOString()
      };

      return {
        success: true,
        data: user
      };
    } catch (error) {
      fastify.log.error('Erro ao buscar usuário:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  });

  // GET /users - Listar usuários (apenas admin)
  fastify.get('/', async (request, reply) => {
    try {
      const users = [
        {
          id: 'user_123',
          email: 'user@example.com',
          full_name: 'Usuário Teste',
          role: 'user',
          plan_id: 'starter',
          tokens: 100,
          created_at: new Date().toISOString()
        }
      ];

      return {
        success: true,
        data: users
      };
    } catch (error) {
      fastify.log.error('Erro ao listar usuários:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  });
}
