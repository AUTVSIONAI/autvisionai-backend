/**
 * 🤖 AGENTS ROUTES - CRUD COMPLETO PARA PAINEL ADMIN
 * Rotas para gerenciamento de agentes conectadas ao Supabase
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface AgentQuery {
  type?: string;
  status?: string;
}

interface AgentBody {
  name: string;
  type: string;
  description?: string;
  capabilities?: any;
  icon?: string;
  color?: string;
  status?: string;
  config?: any;
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
      const { type, status } = request.query;
      
      // Query base - CORRIGIDO: usar schema real da tabela 'agents'
      let query = fastify.supabase.from('agents').select('*');
      
      // Aplicar filtros se fornecidos (usar colunas que realmente existem)
      if (type) query = query.eq('type', type);
      if (status) query = query.eq('status', status);
      
      const { data: agents, error } = await query.order('created_date', { ascending: false });

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
          name: agentData.name,
          type: agentData.type,
          description: agentData.description || '',
          capabilities: agentData.capabilities || null,
          icon: agentData.icon || null,
          color: agentData.color || '#3B82F6',
          status: agentData.status || 'active',
          config: agentData.config || {},
          created_date: new Date().toISOString()
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
   * 📋 GET /agents/:id
   * Busca agente específico por ID
   */
  fastify.get<{
    Params: { id: string }
  }>('/:id', async (request: FastifyRequest<{Params: { id: string }}>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      
      const { data, error } = await fastify.supabase
        .from('agents')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        fastify.log.error('Erro ao buscar agente:', error);
        return reply.code(404).send({
          success: false,
          error: 'Agente não encontrado',
          code: 'AGENT_NOT_FOUND'
        });
      }

      return reply.send({
        success: true,
        data
      });

    } catch (error) {
      fastify.log.error('Erro na busca de agente:', error);
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
          name: updateData.name,
          type: updateData.type,
          description: updateData.description,
          capabilities: updateData.capabilities,
          icon: updateData.icon,
          color: updateData.color,
          status: updateData.status,
          config: updateData.config
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
      fastify.log.info(`🔄 Iniciando upload de imagem para agente: ${id}`);
      
      // Verificar se há arquivo na requisição
      const data = await request.file();
      if (!data) {
        fastify.log.warn('❌ Nenhum arquivo enviado na requisição');
        return reply.code(400).send({
          success: false,
          error: 'Nenhum arquivo enviado',
          code: 'NO_FILE'
        });
      }

      fastify.log.info(`📁 Arquivo recebido: ${data.filename}, tipo: ${data.mimetype}`);

      // Validar tipo de arquivo
      if (!data.mimetype.startsWith('image/')) {
        fastify.log.warn(`❌ Tipo de arquivo inválido: ${data.mimetype}`);
        return reply.code(400).send({
          success: false,
          error: 'Arquivo deve ser uma imagem',
          code: 'INVALID_FILE_TYPE'
        });
      }

      // Converter arquivo para base64 para armazenar no banco
      fastify.log.info('🔄 Convertendo arquivo para base64...');
      const buffer = await data.toBuffer();
      const base64Image = `data:${data.mimetype};base64,${buffer.toString('base64')}`;
      fastify.log.info(`✅ Arquivo convertido para base64 (${buffer.length} bytes)`);
      
      fastify.log.info(`🔄 Atualizando agente ${id} no banco de dados...`);
      const { data: agentData, error } = await fastify.supabase
        .from('agents')
        .update({
          image_url: base64Image
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        fastify.log.error('❌ Erro ao atualizar imagem do agente no Supabase:', error);
        return reply.code(500).send({
          success: false,
          error: 'Erro ao atualizar imagem',
          code: 'UPLOAD_ERROR',
          details: error.message
        });
      }

      fastify.log.info(`✅ Imagem do agente ${id} atualizada com sucesso`);
      return reply.send({
        success: true,
        data: agentData,
        image_url: base64Image,
        message: 'Imagem atualizada com sucesso'
      });

    } catch (error) {
      fastify.log.error('❌ Erro crítico no upload de imagem:', error);
      fastify.log.error('Stack trace:', error.stack);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR',
        details: error.message
      });
    }
  });

}
