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
export default async function llmRoutes(fastify) {
    const openRouter = new OpenRouterService();
    fastify.post('/ask', async (request, reply) => {
        try {
            const { prompt, systemPrompt, agentId, context } = askLLMSchema.parse(request.body);
            fastify.log.info(`🧠 Nova consulta LLM: "${prompt.substring(0, 100)}..."`);
            let agentConfig = null;
            if (agentId) {
                const { data: agent } = await fastify.supabase
                    .from('agents')
                    .select('name, config')
                    .eq('id', agentId)
                    .single();
                agentConfig = agent;
            }
            const finalSystemPrompt = agentConfig?.config?.systemPrompt || systemPrompt ||
                'Você é o AUTVISION, um assistente de IA avançado. Responda de forma útil e precisa.';
            const result = await openRouter.askWithFallback(prompt, finalSystemPrompt);
            await fastify.supabase
                .from('llm_interactions')
                .insert({
                prompt: prompt.substring(0, 1000),
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
        }
        catch (error) {
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
    fastify.post('/ask-specific', async (request, reply) => {
        try {
            const { prompt, systemPrompt, modelName } = request.body;
            if (!modelName) {
                return reply.code(400).send({
                    success: false,
                    error: 'Nome do modelo é obrigatório',
                    code: 'MODEL_NAME_REQUIRED'
                });
            }
            const result = await openRouter.askWithFallback(prompt, systemPrompt);
            return reply.send({
                success: true,
                data: result
            });
        }
        catch (error) {
            fastify.log.error('Erro na rota /llm/ask-specific:', error);
            return reply.code(500).send({
                success: false,
                error: 'Erro interno do servidor',
                code: 'INTERNAL_ERROR'
            });
        }
    });
    fastify.get('/stats', async (request, reply) => {
        try {
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
            const modelStats = stats?.reduce((acc, item) => {
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
        }
        catch (error) {
            fastify.log.error('Erro na rota /llm/stats:', error);
            return reply.code(500).send({
                success: false,
                error: 'Erro interno do servidor',
                code: 'INTERNAL_ERROR'
            });
        }
    });
}
