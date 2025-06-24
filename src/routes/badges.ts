/**
 * 🏆 BADGES ROUTES
 * Rotas para gerenciamento de badges/conquistas
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface BadgeQuery {
  created_by?: string;
}

export default async function badgesRoutes(fastify: FastifyInstance) {
  
  /**
   * 📋 GET /badges
   * Lista badges do usuário
   */
  fastify.get<{
    Querystring: BadgeQuery
  }>('/', async (request: FastifyRequest<{Querystring: BadgeQuery}>, reply: FastifyReply) => {
    try {
      const { created_by } = request.query;
      
      // Retorna badges mock por enquanto
      const mockBadges = [
        {
          id: 1,
          name: "Primeiro Passo",
          description: "Completou o primeiro tutorial",
          icon: "🎯",
          earned: false,
          earned_at: null,
          created_by: created_by || 'demo'
        },
        {
          id: 2,
          name: "Conversador",
          description: "Teve sua primeira conversa com o Vision",
          icon: "💬",
          earned: false,
          earned_at: null,
          created_by: created_by || 'demo'
        },
        {
          id: 3,
          name: "Explorador",
          description: "Visitou todas as seções da plataforma",
          icon: "🗺️",
          earned: false,
          earned_at: null,
          created_by: created_by || 'demo'
        }
      ];

      return reply.send({
        success: true,
        data: mockBadges
      });

    } catch (error) {
      fastify.log.error('Erro na rota /badges:', error);
      return reply.send({
        success: true,
        data: []
      });
    }
  });

  /**
   * 📝 POST /badges
   * Cria novo badge
   */
  fastify.post('/', async (request, reply) => {
    try {
      const badgeData = request.body as any;
      
      const mockBadge = {
        id: Date.now(),
        ...badgeData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return reply.send({
        success: true,
        data: mockBadge
      });

    } catch (error) {
      fastify.log.error('Erro na criação de badge:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🔄 PUT /badges/:id
   * Atualiza badge existente (geralmente para marcar como earned)
   */
  fastify.put<{
    Params: { id: string }
  }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body as any;

      const mockBadge = {
        id: parseInt(id),
        ...updateData,
        updated_at: new Date().toISOString()
      };

      return reply.send({
        success: true,
        data: mockBadge
      });

    } catch (error) {
      fastify.log.error('Erro na atualização de badge:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

}
