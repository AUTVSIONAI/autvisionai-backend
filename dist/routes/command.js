import { z } from 'zod';
const executeCommandSchema = z.object({
    command: z.string().min(1, 'Comando não pode estar vazio'),
    agentId: z.string().uuid('ID do agente deve ser um UUID válido'),
    userId: z.string().optional(),
    context: z.object({
        source: z.string().default('backend'),
        timestamp: z.string().optional(),
        metadata: z.record(z.any()).optional()
    }).optional()
});
export default async function commandRoutes(fastify) {
    fastify.post('/execute', async (request, reply) => {
        try {
            const { command, agentId, userId, context } = executeCommandSchema.parse(request.body);
            const { data: agent, error: agentError } = await fastify.supabase
                .from('agents')
                .select('name, type, status')
                .eq('id', agentId)
                .single();
            if (agentError || !agent) {
                return reply.code(404).send({
                    success: false,
                    error: 'Agente não encontrado',
                    code: 'AGENT_NOT_FOUND'
                });
            }
            if (agent.status !== 'active') {
                return reply.code(400).send({
                    success: false,
                    error: 'Agente não está ativo',
                    code: 'AGENT_INACTIVE'
                });
            }
            const { data: execution, error: insertError } = await fastify.supabase
                .from('command_executions')
                .insert({
                command,
                agent_id: agentId,
                user_id: userId,
                status: 'pending',
                context: context || { source: 'backend', timestamp: new Date().toISOString() },
                created_at: new Date().toISOString()
            })
                .select()
                .single();
            if (insertError) {
                fastify.log.error('Erro ao gravar comando:', insertError);
                return reply.code(500).send({
                    success: false,
                    error: 'Erro interno ao gravar comando',
                    code: 'DATABASE_ERROR'
                });
            }
            fastify.log.info(`✅ Comando executado: ${command} (Agent: ${agent.name})`);
            return reply.send({
                success: true,
                data: {
                    executionId: execution.id,
                    command,
                    agent: {
                        id: agentId,
                        name: agent.name,
                        type: agent.type
                    },
                    status: 'pending',
                    timestamp: execution.created_at
                }
            });
        }
        catch (error) {
            fastify.log.error('Erro na rota /command/execute:', error);
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
    fastify.get('/history/:agentId', async (request, reply) => {
        try {
            const { agentId } = request.params;
            const { limit = 50, status } = request.query;
            let query = fastify.supabase
                .from('command_executions')
                .select('id, command, status, context, created_at, updated_at')
                .eq('agent_id', agentId)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (status) {
                query = query.eq('status', status);
            }
            const { data: history, error } = await query;
            if (error) {
                return reply.code(500).send({
                    success: false,
                    error: 'Erro ao buscar histórico',
                    code: 'DATABASE_ERROR'
                });
            }
            return reply.send({
                success: true,
                data: {
                    agentId,
                    history,
                    total: history?.length || 0
                }
            });
        }
        catch (error) {
            fastify.log.error('Erro na rota /command/history:', error);
            return reply.code(500).send({
                success: false,
                error: 'Erro interno do servidor',
                code: 'INTERNAL_ERROR'
            });
        }
    });
}
