import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async function logsRoutes(fastify: FastifyInstance) {
  /**
   * 📊 GET /logs/mcp
   * Retorna os logs do roteamento MCP com filtro por status
   */
  fastify.get<{
    Querystring: { 
      status?: 'success' | 'error' | 'pending';
      limit?: number;
      agentId?: string;
      startDate?: string;
      endDate?: string;
    };
  }>('/mcp', async (request: FastifyRequest<{
    Querystring: { 
      status?: 'success' | 'error' | 'pending';
      limit?: number;
      agentId?: string;
      startDate?: string;
      endDate?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const { 
        status, 
        limit = 100, 
        agentId, 
        startDate, 
        endDate 
      } = request.query;

      // Query base para logs MCP (command_executions)
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

      // Aplicar filtros
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

      // Estatísticas dos logs
      const stats = {
        total: mcpLogs?.length || 0,
        byStatus: mcpLogs?.reduce((acc: any, log: any) => {
          acc[log.status] = (acc[log.status] || 0) + 1;
          return acc;
        }, {}),
        byAgent: mcpLogs?.reduce((acc: any, log: any) => {
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

    } catch (error: any) {
      fastify.log.error('Erro na rota /logs/mcp:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🧠 GET /logs/llm
   * Retorna logs de interações com LLMs
   */
  fastify.get<{
    Querystring: { 
      modelUsed?: string;
      limit?: number;
      agentId?: string;
      minTokens?: number;
    };
  }>('/llm', async (request, reply) => {
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

      // Estatísticas
      const stats = {
        total: llmLogs?.length || 0,
        totalTokens: llmLogs?.reduce((sum: number, log: any) => sum + (log.tokens_used || 0), 0),
        avgTokensPerInteraction: llmLogs?.length 
          ? Math.round(llmLogs.reduce((sum: number, log: any) => sum + (log.tokens_used || 0), 0) / llmLogs.length)
          : 0,
        byModel: llmLogs?.reduce((acc: any, log: any) => {
          acc[log.model_used] = (acc[log.model_used] || 0) + 1;
          return acc;
        }, {}),
        avgAttempts: llmLogs?.length
          ? Math.round(llmLogs.reduce((sum: number, log: any) => sum + (log.attempt_count || 1), 0) / llmLogs.length * 10) / 10
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

    } catch (error) {
      fastify.log.error('Erro na rota /logs/llm:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🔄 GET /logs/n8n
   * Retorna logs de execuções N8N
   */
  fastify.get<{
    Querystring: { 
      workflowId?: string;
      status?: 'success' | 'error';
      limit?: number;
    };
  }>('/n8n', async (request, reply) => {
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

      // Estatísticas
      const stats = {
        total: n8nLogs?.length || 0,
        byStatus: n8nLogs?.reduce((acc: any, log: any) => {
          acc[log.status] = (acc[log.status] || 0) + 1;
          return acc;
        }, {}),
        byWorkflow: n8nLogs?.reduce((acc: any, log: any) => {
          acc[log.workflow_id] = (acc[log.workflow_id] || 0) + 1;
          return acc;
        }, {}),
        successRate: n8nLogs?.length 
          ? Math.round((n8nLogs.filter((log: any) => log.status === 'success').length / n8nLogs.length) * 100)
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

    } catch (error) {
      fastify.log.error('Erro na rota /logs/n8n:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 🎙️ GET /logs/ovos
   * Retorna logs de interações OVOS
   */
  fastify.get<{
    Querystring: { 
      type?: 'tts' | 'stt';
      status?: 'success' | 'error';
      limit?: number;
    };
  }>('/ovos', async (request, reply) => {
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

      // Estatísticas
      const stats = {
        total: ovosLogs?.length || 0,
        byType: ovosLogs?.reduce((acc: any, log: any) => {
          acc[log.type] = (acc[log.type] || 0) + 1;
          return acc;
        }, {}),
        byStatus: ovosLogs?.reduce((acc: any, log: any) => {
          acc[log.status] = (acc[log.status] || 0) + 1;
          return acc;
        }, {}),
        successRate: ovosLogs?.length 
          ? Math.round((ovosLogs.filter((log: any) => log.status === 'success').length / ovosLogs.length) * 100)
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

    } catch (error) {
      fastify.log.error('Erro na rota /logs/ovos:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  /**
   * 📈 GET /logs/dashboard
   * Retorna estatísticas gerais para dashboard
   */
  fastify.get('/dashboard', async (request, reply) => {
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Busca dados dos últimos 7 dias
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

      // Processa estatísticas
      const dashboard = {
        period: '7 dias',
        mcp: {
          total: mcpLogs.data?.length || 0,
          last24h: mcpLogs.data?.filter((log: any) => log.created_at >= last24h).length || 0,
          successRate: mcpLogs.data?.length 
            ? Math.round((mcpLogs.data.filter((log: any) => log.status === 'success').length / mcpLogs.data.length) * 100)
            : 0
        },
        llm: {
          total: llmLogs.data?.length || 0,
          last24h: llmLogs.data?.filter((log: any) => log.created_at >= last24h).length || 0,
          totalTokens: llmLogs.data?.reduce((sum: number, log: any) => sum + (log.tokens_used || 0), 0) || 0,
          topModel: llmLogs.data?.reduce((acc: any, log: any) => {
            acc[log.model_used] = (acc[log.model_used] || 0) + 1;
            return acc;
          }, {})
        },
        n8n: {
          total: n8nLogs.data?.length || 0,
          last24h: n8nLogs.data?.filter((log: any) => log.created_at >= last24h).length || 0,
          successRate: n8nLogs.data?.length 
            ? Math.round((n8nLogs.data.filter((log: any) => log.status === 'success').length / n8nLogs.data.length) * 100)
            : 0
        },
        ovos: {
          total: ovosLogs.data?.length || 0,
          last24h: ovosLogs.data?.filter((log: any) => log.created_at >= last24h).length || 0,
          tts: ovosLogs.data?.filter((log: any) => log.type === 'tts').length || 0,
          stt: ovosLogs.data?.filter((log: any) => log.type === 'stt').length || 0
        },
        timestamp: new Date().toISOString()
      };

      return reply.send({
        success: true,
        data: dashboard
      });

    } catch (error) {
      fastify.log.error('Erro na rota /logs/dashboard:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });
}
