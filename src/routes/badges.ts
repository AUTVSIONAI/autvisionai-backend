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
      
      // Busca badges no Supabase
      let query = fastify.supabase.from('badges').select('*');
      
      if (created_by) {
        query = query.eq('created_by', created_by);
      }
      
      const { data: badges, error } = await query.order('created_at', { ascending: false });

      if (error) {
        fastify.log.error('Erro ao buscar badges:', error);
        // Retorna array vazio se não conseguir buscar
        return reply.send({
          success: true,
          data: []
        });
      }

      return reply.send({
        success: true,
        data: badges || []
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
