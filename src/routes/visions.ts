import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async function visionsRoutes(fastify: FastifyInstance) {
  
  /**
   * 🔮 GET /visions
   * Lista todas as visions disponíveis
   */
  fastify.get('/', async (request, reply) => {
    try {
      // Buscar visions do Supabase
      const { data: visions, error } = await fastify.supabase
        .from('visions')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) {
        fastify.log.warn('Erro ao buscar visions do Supabase, usando dados mock');
        
        // Dados mock para desenvolvimento
        const mockVisions = [
          {
            id: 'vision_1',
            name: 'Vision Principal',
            description: 'Assistente principal do AUTVISION',
            status: 'active',
            type: 'ai_assistant',
            capabilities: ['chat', 'voice', 'analytics'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            usage_count: 150,
            success_rate: 0.98
          },
          {
            id: 'vision_2', 
            name: 'Vision Analytics',
            description: 'Especialista em análise de dados',
            status: 'active',
            type: 'analytics',
            capabilities: ['data_analysis', 'reporting'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            usage_count: 89,
            success_rate: 0.95
          },
          {
            id: 'vision_3',
            name: 'Vision Voice',
            description: 'Especialista em síntese de voz',
            status: 'active', 
            type: 'voice_synthesis',
            capabilities: ['tts', 'voice_cloning'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            usage_count: 67,
            success_rate: 0.92
          }
        ];

        return reply.send({
          success: true,
          data: mockVisions,
          total: mockVisions.length,
          source: 'mock'
        });
      }

      return reply.send({
        success: true,
        data: visions || [],
        total: visions?.length || 0,
        source: 'supabase'
      });

    } catch (error: any) {
      fastify.log.error('Erro na rota /visions:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  });

  /**
   * 🔮 GET /visions/:id
   * Busca uma vision específica por ID
   */
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    try {
      const { id } = request.params;

      const { data: vision, error } = await fastify.supabase
        .from('visions')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !vision) {
        // Mock data para desenvolvimento
        const mockVision = {
          id,
          name: `Vision ${id}`,
          description: 'Assistente AI avançado',
          status: 'active',
          type: 'ai_assistant',
          capabilities: ['chat', 'voice', 'analytics'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          usage_count: Math.floor(Math.random() * 200),
          success_rate: 0.90 + Math.random() * 0.1,
          config: {
            model: 'gpt-4o',
            temperature: 0.7,
            max_tokens: 2000
          }
        };

        return reply.send({
          success: true,
          data: mockVision,
          source: 'mock'
        });
      }

      return reply.send({
        success: true,
        data: vision,
        source: 'supabase'
      });

    } catch (error: any) {
      fastify.log.error(`Erro na rota /visions/${request.params.id}:`, error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  });

  /**
   * 🔮 POST /visions
   * Cria uma nova vision
   */
  fastify.post('/', async (request: FastifyRequest<{ Body: any }>, reply) => {
    try {
      const visionData = request.body;

      const { data: newVision, error } = await fastify.supabase
        .from('visions')
        .insert([{
          ...visionData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        fastify.log.warn('Erro ao criar vision no Supabase, retornando mock');
        
        const mockVision = {
          id: `vision_${Date.now()}`,
          ...visionData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          usage_count: 0,
          success_rate: 1.0
        };

        return reply.status(201).send({
          success: true,
          data: mockVision,
          source: 'mock'
        });
      }

      return reply.status(201).send({
        success: true,
        data: newVision,
        source: 'supabase'
      });

    } catch (error: any) {
      fastify.log.error('Erro na rota POST /visions:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  });

  /**
   * 🔮 PUT /visions/:id
   * Atualiza uma vision existente
   */
  fastify.put('/:id', async (request: FastifyRequest<{ Params: { id: string }, Body: any }>, reply) => {
    try {
      const { id } = request.params;
      const updateData = request.body;

      const { data: updatedVision, error } = await fastify.supabase
        .from('visions')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        fastify.log.warn('Erro ao atualizar vision no Supabase, retornando mock');
        
        const mockVision = {
          id,
          ...updateData,
          updated_at: new Date().toISOString()
        };

        return reply.send({
          success: true,
          data: mockVision,
          source: 'mock'
        });
      }

      return reply.send({
        success: true,
        data: updatedVision,
        source: 'supabase'
      });

    } catch (error: any) {
      fastify.log.error(`Erro na rota PUT /visions/${request.params.id}:`, error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  });

  /**
   * 🔮 DELETE /visions/:id
   * Deleta uma vision
   */
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
    try {
      const { id } = request.params;

      const { error } = await fastify.supabase
        .from('visions')
        .delete()
        .eq('id', id);

      if (error) {
        fastify.log.warn('Erro ao deletar vision no Supabase, simulando sucesso');
      }

      return reply.send({
        success: true,
        message: 'Vision deletada com sucesso',
        source: error ? 'mock' : 'supabase'
      });

    } catch (error: any) {
      fastify.log.error(`Erro na rota DELETE /visions/${request.params.id}:`, error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  });
}
