/**
 * 🚀 ROTAS DE PLANOS - AUTVISION BACKEND
 */

import { FastifyInstance } from 'fastify';

export default async function plansRoutes(fastify: FastifyInstance) {
  
  // GET /plans - Listar todos os planos
  fastify.get('/', async (request, reply) => {
    try {
      const plans = [
        {
          id: 'starter',
          name: 'Starter',
          description: 'Plano básico para começar',
          price: 0,
          tokens: 100,
          features: ['Dashboard básico', 'Suporte por email'],
          active: true
        },
        {
          id: 'pro',
          name: 'Pro',
          description: 'Plano profissional com mais recursos',
          price: 29.99,
          tokens: 1000,
          features: ['Dashboard avançado', 'Suporte prioritário', 'API access'],
          active: true
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          description: 'Plano empresarial completo',
          price: 99.99,
          tokens: 10000,
          features: ['Recursos completos', 'Suporte 24/7', 'API ilimitada', 'Admin panel'],
          active: true
        }
      ];

      return {
        success: true,
        data: plans
      };
    } catch (error) {
      fastify.log.error('Erro ao listar planos:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  });

  // GET /plans/:id - Obter plano específico
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      const plans = [
        {
          id: 'starter',
          name: 'Starter',
          description: 'Plano básico para começar',
          price: 0,
          tokens: 100,
          features: ['Dashboard básico', 'Suporte por email'],
          active: true
        },
        {
          id: 'pro',
          name: 'Pro',
          description: 'Plano profissional com mais recursos',
          price: 29.99,
          tokens: 1000,
          features: ['Dashboard avançado', 'Suporte prioritário', 'API access'],
          active: true
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          description: 'Plano empresarial completo',
          price: 99.99,
          tokens: 10000,
          features: ['Recursos completos', 'Suporte 24/7', 'API ilimitada', 'Admin panel'],
          active: true
        }
      ];

      const plan = plans.find(p => p.id === id);
      
      if (!plan) {
        return reply.code(404).send({
          success: false,
          error: 'Plano não encontrado'
        });
      }

      return {
        success: true,
        data: plan
      };
    } catch (error) {
      fastify.log.error('Erro ao buscar plano:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  });
}
