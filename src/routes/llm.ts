import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { OpenRouterService } from '../utils/openRouter.js';
import { llmManager } from '../modules/llm/llmManager.js';
import { llmDispatcher } from '../modules/llm/llmDispatcher.js';

const askLLMSchema = z.object({
  prompt: z.string().min(1, 'Prompt não pode estar vazio'),
  systemPrompt: z.string().optional(),
  agentId: z.string().uuid('ID do agente deve ser um UUID válido').optional().nullable(),
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
      }      // Monta o system prompt final
      const finalSystemPrompt = agentConfig?.config?.systemPrompt || systemPrompt || 
        'Você é o AUTVISION, um assistente de IA avançado. Responda de forma útil e precisa.';

      // � USAR NOVO LLM DISPATCHER MULTI-PROVEDOR COM FALLBACK INTELIGENTE
      const result = await llmDispatcher.dispatch({
        prompt,
        systemMessage: finalSystemPrompt,
        temperature: 0.7,
        maxTokens: 2048
      });      // Grava a consulta no log (OPCIONAL)
      try {
        await fastify.supabase
          .from('llm_interactions')
          .insert({
            prompt: prompt.substring(0, 1000),
            response: result.response.substring(0, 2000),
            model_used: result.modelUsed,
            provider_used: result.provider,
            agent_id: agentId,
            tokens_used: result.tokensUsed?.total || 0,
            attempt_count: result.attemptCount,
            response_time: result.latency,
            context: JSON.stringify(context),
            created_at: new Date().toISOString()
          });
      } catch (dbError) {
        // Log DB é opcional
        fastify.log.warn('Tabela llm_interactions não existe, continuando sem log DB');
      }fastify.log.info(`✅ LLM respondeu via ${result.provider}/${result.modelUsed} (${result.attemptCount} tentativas, ${result.latency}ms)`);

      return reply.send({
        success: true,
        data: {
          response: result.response,
          modelUsed: result.modelUsed,
          provider: result.provider, // 🔥 INCLUIR PROVEDOR NA RESPOSTA
          attemptCount: result.attemptCount,
          tokensUsed: result.tokensUsed?.total || 0,
          latency: result.latency,
          cached: result.cached,
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

      const startTime = Date.now();      // Usar system prompt das opções ou padrão
      const finalSystemPrompt = options.systemPrompt || 
        'Você é o AUTVISION, um assistente de IA avançado. Responda de forma útil e precisa.';

      // � USAR NOVO LLM DISPATCHER MULTI-PROVEDOR COM FALLBACK INTELIGENTE
      const result = await llmDispatcher.dispatch({
        prompt,
        systemMessage: finalSystemPrompt,
        temperature: options.temperature || 0.7,
        maxTokens: options.maxTokens || 2048
      });const processingTime = result.latency;      // Gravar log na tabela llm_request (OPCIONAL - pode falhar se tabela não existir)
      try {
        await fastify.supabase
          .from('llm_request')
          .insert({
            model_key: result.modelUsed,
            model_name: `${result.provider}/${result.modelUsed}`,
            prompt: prompt.substring(0, 1000),
            response: result.response.substring(0, 2000),
            status: 'completed',
            tokens_used: result.tokensUsed?.total || 0,
            response_time: processingTime,
            attempt_count: result.attemptCount,
            provider_used: result.provider,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      } catch (dbError) {
        // Log DB é opcional, não quebrar se falhar
        fastify.log.warn('Tabela llm_request não existe, continuando sem log DB');
      }fastify.log.info(`✅ LLM invoke respondeu via ${result.provider}/${result.modelUsed} (${processingTime}ms, ${result.attemptCount} tentativas)`);

      return reply.send({
        success: true,
        data: {
          content: result.response,
          model: result.modelUsed,
          modelKey: result.modelUsed,
          provider: result.provider, // 🔥 INCLUIR PROVEDOR NA RESPOSTA
          processing_time: processingTime,
          attempt_count: result.attemptCount,
          cached: result.cached,
          usage: {
            total_tokens: result.tokensUsed?.total || 0,
            prompt_tokens: result.tokensUsed?.prompt || 0,
            completion_tokens: result.tokensUsed?.completion || 0
          },
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      fastify.log.error('Erro na rota /llm/invoke:', error);
      
      const processingTime = Date.now() - Date.now();
        // Gravar erro no log (OPCIONAL)
      try {        
        await fastify.supabase
          .from('llm_request')          
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
        // Log DB é opcional
        fastify.log.warn('Não foi possível gravar log de erro no DB');
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

  /**
   * 🛠️ GET /config
   * Lista todas as configurações de LLMs
   */
  fastify.get('/config', async (request, reply) => {
    try {
      const { data: configs, error } = await fastify.supabase
        .from('llm_config')
        .select('*')
        .order('priority_order', { ascending: true });

      if (error) {
        fastify.log.error('Erro ao buscar configurações de LLMs:', error);
        return reply.code(500).send({
          success: false,
          error: 'Erro ao buscar configurações',
          code: 'DATABASE_ERROR'
        });
      }

      return reply.send({
        success: true,
        data: configs || []
      });

    } catch (error) {
      fastify.log.error('Erro na rota /llm/config:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🔄 POST /config/sync
   * Sincroniza configurações de LLMs com OpenRouter
   */
  fastify.post('/config/sync', async (request, reply) => {
    try {
      const availableModels = openRouter.getAvailableModels();
      
      // Busca configurações existentes
      const { data: existingConfigs } = await fastify.supabase
        .from('llm_config')
        .select('model_key');

      const existingKeys = existingConfigs?.map(c => c.model_key) || [];
      
      // Identifica novos modelos para adicionar
      const newModels = availableModels.filter(model => 
        !existingKeys.includes(model.model_key)
      );

      if (newModels.length > 0) {
        const newConfigs = newModels.map((model, index) => ({
          name: model.name,
          model_key: model.model_key,
          model_name: model.name,
          endpoint_url: 'https://openrouter.ai/api/v1/chat/completions',
          max_tokens: 2048,
          temperature: 0.7,
          priority_order: existingKeys.length + index + 1,
          status: 'inactive',
          is_enabled: false
        }));

        const { error: insertError } = await fastify.supabase
          .from('llm_config')
          .insert(newConfigs);

        if (insertError) {
          fastify.log.error('Erro ao inserir novos modelos:', insertError);
          return reply.code(500).send({
            success: false,
            error: 'Erro ao sincronizar modelos',
            code: 'SYNC_ERROR'
          });
        }
      }

      return reply.send({
        success: true,
        data: {
          synchronized: newModels.length,
          total_available: availableModels.length,
          new_models: newModels.map(m => m.name)
        }
      });

    } catch (error) {
      fastify.log.error('Erro na sincronização de LLMs:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🧪 POST /config/:id/test
   * Testa conexão com uma LLM específica
   */
  fastify.post<{
    Params: { id: string };
    Body: { api_key?: string };
  }>('/config/:id/test', async (request, reply) => {
    try {
      const { id } = request.params;
      const { api_key } = request.body || {};

      // Busca configuração da LLM
      const { data: config, error } = await fastify.supabase
        .from('llm_config')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !config) {
        return reply.code(404).send({
          success: false,
          error: 'Configuração de LLM não encontrada',
          code: 'NOT_FOUND'
        });
      }

      // Usa API key fornecida ou da configuração
      const testApiKey = api_key || config.api_key;
      if (!testApiKey) {
        return reply.code(400).send({
          success: false,
          error: 'API key é obrigatória para teste',
          code: 'MISSING_API_KEY'
        });
      }

      // Faz teste simples com a LLM
      const startTime = Date.now();
      try {
        const testResult = await openRouter.callModel(
          config.model_key,
          'Teste de conexão. Responda apenas "OK".',
          testApiKey,
          {
            temperature: 0.1,
            max_tokens: 10
          }
        );

        const responseTime = Date.now() - startTime;

        // Atualiza estatísticas da configuração
        await fastify.supabase
          .from('llm_config')
          .update({
            response_time: responseTime,
            last_used_at: new Date().toISOString(),
            error_count: 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        return reply.send({
          success: true,
          data: {
            status: 'connected',
            response_time: responseTime,
            response: testResult.response.substring(0, 100),
            model: config.model_name
          }
        });

      } catch (testError: any) {
        // Atualiza contador de erros
        await fastify.supabase
          .from('llm_config')
          .update({
            error_count: (config.error_count || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        return reply.code(400).send({
          success: false,
          error: 'Falha no teste de conexão',
          details: testError.message,
          code: 'CONNECTION_FAILED'
        });
      }

    } catch (error) {
      fastify.log.error('Erro no teste de LLM:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * ✏️ PUT /config/:id
   * Atualiza configuração de uma LLM
   */
  fastify.put<{
    Params: { id: string };
    Body: any;
  }>('/config/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;

      // Remove campos que não devem ser atualizados diretamente
      delete updateData.id;
      delete updateData.created_at;
      delete updateData.created_by;
      
      // Adiciona timestamp de atualização
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await fastify.supabase
        .from('llm_config')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        fastify.log.error('Erro ao atualizar configuração de LLM:', error);
        return reply.code(500).send({
          success: false,
          error: 'Erro ao atualizar configuração',
          code: 'UPDATE_ERROR'
        });
      }

      return reply.send({
        success: true,
        data
      });

    } catch (error) {
      fastify.log.error('Erro na atualização de LLM:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🗑️ DELETE /config/:id
   * Remove configuração de uma LLM
   */
  fastify.delete<{
    Params: { id: string };
  }>('/config/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const { error } = await fastify.supabase
        .from('llm_config')
        .delete()
        .eq('id', id);

      if (error) {
        fastify.log.error('Erro ao deletar configuração de LLM:', error);
        return reply.code(500).send({
          success: false,
          error: 'Erro ao deletar configuração',
          code: 'DELETE_ERROR'
        });
      }

      return reply.send({
        success: true,
        message: 'Configuração removida com sucesso'
      });

    } catch (error) {
      fastify.log.error('Erro na remoção de LLM:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * ➕ POST /config
   * Cria nova configuração de LLM
   */
  fastify.post<{
    Body: any;
  }>('/config', async (request, reply) => {
    try {
      const newConfig = request.body;

      // Validação básica
      if (!newConfig.name || !newConfig.model_key) {
        return reply.code(400).send({
          success: false,
          error: 'Nome e model_key são obrigatórios',
          code: 'MISSING_REQUIRED_FIELDS'
        });
      }

      // Remove campos que não devem ser definidos na criação
      delete newConfig.id;
      delete newConfig.created_at;
      delete newConfig.updated_at;
      delete newConfig.response_time;
      delete newConfig.error_count;
      delete newConfig.last_used_at;

      // Define valores padrão
      const configData = {
        name: newConfig.name,
        model_key: newConfig.model_key,
        model_name: newConfig.model_name || newConfig.name,
        api_key: newConfig.api_key || null,
        endpoint_url: newConfig.endpoint_url || 'https://openrouter.ai/api/v1/chat/completions',
        max_tokens: newConfig.max_tokens || 2048,
        temperature: newConfig.temperature || 0.7,
        top_p: newConfig.top_p || 1.0,
        priority_order: newConfig.priority_order || 1,
        status: newConfig.status || 'inactive',
        is_enabled: newConfig.is_enabled || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await fastify.supabase
        .from('llm_config')
        .insert([configData])
        .select()
        .single();

      if (error) {
        fastify.log.error('Erro ao criar configuração de LLM:', error);
        return reply.code(500).send({
          success: false,
          error: 'Erro ao criar configuração',
          details: error.message,
          code: 'CREATE_ERROR'
        });
      }      return reply.send({
        success: true,
        data,
        message: 'LLM criada com sucesso'
      });

    } catch (error) {
      fastify.log.error('Erro na criação de LLM:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 📊 GET /manager/stats
   * Obtém estatísticas do LLM Manager
   */
  fastify.get('/manager/stats', async (request, reply) => {
    try {
      const stats = llmManager.getCacheStats();
      
      return reply.send({
        success: true,
        data: stats,
        message: 'Estatísticas do LLM Manager'
      });
    } catch (error: any) {
      fastify.log.error('Erro ao obter stats do manager:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
        code: 'STATS_ERROR'
      });
    }
  });

  /**
   * 🔄 POST /manager/refresh
   * Força atualização do cache de modelos
   */
  fastify.post('/manager/refresh', async (request, reply) => {
    try {
      const result = await llmManager.forceRefresh();
      
      return reply.send({
        success: result.success,
        data: result.stats,
        message: result.message
      });
    } catch (error: any) {
      fastify.log.error('Erro ao atualizar cache do manager:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
        code: 'REFRESH_ERROR'
      });
    }
  });

  /**
   * 🧪 POST /manager/test
   * Testa o LLM Manager com uma mensagem
   */
  fastify.post<{
    Body: { prompt: string; systemPrompt?: string }
  }>('/manager/test', async (request, reply) => {
    try {
      const { prompt, systemPrompt } = request.body;
      
      if (!prompt) {
        return reply.code(400).send({
          success: false,
          error: 'Prompt é obrigatório',
          code: 'MISSING_PROMPT'
        });
      }

      const startTime = Date.now();
      const result = await llmManager.askWithFallback(prompt, systemPrompt);
      const totalTime = Date.now() - startTime;
        return reply.send({
        success: true,
        data: {
          ...result,
          totalProcessingTime: totalTime
        },
        message: 'Teste do LLM Manager executado com sucesso'
      });
    } catch (error: any) {
      fastify.log.error('Erro no teste do manager:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
        code: 'TEST_ERROR'
      });
    }
  });

  /**
   * 🚀 GET /llm/dispatcher/stats
   * Obtém estatísticas dos provedores LLM
   */
  fastify.get('/dispatcher/stats', async (request, reply) => {
    try {
      const stats = llmDispatcher.getProviderStats();
      
      return reply.send({
        success: true,
        data: {
          providers: stats,
          totalProviders: stats.length,
          activeProviders: stats.filter(p => p.isActive).length,
          avgLatency: stats.reduce((acc, p) => acc + p.avgLatency, 0) / stats.length || 0,
          totalRequests: stats.reduce((acc, p) => acc + p.totalRequests, 0),
          overallSuccessRate: stats.reduce((acc, p) => acc + p.successRate * p.totalRequests, 0) / 
                              stats.reduce((acc, p) => acc + p.totalRequests, 0) || 100
        },
        message: 'Estatísticas do LLM Dispatcher obtidas com sucesso'
      });
    } catch (error: any) {
      fastify.log.error('Erro ao obter estatísticas do dispatcher:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
        code: 'STATS_ERROR'
      });
    }
  });

  /**
   * 🔄 POST /llm/dispatcher/refresh
   * Força refresh de todos os provedores
   */
  fastify.post('/dispatcher/refresh', async (request, reply) => {
    try {
      await llmDispatcher.forceRefresh();
      
      return reply.send({
        success: true,
        message: 'Refresh dos provedores LLM executado com sucesso'
      });
    } catch (error: any) {
      fastify.log.error('Erro ao fazer refresh do dispatcher:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
        code: 'REFRESH_ERROR'
      });
    }
  });

  /**
   * 🧪 POST /llm/dispatcher/test
   * Testa o LLM Dispatcher com múltiplos provedores
   */
  fastify.post<{
    Body: { prompt: string; systemMessage?: string; temperature?: number; maxTokens?: number }
  }>('/dispatcher/test', async (request, reply) => {
    try {
      const { prompt, systemMessage, temperature, maxTokens } = request.body;
      
      if (!prompt) {
        return reply.code(400).send({
          success: false,
          error: 'Prompt é obrigatório',
          code: 'MISSING_PROMPT'
        });
      }

      const startTime = Date.now();
      const result = await llmDispatcher.dispatch({
        prompt,
        systemMessage,
        temperature: temperature || 0.7,
        maxTokens: maxTokens || 512
      });
      const totalTime = Date.now() - startTime;
      
      return reply.send({
        success: true,
        data: {
          ...result,
          totalProcessingTime: totalTime
        },
        message: 'Teste do LLM Dispatcher executado com sucesso'
      });
    } catch (error: any) {
      fastify.log.error('Erro no teste do dispatcher:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
        code: 'DISPATCHER_TEST_ERROR'
      });
    }
  });

  /**
   * 🔍 GET /llm/debug/env
   * Debug das variáveis de ambiente (apenas para desenvolvimento)
   */
  fastify.get('/debug/env', async (request, reply) => {
    try {
      const envVars = {
        hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
        hasGroq: !!process.env.GROQ_API_KEY,
        hasTogether: !!process.env.TOGETHER_API_KEY,
        hasGemini: !!process.env.GEMINI_API_KEY,
        hasSupabase: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        nodeEnv: process.env.NODE_ENV,
        openRouterKeyLength: process.env.OPENROUTER_API_KEY?.length || 0,
        groqKeyLength: process.env.GROQ_API_KEY?.length || 0,
        togetherKeyLength: process.env.TOGETHER_API_KEY?.length || 0,
        geminiKeyLength: process.env.GEMINI_API_KEY?.length || 0
      };
      
      return reply.send({
        success: true,
        data: envVars,
        message: 'Debug das variáveis de ambiente'
      });
    } catch (error: any) {
      fastify.log.error('Erro no debug de ambiente:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
        code: 'DEBUG_ENV_ERROR'
      });
    }
  });

  /**
   * 🔥 POST /llm/dispatcher/force-init
   * Força reinicialização completa do dispatcher
   */
  fastify.post('/dispatcher/force-init', async (request, reply) => {
    try {
      // Força reinicialização completa
      await llmDispatcher.forceRefresh();
      
      // Espera um pouco e pega stats atualizadas
      await new Promise(resolve => setTimeout(resolve, 1000));
      const stats = llmDispatcher.getProviderStats();
      
      return reply.send({
        success: true,
        data: {
          message: 'Dispatcher reinicializado com sucesso',
          providers: stats,
          activeProviders: stats.filter(p => p.isActive).length,
          totalProviders: stats.length,
          envDebug: {
            hasOpenRouter: !!process.env.OPENROUTER_API_KEY,
            hasGroq: !!process.env.GROQ_API_KEY,
            hasTogether: !!process.env.TOGETHER_API_KEY,
            hasGemini: !!process.env.GEMINI_API_KEY
          }
        },
        message: 'Força reinicialização executada'
      });
    } catch (error: any) {
      fastify.log.error('Erro na força reinicialização:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
        code: 'FORCE_INIT_ERROR'
      });
    }
  });
}
