/**
 * 🎓 TUTORIALS ROUTES
 * Rotas para gerenciamento de tutoriais
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface TutorialQuery {
  created_by?: string;
}

export default async function tutorialsRoutes(fastify: FastifyInstance) {
  
  /**
   * 📋 GET /tutorials
   * Lista tutoriais do usuário
   */
  fastify.get<{
    Querystring: TutorialQuery
  }>('/', async (request: FastifyRequest<{Querystring: TutorialQuery}>, reply: FastifyReply) => {
    try {
      const { created_by } = request.query;
      
      // Busca tutoriais no Supabase
      let query = fastify.supabase.from('tutorials').select('*');
      
      if (created_by) {
        query = query.eq('created_by', created_by);
      }
      
      const { data: tutorials, error } = await query.order('created_at', { ascending: false });

      if (error) {
        fastify.log.error('Erro ao buscar tutoriais:', error);
        // Retorna array vazio se tabela não existir
        return reply.send({
          success: true,
          data: []
        });
      }

      return reply.send({
        success: true,
        data: tutorials || []
      });

    } catch (error) {
      fastify.log.error('Erro na rota /tutorials:', error);
      return reply.send({
        success: true,
        data: []
      });
    }
  });

  /**
   * 📝 POST /tutorials
   * Cria novo tutorial
   */
  fastify.post('/', async (request, reply) => {
    try {
      const tutorialData = request.body as any;
      
      const { data, error } = await fastify.supabase
        .from('tutorials')
        .insert({
          ...tutorialData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        fastify.log.error('Erro ao criar tutorial:', error);
        return reply.code(500).send({
          success: false,
          error: 'Erro ao criar tutorial',
          code: 'CREATE_ERROR'
        });
      }

      return reply.send({
        success: true,
        data
      });

    } catch (error) {
      fastify.log.error('Erro na criação de tutorial:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🔄 PUT /tutorials/:id
   * Atualiza tutorial existente
   */
  fastify.put<{
    Params: { id: string }
  }>('/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body as any;

      const { data, error } = await fastify.supabase
        .from('tutorials')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        fastify.log.error('Erro ao atualizar tutorial:', error);
        return reply.code(500).send({
          success: false,
          error: 'Erro ao atualizar tutorial',
          code: 'UPDATE_ERROR'
        });
      }

      return reply.send({
        success: true,
        data
      });

    } catch (error) {
      fastify.log.error('Erro na atualização de tutorial:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🔍 GET /tutorials/debug
   * Lista TODOS os tutoriais (para debug) 
   */
  fastify.get('/debug', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Busca TODOS os tutoriais no Supabase
      const { data: tutorials, error } = await fastify.supabase
        .from('tutorials')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        fastify.log.error('Erro ao buscar TODOS os tutoriais:', error);
        return reply.code(500).send({
          success: false,
          error: error.message,
          code: 'DATABASE_ERROR'
        });
      }

      return reply.send({
        success: true,
        data: tutorials || [],
        total: tutorials?.length || 0
      });

    } catch (error) {
      fastify.log.error('Erro na rota /tutorials/debug:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

}
