import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { OpenRouterService } from '../utils/openRouter.js';

const askLLMSchema = z.object({
  prompt: z.string().min(1, 'Prompt não pode estar vazio'),
  systemPrompt: z.string().optional(),
  agentId: z.string().uuid('ID do agente deve ser um UUID válido').optional(),
  context: z.object({
    conversationId: z.string().optional(),
    userId: z.string().optional(),
    metadata: z.record(z.any()).optional()
  }).optional()
});

const invokeLLMSchema = z.object({
  prompt: z.string().min(1, 'Prompt não pode estar vazio'),
  options: z.object({
    systemPrompt: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).max(4000).optional(),
    modelKey: z.string().optional()
  }).optional(),
  context: z.object({
    source: z.string().optional(),
    timestamp: z.string().optional()
  }).optional()
});

type AskLLMBody = z.infer<typeof askLLMSchema>;
type InvokeLLMBody = z.infer<typeof invokeLLMSchema>;

export default async function llmRoutes(fastify: FastifyInstance) {
  const openRouter = new OpenRouterService();
  /**
   * 🧠 POST /llm/ask
   * Chama a LLM principal com sistema de fallback robusto
   */
  fastify.post<{
    Body: AskLLMBody;
  }>('/ask', async (request: FastifyRequest<{Body: AskLLMBody}>, reply: FastifyReply) => {
    try {
      // Validação do body
      const { prompt, systemPrompt, agentId, context } = askLLMSchema.parse(request.body);

      fastify.log.info(`🧠 Nova consulta LLM: "${prompt.substring(0, 100)}..."`);

      // Busca configurações do agente se fornecido
      let agentConfig = null;
      if (agentId) {
        const { data: agent } = await fastify.supabase
          .from('agents')
          .select('name, config')
          .eq('id', agentId)
          .single();
        
        agentConfig = agent;
      }

      // Monta o system prompt final
      const finalSystemPrompt = agentConfig?.config?.systemPrompt || systemPrompt || 
        'Você é o AUTVISION, um assistente de IA avançado. Responda de forma útil e precisa.';

      // Chama o sistema de fallback
      const result = await openRouter.askWithFallback(prompt, finalSystemPrompt);

      // Grava a consulta no log
      await fastify.supabase
        .from('llm_interactions')
        .insert({
          prompt: prompt.substring(0, 1000), // Limita o tamanho
          response: result.response.substring(0, 2000),
          model_used: result.modelUsed,
          agent_id: agentId,
          tokens_used: result.tokensUsed,
          attempt_count: result.attemptCount,
          context,
          created_at: new Date().toISOString()
        });

      fastify.log.info(`✅ LLM respondeu via ${result.modelUsed} (${result.attemptCount} tentativas)`);

      return reply.send({
        success: true,
        data: {
          response: result.response,
          modelUsed: result.modelUsed,
          attemptCount: result.attemptCount,
          tokensUsed: result.tokensUsed,
          agent: agentConfig?.name || 'Sistema',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      fastify.log.error('Erro na rota /llm/ask:', error);
      
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Dados inválidos',
          details: error.errors,
          code: 'VALIDATION_ERROR'
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🔥 POST /llm/invoke
   * Endpoint principal para invocar LLMs com compatibilidade frontend
   */
  fastify.post<{
    Body: InvokeLLMBody;
  }>('/invoke', async (request: FastifyRequest<{Body: InvokeLLMBody}>, reply: FastifyReply) => {
    try {
      // Validação do body
      const { prompt, options = {}, context } = invokeLLMSchema.parse(request.body);

      fastify.log.info(`🔥 Nova invocação LLM: "${prompt.substring(0, 100)}..."`);

      const startTime = Date.now();

      // Usar system prompt das opções ou padrão
      const finalSystemPrompt = options.systemPrompt || 
        'Você é o AUTVISION, um assistente de IA avançado. Responda de forma útil e precisa.';

      // Chamar o sistema de fallback do OpenRouter
      const result = await openRouter.askWithFallback(prompt, finalSystemPrompt, {
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        modelKey: options.modelKey
      });

      const processingTime = Date.now() - startTime;

      // Gravar log na tabela llm_requests
      await fastify.supabase
        .from('llm_requests')
        .insert({
          model_key: result.modelUsed,
          model_name: result.modelUsed,
          prompt: prompt.substring(0, 1000),
          response: result.response.substring(0, 2000),
          status: 'completed',
          tokens_used: result.tokensUsed || 0,
          response_time: processingTime,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      fastify.log.info(`✅ LLM invoke respondeu via ${result.modelUsed} (${processingTime}ms)`);

      return reply.send({
        success: true,
        data: {
          content: result.response,
          model: result.modelUsed,
          modelKey: result.modelUsed,
          processing_time: processingTime,
          usage: {
            total_tokens: result.tokensUsed || 0,
            prompt_tokens: 0,
            completion_tokens: result.tokensUsed || 0
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      fastify.log.error('Erro na rota /llm/invoke:', error);
      
      const processingTime = Date.now() - Date.now();
      
      // Gravar erro no log
      try {
        await fastify.supabase
          .from('llm_requests')
          .insert({
            model_key: 'unknown',
            model_name: 'unknown',
            prompt: request.body?.prompt?.substring(0, 1000) || '',
            error_message: error.message,
            status: 'failed',
            response_time: processingTime,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      } catch (logError) {
        fastify.log.error('Erro ao gravar log de erro:', logError);
      }
      
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Dados inválidos',
          details: error.errors,
          code: 'VALIDATION_ERROR'
        });
      }

      return reply.code(500).send({
        success: false,
        error: error.message || 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🎯 POST /llm/ask-specific
   * Chama um modelo específico (sem fallback)
   */
  fastify.post<{
    Body: AskLLMBody & { modelName: string };
  }>('/ask-specific', async (request, reply) => {
    try {
      const { prompt, systemPrompt, modelName } = request.body;

      if (!modelName) {
        return reply.code(400).send({
          success: false,
          error: 'Nome do modelo é obrigatório',
          code: 'MODEL_NAME_REQUIRED'
        });
      }

      // Aqui você implementaria a chamada para um modelo específico
      // Por agora, usa o sistema de fallback
      const result = await openRouter.askWithFallback(prompt, systemPrompt);

      return reply.send({
        success: true,
        data: result
      });

    } catch (error: any) {
      fastify.log.error('Erro na rota /llm/ask-specific:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 📊 GET /llm/stats
   * Retorna estatísticas de uso das LLMs
   */
  fastify.get('/stats', async (request, reply) => {
    try {
      // Busca estatísticas dos últimos 7 dias
      const { data: stats, error } = await fastify.supabase
        .from('llm_interactions')
        .select('model_used, tokens_used, attempt_count, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        return reply.code(500).send({
          success: false,
          error: 'Erro ao buscar estatísticas',
          code: 'DATABASE_ERROR'
        });
      }

      // Processa estatísticas
      const modelStats = stats?.reduce((acc: any, item: any) => {
        if (!acc[item.model_used]) {
          acc[item.model_used] = { count: 0, totalTokens: 0, totalAttempts: 0 };
        }
        acc[item.model_used].count++;
        acc[item.model_used].totalTokens += item.tokens_used || 0;
        acc[item.model_used].totalAttempts += item.attempt_count || 1;
        return acc;
      }, {});

      return reply.send({
        success: true,
        data: {
          period: '7 dias',
          totalInteractions: stats?.length || 0,
          modelStats: modelStats || {},
          availableModels: openRouter.getAvailableModels()
        }
      });

    } catch (error) {
      fastify.log.error('Erro na rota /llm/stats:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });
}
