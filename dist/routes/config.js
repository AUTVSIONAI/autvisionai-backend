import { OpenRouterService } from '../utils/openRouter.js';
export default async function configRoutes(fastify) {
    const openRouter = new OpenRouterService();
    fastify.get('/llms', async (request, reply) => {
        try {
            const { data: llmConfigs, error } = await fastify.supabase
                .from('llm_configs')
                .select('*')
                .eq('active', true)
                .order('priority', { ascending: true });
            if (error) {
                fastify.log.error('Erro ao buscar LLMs do Supabase:', error);
            }
            const availableModels = openRouter.getAvailableModels();
            const llms = availableModels.map(model => {
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
        }
        catch (error) {
            fastify.log.error('Erro na rota /config/llms:', error);
            return reply.code(500).send({
                success: false,
                error: 'Erro interno do servidor',
                code: 'INTERNAL_ERROR'
            });
        }
    });
    fastify.put('/llms/:id', async (request, reply) => {
        try {
            const { id } = request.params;
            const updates = request.body;
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
        }
        catch (error) {
            fastify.log.error('Erro na rota PUT /config/llms:', error);
            return reply.code(500).send({
                success: false,
                error: 'Erro interno do servidor',
                code: 'INTERNAL_ERROR'
            });
        }
    });
    fastify.get('/agents', async (request, reply) => {
        try {
            const { data: agents, error } = await fastify.supabase
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
            if (error) {
                return reply.code(500).send({
                    success: false,
                    error: 'Erro ao buscar agentes',
                    code: 'DATABASE_ERROR'
                });
            }
            const stats = {
                total: agents?.length || 0,
                active: agents?.filter(agent => agent.status === 'active').length || 0,
                byType: agents?.reduce((acc, agent) => {
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
        }
        catch (error) {
            fastify.log.error('Erro na rota /config/agents:', error);
            return reply.code(500).send({
                success: false,
                error: 'Erro interno do servidor',
                code: 'INTERNAL_ERROR'
            });
        }
    });
    fastify.get('/system', async (request, reply) => {
        try {
            const { data: systemConfigs, error } = await fastify.supabase
                .from('system_configs')
                .select('*')
                .eq('active', true);
            if (error) {
                fastify.log.error('Erro ao buscar configs do sistema:', error);
            }
            const configs = {
                version: '1.0.0',
                environment: process.env.NODE_ENV || 'development',
                services: {
                    supabase: {
                        url: process.env.SUPABASE_URL,
                        connected: true
                    },
                    openrouter: {
                        modelsConfigured: openRouter.getAvailableModels().filter(m => m.configured).length,
                        totalModels: openRouter.getAvailableModels().length
                    },
                    n8n: {
                        url: process.env.N8N_API_URL,
                        connected: false
                    },
                    ovos: {
                        url: process.env.OVOS_API_URL,
                        connected: false
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
        }
        catch (error) {
            fastify.log.error('Erro na rota /config/system:', error);
            return reply.code(500).send({
                success: false,
                error: 'Erro interno do servidor',
                code: 'INTERNAL_ERROR'
            });
        }
    });
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
            }
            catch (error) {
                healthChecks.supabase.status = 'error';
            }
            const models = openRouter.getAvailableModels();
            healthChecks.openrouter = {
                status: models.some(m => m.configured) ? 'healthy' : 'warning',
                modelsAvailable: models.length,
                modelsConfigured: models.filter(m => m.configured).length
            };
            const overallStatus = Object.values(healthChecks).every(service => service.status === 'healthy') ? 'healthy' : 'degraded';
            return reply.send({
                success: true,
                status: overallStatus,
                data: healthChecks,
                timestamp: new Date().toISOString()
            });
        }
        catch (error) {
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
