import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import axios from 'axios';

const triggerWorkflowSchema = z.object({
  workflowId: z.string().min(1, 'ID do workflow é obrigatório'),
  data: z.record(z.any()).optional(),
  context: z.object({
    agentId: z.string().optional(),
    userId: z.string().optional(),
    source: z.string().default('autvision-backend')
  }).optional()
});

type TriggerWorkflowBody = z.infer<typeof triggerWorkflowSchema>;

export default async function n8nRoutes(fastify: FastifyInstance) {
  const N8N_API_URL = process.env.N8N_API_URL || 'http://localhost:5678';
  const N8N_API_KEY = process.env.N8N_API_KEY;

  /**
   * 🔄 POST /n8n/trigger
   * Dispara workflow n8n com dados do body via webhook
   */
  fastify.post<{
    Body: TriggerWorkflowBody;
  }>('/trigger', async (request: FastifyRequest<{Body: TriggerWorkflowBody}>, reply: FastifyReply) => {
    try {
      // Validação do body
      const { workflowId, data, context } = triggerWorkflowSchema.parse(request.body);

      fastify.log.info(`🔄 Disparando workflow N8N: ${workflowId}`);

      // Monta payload para o n8n
      const payload = {
        workflowId,
        data: data || {},
        context: {
          ...context,
          timestamp: new Date().toISOString(),
          source: 'autvision-backend'
        }
      };

      // Headers para autenticação
      const headers: any = {
        'Content-Type': 'application/json'
      };

      if (N8N_API_KEY) {
        headers['Authorization'] = `Bearer ${N8N_API_KEY}`;
      }

      // Chama o webhook do n8n
      const n8nResponse = await axios.post(
        `${N8N_API_URL}/webhook/${workflowId}`,
        payload,
        {
          headers,
          timeout: 30000
        }
      );

      // Grava o log da execução
      await fastify.supabase
        .from('n8n_executions')
        .insert({
          workflow_id: workflowId,
          payload,
          response: n8nResponse.data,
          status: 'success',
          agent_id: context?.agentId,
          user_id: context?.userId,
          created_at: new Date().toISOString()
        });

      fastify.log.info(`✅ Workflow N8N executado com sucesso: ${workflowId}`);

      return reply.send({
        success: true,
        data: {
          workflowId,
          executionId: n8nResponse.data?.executionId,
          response: n8nResponse.data,
          status: 'executed',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      fastify.log.error('Erro na rota /n8n/trigger:', error);

      // Grava o erro no log
      const { workflowId, context } = request.body || {};
      if (workflowId) {
        await fastify.supabase
          .from('n8n_executions')
          .insert({
            workflow_id: workflowId,
            payload: request.body,
            response: { error: error.message },
            status: 'error',
            agent_id: context?.agentId,
            user_id: context?.userId,
            created_at: new Date().toISOString()
          });
      }
      
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Dados inválidos',
          details: error.errors,
          code: 'VALIDATION_ERROR'
        });
      }

      if (error.code === 'ECONNREFUSED') {
        return reply.code(503).send({
          success: false,
          error: 'N8N não está acessível',
          code: 'N8N_UNAVAILABLE'
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Erro ao executar workflow',
        details: error.message,
        code: 'EXECUTION_ERROR'
      });
    }
  });

  /**
   * 📊 GET /n8n/workflows
   * Lista workflows disponíveis no n8n
   */
  fastify.get('/workflows', async (request, reply) => {
    try {
      const headers: any = {
        'Content-Type': 'application/json'
      };

      if (N8N_API_KEY) {
        headers['Authorization'] = `Bearer ${N8N_API_KEY}`;
      }

      const response = await axios.get(`${N8N_API_URL}/api/v1/workflows`, {
        headers,
        timeout: 10000
      });

      return reply.send({
        success: true,
        data: {
          workflows: response.data,
          total: response.data?.length || 0,
          n8nUrl: N8N_API_URL
        }
      });

    } catch (error: any) {
      fastify.log.error('Erro ao buscar workflows N8N:', error);
      
      if (error.code === 'ECONNREFUSED') {
        return reply.code(503).send({
          success: false,
          error: 'N8N não está acessível',
          code: 'N8N_UNAVAILABLE'
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Erro ao buscar workflows',
        code: 'API_ERROR'
      });
    }
  });

  /**
   * 📈 GET /n8n/executions/:workflowId
   * Retorna histórico de execuções de um workflow
   */
  fastify.get<{
    Params: { workflowId: string };
    Querystring: { limit?: number; status?: string };
  }>('/executions/:workflowId', async (request, reply) => {
    try {
      const { workflowId } = request.params;
      const { limit = 50, status } = request.query;

      let query = fastify.supabase
        .from('n8n_executions')
        .select('id, payload, response, status, created_at, agent_id, user_id')
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }

      const { data: executions, error } = await query;

      if (error) {
        return reply.code(500).send({
          success: false,
          error: 'Erro ao buscar execuções',
          code: 'DATABASE_ERROR'
        });
      }

      return reply.send({
        success: true,
        data: {
          workflowId,
          executions,
          total: executions?.length || 0
        }
      });

    } catch (error) {
      fastify.log.error('Erro na rota /n8n/executions:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });
}
