/**
 * 🤖 AGENTS ROUTES - CRUD COMPLETO PARA PAINEL ADMIN
 * Rotas para gerenciamento de agentes conectadas ao Supabase
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface AgentQuery {
  type?: string;
  is_active?: boolean;
  plan_required?: string;
}

interface AgentBody {
  name: string;
  type: string;
  description?: string;
  capabilities?: string[];
  plan_required?: string;
  is_active?: boolean;
  icon?: string;
  image?: string;
  image_url?: string;
  prompt?: string;
  color?: string;
}

export default async function agentsRoutes(fastify: FastifyInstance) {
  
  /**
   * 📋 GET /agents
   * Lista todos os agentes ou filtra por parâmetros
   */
  fastify.get<{
    Querystring: AgentQuery
  }>('/', async (request: FastifyRequest<{Querystring: AgentQuery}>, reply: FastifyReply) => {
    try {
      const { type, is_active, plan_required } = request.query;
      
      // Query base
      let query = fastify.supabase.from('agents').select('*');
      
      // Aplicar filtros se fornecidos
      if (type) query = query.eq('type', type);
      if (is_active !== undefined) query = query.eq('is_active', is_active);
      if (plan_required) query = query.eq('plan_required', plan_required);
      
      const { data: agents, error } = await query.order('created_at', { ascending: false });

      if (error) {
        fastify.log.error('Erro ao buscar agentes:', error);
        return reply.code(500).send({
          success: false,
          error: 'Erro ao buscar agentes',
          code: 'DATABASE_ERROR'
        });
      }

      return reply.send({
        success: true,
        data: agents || []
      });

    } catch (error) {
      fastify.log.error('Erro na rota /agents:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 📝 POST /agents
   * Cria novo agente
   */
  fastify.post<{
    Body: AgentBody
  }>('/', async (request: FastifyRequest<{Body: AgentBody}>, reply: FastifyReply) => {
    try {
      const agentData = request.body;
      
      const { data, error } = await fastify.supabase
        .from('agents')
        .insert({
          ...agentData,
          capabilities: agentData.capabilities || [],
          is_active: agentData.is_active !== false,
          plan_required: agentData.plan_required || 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        fastify.log.error('Erro ao criar agente:', error);
        fastify.log.error('Dados enviados:', agentData);
        return reply.code(500).send({
          success: false,
          error: 'Erro ao criar agente',
          details: error.message,
          code: 'CREATE_ERROR'
        });
      }

      return reply.send({
        success: true,
        data
      });

    } catch (error) {
      fastify.log.error('Erro na criação de agente:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🔄 PUT /agents/:id
   * Atualiza agente existente
   */
  fastify.put<{
    Params: { id: string },
    Body: Partial<AgentBody>
  }>('/:id', async (request: FastifyRequest<{Params: { id: string }, Body: Partial<AgentBody>}>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;
      
      const { data, error } = await fastify.supabase
        .from('agents')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        fastify.log.error('Erro ao atualizar agente:', error);
        return reply.code(500).send({
          success: false,
          error: 'Erro ao atualizar agente',
          code: 'UPDATE_ERROR'
        });
      }

      return reply.send({
        success: true,
        data
      });

    } catch (error) {
      fastify.log.error('Erro na atualização de agente:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🗑️ DELETE /agents/:id
   * Remove agente
   */
  fastify.delete<{
    Params: { id: string }
  }>('/:id', async (request: FastifyRequest<{Params: { id: string }}>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      
      const { error } = await fastify.supabase
        .from('agents')
        .delete()
        .eq('id', id);

      if (error) {
        fastify.log.error('Erro ao deletar agente:', error);
        return reply.code(500).send({
          success: false,
          error: 'Erro ao deletar agente',
          code: 'DELETE_ERROR'
        });
      }

      return reply.send({
        success: true,
        message: 'Agente deletado com sucesso'
      });

    } catch (error) {
      fastify.log.error('Erro na deleção de agente:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🖼️ POST /agents/:id/upload-image
   * Upload de imagem do agente
   */
  fastify.post<{
    Params: { id: string }
  }>('/:id/upload-image', async (request: FastifyRequest<{Params: { id: string }}>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      
      // Por enquanto simulamos upload - implementar upload real depois
      const mockImageUrl = `/assets/images/agents/agent_${id}.png`;
      
      const { data, error } = await fastify.supabase
        .from('agents')
        .update({
          image: mockImageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        fastify.log.error('Erro ao atualizar imagem do agente:', error);
        return reply.code(500).send({
          success: false,
          error: 'Erro ao atualizar imagem',
          code: 'UPLOAD_ERROR'
        });
      }

      return reply.send({
        success: true,
        data,
        message: 'Imagem atualizada com sucesso'
      });

    } catch (error) {
      fastify.log.error('Erro no upload de imagem:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

}
