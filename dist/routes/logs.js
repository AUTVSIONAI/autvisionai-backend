export default async function logsRoutes(fastify) {
    fastify.get('/mcp', async (request, reply) => {
        try {
            const { status, limit = 100, agentId, startDate, endDate } = request.query;
            let query = fastify.supabase
                .from('command_executions')
                .select(`
          id,
          command,
          status,
          context,
          created_at,
          updated_at,
          agent_id,
          user_id,
          agents(name, type)
        `)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (status) {
                query = query.eq('status', status);
            }
            if (agentId) {
                query = query.eq('agent_id', agentId);
            }
            if (startDate) {
                query = query.gte('created_at', startDate);
            }
            if (endDate) {
                query = query.lte('created_at', endDate);
            }
            const { data: mcpLogs, error } = await query;
            if (error) {
                fastify.log.error('Erro ao buscar logs MCP:', error);
                return reply.code(500).send({
                    success: false,
                    error: 'Erro ao buscar logs MCP',
                    code: 'DATABASE_ERROR'
                });
            }
            const stats = {
                total: mcpLogs?.length || 0,
                byStatus: mcpLogs?.reduce((acc, log) => {
                    acc[log.status] = (acc[log.status] || 0) + 1;
                    return acc;
                }, {}),
                byAgent: mcpLogs?.reduce((acc, log) => {
                    const agentName = log.agents?.name || 'Unknown';
                    acc[agentName] = (acc[agentName] || 0) + 1;
                    return acc;
                }, {})
            };
            return reply.send({
                success: true,
                data: {
                    logs: mcpLogs,
                    stats,
                    filters: {
                        status,
                        agentId,
                        startDate,
                        endDate,
                        limit
                    },
                    timestamp: new Date().toISOString()
                }
            });
        }
        catch (error) {
            fastify.log.error('Erro na rota /logs/mcp:', error);
            return reply.code(500).send({
                success: false,
                error: 'Erro interno do servidor',
                code: 'INTERNAL_ERROR'
            });
        }
    });
    fastify.get('/llm', async (request, reply) => {
        try {
            const { modelUsed, limit = 100, agentId, minTokens } = request.query;
            let query = fastify.supabase
                .from('llm_interactions')
                .select(`
          id,
          prompt,
          response,
          model_used,
          tokens_used,
          attempt_count,
          created_at,
          agent_id,
          user_id,
          context
        `)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (modelUsed) {
                query = query.eq('model_used', modelUsed);
            }
            if (agentId) {
                query = query.eq('agent_id', agentId);
            }
            if (minTokens) {
                query = query.gte('tokens_used', minTokens);
            }
            const { data: llmLogs, error } = await query;
            if (error) {
                return reply.code(500).send({
                    success: false,
                    error: 'Erro ao buscar logs LLM',
                    code: 'DATABASE_ERROR'
                });
            }
            const stats = {
                total: llmLogs?.length || 0,
                totalTokens: llmLogs?.reduce((sum, log) => sum + (log.tokens_used || 0), 0),
                avgTokensPerInteraction: llmLogs?.length
                    ? Math.round(llmLogs.reduce((sum, log) => sum + (log.tokens_used || 0), 0) / llmLogs.length)
                    : 0,
                byModel: llmLogs?.reduce((acc, log) => {
                    acc[log.model_used] = (acc[log.model_used] || 0) + 1;
                    return acc;
                }, {}),
                avgAttempts: llmLogs?.length
                    ? Math.round(llmLogs.reduce((sum, log) => sum + (log.attempt_count || 1), 0) / llmLogs.length * 10) / 10
                    : 0
            };
            return reply.send({
                success: true,
                data: {
                    logs: llmLogs,
                    stats,
                    filters: {
                        modelUsed,
                        agentId,
                        minTokens,
                        limit
                    }
                }
            });
        }
        catch (error) {
            fastify.log.error('Erro na rota /logs/llm:', error);
            return reply.code(500).send({
                success: false,
                error: 'Erro interno do servidor',
                code: 'INTERNAL_ERROR'
            });
        }
    });
    fastify.get('/n8n', async (request, reply) => {
        try {
            const { workflowId, status, limit = 100 } = request.query;
            let query = fastify.supabase
                .from('n8n_executions')
                .select(`
          id,
          workflow_id,
          payload,
          response,
          status,
          created_at,
          agent_id,
          user_id
        `)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (workflowId) {
                query = query.eq('workflow_id', workflowId);
            }
            if (status) {
                query = query.eq('status', status);
            }
            const { data: n8nLogs, error } = await query;
            if (error) {
                return reply.code(500).send({
                    success: false,
                    error: 'Erro ao buscar logs N8N',
                    code: 'DATABASE_ERROR'
                });
            }
            const stats = {
                total: n8nLogs?.length || 0,
                byStatus: n8nLogs?.reduce((acc, log) => {
                    acc[log.status] = (acc[log.status] || 0) + 1;
                    return acc;
                }, {}),
                byWorkflow: n8nLogs?.reduce((acc, log) => {
                    acc[log.workflow_id] = (acc[log.workflow_id] || 0) + 1;
                    return acc;
                }, {}),
                successRate: n8nLogs?.length
                    ? Math.round((n8nLogs.filter((log) => log.status === 'success').length / n8nLogs.length) * 100)
                    : 0
            };
            return reply.send({
                success: true,
                data: {
                    logs: n8nLogs,
                    stats,
                    filters: {
                        workflowId,
                        status,
                        limit
                    }
                }
            });
        }
        catch (error) {
            fastify.log.error('Erro na rota /logs/n8n:', error);
            return reply.code(500).send({
                success: false,
                error: 'Erro interno do servidor',
                code: 'INTERNAL_ERROR'
            });
        }
    });
    fastify.get('/ovos', async (request, reply) => {
        try {
            const { type, status, limit = 100 } = request.query;
            let query = fastify.supabase
                .from('ovos_interactions')
                .select(`
          id,
          type,
          input,
          output,
          status,
          created_at,
          agent_id,
          user_id
        `)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (type) {
                query = query.eq('type', type);
            }
            if (status) {
                query = query.eq('status', status);
            }
            const { data: ovosLogs, error } = await query;
            if (error) {
                return reply.code(500).send({
                    success: false,
                    error: 'Erro ao buscar logs OVOS',
                    code: 'DATABASE_ERROR'
                });
            }
            const stats = {
                total: ovosLogs?.length || 0,
                byType: ovosLogs?.reduce((acc, log) => {
                    acc[log.type] = (acc[log.type] || 0) + 1;
                    return acc;
                }, {}),
                byStatus: ovosLogs?.reduce((acc, log) => {
                    acc[log.status] = (acc[log.status] || 0) + 1;
                    return acc;
                }, {}),
                successRate: ovosLogs?.length
                    ? Math.round((ovosLogs.filter((log) => log.status === 'success').length / ovosLogs.length) * 100)
                    : 0
            };
            return reply.send({
                success: true,
                data: {
                    logs: ovosLogs,
                    stats,
                    filters: {
                        type,
                        status,
                        limit
                    }
                }
            });
        }
        catch (error) {
            fastify.log.error('Erro na rota /logs/ovos:', error);
            return reply.code(500).send({
                success: false,
                error: 'Erro interno do servidor',
                code: 'INTERNAL_ERROR'
            });
        }
    });
    fastify.get('/dashboard', async (request, reply) => {
        try {
            const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const [mcpLogs, llmLogs, n8nLogs, ovosLogs] = await Promise.all([
                fastify.supabase
                    .from('command_executions')
                    .select('status, created_at')
                    .gte('created_at', last7d),
                fastify.supabase
                    .from('llm_interactions')
                    .select('model_used, tokens_used, created_at')
                    .gte('created_at', last7d),
                fastify.supabase
                    .from('n8n_executions')
                    .select('status, created_at')
                    .gte('created_at', last7d),
                fastify.supabase
                    .from('ovos_interactions')
                    .select('type, status, created_at')
                    .gte('created_at', last7d)
            ]);
            const dashboard = {
                period: '7 dias',
                mcp: {
                    total: mcpLogs.data?.length || 0,
                    last24h: mcpLogs.data?.filter((log) => log.created_at >= last24h).length || 0,
                    successRate: mcpLogs.data?.length
                        ? Math.round((mcpLogs.data.filter((log) => log.status === 'success').length / mcpLogs.data.length) * 100)
                        : 0
                },
                llm: {
                    total: llmLogs.data?.length || 0,
                    last24h: llmLogs.data?.filter((log) => log.created_at >= last24h).length || 0,
                    totalTokens: llmLogs.data?.reduce((sum, log) => sum + (log.tokens_used || 0), 0) || 0,
                    topModel: llmLogs.data?.reduce((acc, log) => {
                        acc[log.model_used] = (acc[log.model_used] || 0) + 1;
                        return acc;
                    }, {})
                },
                n8n: {
                    total: n8nLogs.data?.length || 0,
                    last24h: n8nLogs.data?.filter((log) => log.created_at >= last24h).length || 0,
                    successRate: n8nLogs.data?.length
                        ? Math.round((n8nLogs.data.filter((log) => log.status === 'success').length / n8nLogs.data.length) * 100)
                        : 0
                },
                ovos: {
                    total: ovosLogs.data?.length || 0,
                    last24h: ovosLogs.data?.filter((log) => log.created_at >= last24h).length || 0,
                    tts: ovosLogs.data?.filter((log) => log.type === 'tts').length || 0,
                    stt: ovosLogs.data?.filter((log) => log.type === 'stt').length || 0
                },
                timestamp: new Date().toISOString()
            };
            return reply.send({
                success: true,
                data: dashboard
            });
        }
        catch (error) {
            fastify.log.error('Erro na rota /logs/dashboard:', error);
            return reply.code(500).send({
                success: false,
                error: 'Erro interno do servidor',
                code: 'INTERNAL_ERROR'
            });
        }
    });
}
