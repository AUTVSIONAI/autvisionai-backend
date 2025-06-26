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
      
      // Busca missões no Supabase
      let query = fastify.supabase.from('missions').select('*');
      
      if (created_by) {
        query = query.eq('created_by', created_by);
      }
      
      const { data: missions, error } = await query.order('created_at', { ascending: false });

      if (error) {
        fastify.log.error('Erro ao buscar missões:', error);
        // Retorna array vazio se não conseguir buscar
        return reply.send({
          success: true,
          data: []
        });
      }

      return reply.send({
        success: true,
        data: missions || []
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
      
      const { data, error } = await fastify.supabase
        .from('missions')
        .insert({
          ...missionData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        fastify.log.error('Erro ao criar missão:', error);
        return reply.code(500).send({
          success: false,
          error: 'Erro ao criar missão',
          code: 'CREATE_ERROR'
        });
      }

      return reply.send({
        success: true,
        data
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

      const { data, error } = await fastify.supabase
        .from('missions')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        fastify.log.error('Erro ao atualizar missão:', error);
        return reply.code(500).send({
          success: false,
          error: 'Erro ao atualizar missão',
          code: 'UPDATE_ERROR'
        });
      }

      return reply.send({
        success: true,
        data
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

  /**
   * 🔍 GET /missions/debug
   * Lista TODAS as missões (para debug - bypass RLS)
   */
  fastify.get('/debug', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Busca TODAS as missões no Supabase usando rpc para bypass RLS
      const { data: missions, error } = await fastify.supabase
        .rpc('get_all_missions_debug');

      if (error) {
        fastify.log.error('Erro ao buscar TODAS as missões:', error);
        // Tenta query direta se RPC falhar
        const { data: directMissions, error: directError } = await fastify.supabase
          .from('missions')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (directError) {
          return reply.code(500).send({
            success: false,
            error: directError.message,
            code: 'DATABASE_ERROR'
          });
        }
        
        return reply.send({
          success: true,
          data: directMissions || [],
          total: directMissions?.length || 0,
          method: 'direct_query'
        });
      }

      return reply.send({
        success: true,
        data: missions || [],
        total: missions?.length || 0,
        method: 'rpc_call'
      });

    } catch (error) {
      fastify.log.error('Erro na rota /missions/debug:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

}
