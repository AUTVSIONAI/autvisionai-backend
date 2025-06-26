/**
 * 🚀 ROTAS DE INTEGRAÇÕES - AUTVISION BACKEND
 */

import { FastifyInstance } from 'fastify';

export default async function integrationsRoutes(fastify: FastifyInstance) {
  
  // GET /integrations - Listar todas as integrações
  fastify.get('/', async (request, reply) => {
    try {
      const integrations = [
        {
          id: 'n8n',
          name: 'N8N',
          description: 'Automação de workflows',
          icon: 'workflow',
          status: 'connected',
          config: {
            url: 'http://localhost:5678',
            api_key: 'n8n_api_key'
          }
        },
        {
          id: 'whatsapp',
          name: 'WhatsApp Business',
          description: 'Integração com WhatsApp',
          icon: 'message-circle',
          status: 'disconnected',
          config: {}
        },
        {
          id: 'supabase',
          name: 'Supabase',
          description: 'Base de dados principal',
          icon: 'database',
          status: 'connected',
          config: {
            url: process.env.SUPABASE_URL,
            status: 'active'
          }
        }
      ];

      return {
        success: true,
        data: integrations
      };
    } catch (error) {
      fastify.log.error('Erro ao listar integrações:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  });

  // GET /integrations/:id - Obter integração específica
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      const integrations = [
        {
          id: 'n8n',
          name: 'N8N',
          description: 'Automação de workflows',
          icon: 'workflow',
          status: 'connected',
          config: {
            url: 'http://localhost:5678',
            api_key: 'n8n_api_key'
          }
        },
        {
          id: 'whatsapp',
          name: 'WhatsApp Business',
          description: 'Integração com WhatsApp',
          icon: 'message-circle',
          status: 'disconnected',
          config: {}
        },
        {
          id: 'supabase',
          name: 'Supabase',
          description: 'Base de dados principal',
          icon: 'database',
          status: 'connected',
          config: {
            url: process.env.SUPABASE_URL,
            status: 'active'
          }
        }
      ];

      const integration = integrations.find(i => i.id === id);
      
      if (!integration) {
        return reply.code(404).send({
          success: false,
          error: 'Integração não encontrada'
        });
      }

      return {
        success: true,
        data: integration
      };
    } catch (error) {
      fastify.log.error('Erro ao buscar integração:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  });

  // POST /integrations/:id/connect - Conectar integração
  fastify.post('/:id/connect', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      // Simular conexão da integração
      return {
        success: true,
        message: `Integração ${id} conectada com sucesso`,
        data: {
          id,
          status: 'connected',
          connected_at: new Date().toISOString()
        }
      };
    } catch (error) {
      fastify.log.error('Erro ao conectar integração:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  });

  // POST /integrations/:id/disconnect - Desconectar integração
  fastify.post('/:id/disconnect', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      // Simular desconexão da integração
      return {
        success: true,
        message: `Integração ${id} desconectada com sucesso`,
        data: {
          id,
          status: 'disconnected',
          disconnected_at: new Date().toISOString()
        }
      };
    } catch (error) {
      fastify.log.error('Erro ao desconectar integração:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  });
}
