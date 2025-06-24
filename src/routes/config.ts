import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { OpenRouterService } from '../utils/openRouter.js';

export default async function configRoutes(fastify: FastifyInstance) {
  const openRouter = new OpenRouterService();

  /**
   * 📋 GET /config/llms
   * Retorna a lista de LLMs disponíveis cadastradas no Supabase
   */
  fastify.get('/llms', async (request, reply) => {
    try {
      let llmConfigs;
      let error = null;

      // Tenta buscar do Supabase, mas usa mock em caso de erro
      try {
        const result = await fastify.supabase
          .from('llm_configs')
          .select('*')
          .eq('active', true)
          .order('priority', { ascending: true });
        
        llmConfigs = result.data;
        error = result.error;
      } catch (supabaseError) {
        fastify.log.warn('Supabase não disponível, usando dados mock para LLMs');
        // Dados mock para desenvolvimento
        llmConfigs = [
          {
            id: 'llm_1',
            model_name: 'gpt-4o',
            priority: 1,
            system_prompt: 'Você é um assistente inteligente da AutVision.',
            max_tokens: 2000,
            temperature: 0.7,
            active: true,
            last_used: new Date().toISOString(),
            total_usage: 150,
            success_rate: 0.95
          },
          {
            id: 'llm_2',
            model_name: 'gpt-4o-mini',
            priority: 2,
            system_prompt: 'Você é um assistente rápido e eficiente.',
            max_tokens: 1000,
            temperature: 0.5,
            active: true,
            last_used: new Date().toISOString(),
            total_usage: 300,
            success_rate: 0.98
          }
        ];
      }

      if (error && llmConfigs === null) {
        fastify.log.error('Erro ao buscar LLMs do Supabase:', error);
      }

      // Combina configurações do Supabase com modelos disponíveis
      const availableModels = openRouter.getAvailableModels();
      
      const llms = availableModels.map(model => {
        // Busca configuração específica no Supabase
        const dbConfig = llmConfigs?.find(config => config.model_name === model.model);
        
        return {
          ...model,
          id: dbConfig?.id,
          priority: dbConfig?.priority || 999,
          systemPrompt: dbConfig?.system_prompt,
          maxTokens: dbConfig?.max_tokens || 1000,
          temperature: dbConfig?.temperature || 0.7,
          active: dbConfig?.active || model.configured,
          lastUsed: dbConfig?.last_used,
          totalUsage: dbConfig?.total_usage || 0,
          successRate: dbConfig?.success_rate || 0
        };
      });

      // Ordena por prioridade
      llms.sort((a, b) => a.priority - b.priority);

      return reply.send({
        success: true,
        data: {
          llms,
          total: llms.length,
          configured: llms.filter(llm => llm.configured).length,
          active: llms.filter(llm => llm.active).length,
          fallbackOrder: llms.filter(llm => llm.configured).map(llm => llm.name)
        }
      });

    } catch (error: any) {
      fastify.log.error('Erro na rota /config/llms:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🔄 PUT /config/llms/:id
   * Atualiza configuração de uma LLM específica
   */
  fastify.put<{
    Params: { id: string };
    Body: {
      priority?: number;
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
      active?: boolean;
    };
  }>('/llms/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;

      // Valida os dados
      if (updates.temperature && (updates.temperature < 0 || updates.temperature > 2)) {
        return reply.code(400).send({
          success: false,
          error: 'Temperature deve estar entre 0 e 2',
          code: 'INVALID_TEMPERATURE'
        });
      }

      if (updates.maxTokens && (updates.maxTokens < 1 || updates.maxTokens > 4000)) {
        return reply.code(400).send({
          success: false,
          error: 'Max tokens deve estar entre 1 e 4000',
          code: 'INVALID_MAX_TOKENS'
        });
      }

      // Atualiza no Supabase
      const { data, error } = await fastify.supabase
        .from('llm_configs')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        fastify.log.error('Erro ao atualizar LLM config:', error);
        return reply.code(500).send({
          success: false,
          error: 'Erro ao atualizar configuração',
          code: 'DATABASE_ERROR'
        });
      }

      if (!data) {
        return reply.code(404).send({
          success: false,
          error: 'Configuração LLM não encontrada',
          code: 'LLM_CONFIG_NOT_FOUND'
        });
      }

      fastify.log.info(`✅ LLM config atualizada: ${id}`);

      return reply.send({
        success: true,
        data: data
      });

    } catch (error) {
      fastify.log.error('Erro na rota PUT /config/llms:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🤖 GET /config/agents
   * Retorna lista de agentes configurados
   */
  fastify.get('/agents', async (request, reply) => {
    try {
      let agents = [];

      // Tenta buscar do Supabase, mas usa mock em caso de erro
      try {
        const result = await fastify.supabase
          .from('agents')
          .select(`
            id,
            name,
            type,
            status,
            config,
            created_at,
            updated_at
          `)
          .order('name', { ascending: true });
        
        if (result.data && !result.error) {
          agents = result.data;
        } else {
          throw new Error('Supabase error or no data');
        }
      } catch (supabaseError) {
        fastify.log.warn('Supabase não disponível, usando dados mock para agents');
        // Dados mock para desenvolvimento
        agents = [
          {
            id: 'agent_1',
            name: 'AgentVision',
            type: 'vision',
            status: 'active',
            config: { model: 'gpt-4o', temperature: 0.7 },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          {
            id: 'agent_2', 
            name: 'AgentChat',
            type: 'chat',
            status: 'active',
            config: { model: 'gpt-4o-mini', temperature: 0.5 },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ];
      }

      // Processa estatísticas dos agentes
      const stats = {
        total: agents?.length || 0,
        active: agents?.filter(agent => agent.status === 'active').length || 0,
        byType: agents?.reduce((acc: any, agent: any) => {
          acc[agent.type] = (acc[agent.type] || 0) + 1;
          return acc;
        }, {})
      };

      return reply.send({
        success: true,
        data: {
          agents,
          stats
        }
      });

    } catch (error) {
      fastify.log.error('Erro na rota /config/agents:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🔧 GET /config/system
   * Retorna configurações gerais do sistema
   */
  fastify.get('/system', async (request, reply) => {
    try {
      // Busca configurações do sistema
      const { data: systemConfigs, error } = await fastify.supabase
        .from('system_configs')
        .select('*')
        .eq('active', true);

      if (error) {
        fastify.log.error('Erro ao buscar configs do sistema:', error);
      }

      // Configurações padrão + do banco
      const configs = {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        services: {
          supabase: {
            url: process.env.SUPABASE_URL,
            connected: true // TODO: implementar check real
          },
          openrouter: {
            modelsConfigured: openRouter.getAvailableModels().filter(m => m.configured).length,
            totalModels: openRouter.getAvailableModels().length
          },
          n8n: {
            url: process.env.N8N_API_URL,
            connected: false // TODO: implementar check real
          },
          ovos: {
            url: process.env.OVOS_API_URL,
            connected: false // TODO: implementar check real
          }
        },
        features: {
          llmFallback: true,
          voiceCommands: true,
          automation: true,
          logging: true
        },
        customConfigs: systemConfigs || [],
        lastUpdated: new Date().toISOString()
      };

      return reply.send({
        success: true,
        data: configs
      });

    } catch (error) {
      fastify.log.error('Erro na rota /config/system:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🔍 GET /config/health
   * Health check de todos os serviços
   */
  fastify.get('/health', async (request, reply) => {
    try {
      const healthChecks = {
        backend: {
          status: 'healthy',
          uptime: process.uptime(),
          version: '1.0.0'
        },
        supabase: {
          status: 'unknown',
          connected: false,
          latency: 0
        },
        openrouter: {
          status: 'unknown',
          modelsAvailable: 0,
          modelsConfigured: 0
        },
        n8n: {
          status: 'unknown',
          connected: false
        },
        ovos: {
          status: 'unknown',
          connected: false
        }
      };

      // Health check do Supabase
      try {
        const start = Date.now();
        const { error } = await fastify.supabase
          .from('agents')
          .select('count')
          .limit(1);
        
        const latency = Date.now() - start;
        
        healthChecks.supabase = {
          status: error ? 'error' : 'healthy',
          connected: !error,
          latency
        };
      } catch (error) {
        healthChecks.supabase.status = 'error';
      }

      // Health check do OpenRouter
      const models = openRouter.getAvailableModels();
      healthChecks.openrouter = {
        status: models.some(m => m.configured) ? 'healthy' : 'warning',
        modelsAvailable: models.length,
        modelsConfigured: models.filter(m => m.configured).length
      };

      // Determina status geral
      const overallStatus = Object.values(healthChecks).every(service => 
        service.status === 'healthy'
      ) ? 'healthy' : 'degraded';

      return reply.send({
        success: true,
        status: overallStatus,
        data: healthChecks,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      fastify.log.error('Erro na rota /config/health:', error);
      return reply.code(500).send({
        success: false,
        status: 'error',
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });
}
