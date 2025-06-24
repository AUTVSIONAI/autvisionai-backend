/**
 * 🔄 ROUTINES ROUTES
 * Rotas para gerenciamento de rotinas
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface RoutineQuery {
  created_by?: string;
}

export default async function routinesRoutes(fastify: FastifyInstance) {
  
  /**
   * 📋 GET /routines
   * Lista rotinas do usuário
   */
  fastify.get<{
    Querystring: RoutineQuery
  }>('/', async (request: FastifyRequest<{Querystring: RoutineQuery}>, reply: FastifyReply) => {
    try {
      const { created_by } = request.query;
      
      if (!created_by) {
        return reply.send({
          success: true,
          data: []
        });
      }

      // Busca rotinas no Supabase
      const { data: routines, error } = await fastify.supabase
        .from('routines')
        .select('*')
        .eq('created_by', created_by)
        .order('created_at', { ascending: false });

      if (error) {
        fastify.log.error('Erro ao buscar rotinas:', error);
        // Retorna array vazio se tabela não existir
        return reply.send({
          success: true,
          data: []
        });
      }

      return reply.send({
        success: true,
        data: routines || []
      });

    } catch (error) {
      fastify.log.error('Erro na rota /routines:', error);
      return reply.send({
        success: true,
        data: []
      });
    }
  });

  /**
   * 📝 POST /routines
   * Cria nova rotina
   */
  fastify.post('/', async (request, reply) => {
    try {
      const routineData = request.body as any;
      
      const { data, error } = await fastify.supabase
        .from('routines')
        .insert({
          ...routineData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        fastify.log.error('Erro ao criar rotina:', error);
        return reply.code(500).send({
          success: false,
          error: 'Erro ao criar rotina',
          code: 'CREATE_ERROR'
        });
      }

      return reply.send({
        success: true,
        data
      });

    } catch (error) {
      fastify.log.error('Erro na criação de rotina:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🔄 PUT /routines/:id
   * Atualiza rotina existente
   */
  fastify.put<{
    Params: { id: string }
  }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body as any;

      const { data, error } = await fastify.supabase
        .from('routines')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        fastify.log.error('Erro ao atualizar rotina:', error);
        return reply.code(500).send({
          success: false,
          error: 'Erro ao atualizar rotina',
          code: 'UPDATE_ERROR'
        });
      }

      return reply.send({
        success: true,
        data
      });

    } catch (error) {
      fastify.log.error('Erro na atualização de rotina:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

}
