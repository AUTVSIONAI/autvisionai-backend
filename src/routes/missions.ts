/**
 * 🎯 MISSIONS ROUTES
 * Rotas para gerenciamento de missões
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface MissionQuery {
  created_by?: string;
}

export default async function missionsRoutes(fastify: FastifyInstance) {
  
  /**
   * 📋 GET /missions
   * Lista missões do usuário
   */
  fastify.get<{
    Querystring: MissionQuery
  }>('/', async (request: FastifyRequest<{Querystring: MissionQuery}>, reply: FastifyReply) => {
    try {
      const { created_by } = request.query;
      
      // Retorna missões mock por enquanto
      const mockMissions = [
        {
          id: 1,
          title: "Primeira Conversa",
          description: "Converse com o Vision Companion",
          progress: 0,
          total: 1,
          completed: false,
          created_by: created_by || 'demo'
        },
        {
          id: 2,
          title: "Explore os Agentes",
          description: "Visite a página de Agentes",
          progress: 0,
          total: 1,
          completed: false,
          created_by: created_by || 'demo'
        }
      ];

      return reply.send({
        success: true,
        data: mockMissions
      });

    } catch (error) {
      fastify.log.error('Erro na rota /missions:', error);
      return reply.send({
        success: true,
        data: []
      });
    }
  });

  /**
   * 📝 POST /missions
   * Cria nova missão
   */
  fastify.post('/', async (request, reply) => {
    try {
      const missionData = request.body as any;
      
      const mockMission = {
        id: Date.now(),
        ...missionData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      return reply.send({
        success: true,
        data: mockMission
      });

    } catch (error) {
      fastify.log.error('Erro na criação de missão:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🔄 PUT /missions/:id
   * Atualiza missão existente
   */
  fastify.put<{
    Params: { id: string }
  }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body as any;

      const mockMission = {
        id: parseInt(id),
        ...updateData,
        updated_at: new Date().toISOString()
      };

      return reply.send({
        success: true,
        data: mockMission
      });

    } catch (error) {
      fastify.log.error('Erro na atualização de missão:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

}
