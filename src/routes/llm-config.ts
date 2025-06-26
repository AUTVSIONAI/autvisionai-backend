/**
 * 🚀 ROTAS DE CONFIGURAÇÃO LLM - AUTVISION BACKEND
 */

import { FastifyInstance } from 'fastify';

export default async function llmConfigRoutes(fastify: FastifyInstance) {
  
  // GET /llm-config - Obter configurações do LLM
  fastify.get('/', async (request, reply) => {
    try {
      const config = {
        provider: 'openrouter',
        model: 'anthropic/claude-3-haiku',
        api_key: process.env.OPENROUTER_API_KEY ? '***' : null,
        max_tokens: 1000,
        temperature: 0.7,
        system_prompt: 'Você é o AutVision AI, um assistente inteligente.',
        status: 'active'
      };

      return {
        success: true,
        data: config
      };
    } catch (error) {
      fastify.log.error('Erro ao obter config LLM:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  });

  // PUT /llm-config - Atualizar configurações do LLM
  fastify.put('/', async (request, reply) => {
    try {
      const body = request.body as any;
      
      // Simular atualização das configurações
      const updatedConfig = {
        ...body,
        updated_at: new Date().toISOString()
      };

      return {
        success: true,
        message: 'Configurações do LLM atualizadas com sucesso',
        data: updatedConfig
      };
    } catch (error) {
      fastify.log.error('Erro ao atualizar config LLM:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  });
}
