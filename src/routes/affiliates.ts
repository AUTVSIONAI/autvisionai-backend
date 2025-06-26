/**
 * 🚀 ROTAS DE AFILIADOS - AUTVISION BACKEND
 */

import { FastifyInstance } from 'fastify';

export default async function affiliatesRoutes(fastify: FastifyInstance) {
  
  // GET /affiliates - Listar afiliados
  fastify.get('/', async (request, reply) => {
    try {
      const affiliates = [
        {
          id: 'aff_001',
          name: 'Afiliado Demo',
          email: 'afiliado@example.com',
          commission_rate: 0.15,
          total_sales: 1250.00,
          total_commission: 187.50,
          status: 'active',
          created_at: new Date().toISOString()
        }
      ];

      return {
        success: true,
        data: affiliates
      };
    } catch (error) {
      fastify.log.error('Erro ao listar afiliados:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  });
}
