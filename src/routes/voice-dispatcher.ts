import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

// 🎯 Schema de validação para requisições de síntese de voz
const synthesizeSchema = z.object({
  user_id: z.string().min(1, 'User ID é obrigatório'),
  text: z.string().min(1, 'Texto é obrigatório').max(5000, 'Texto muito longo'),
  voice_id: z.string().min(1, 'Voice ID é obrigatório'),
  speed: z.number().min(0.1).max(3.0).default(1.0),
  pitch: z.number().min(-20).max(20).default(0),
  volume: z.number().min(0).max(1).default(0.8)
});

const getEnginesSchema = z.object({
  active_only: z.boolean().default(true)
});

type SynthesizeBody = z.infer<typeof synthesizeSchema>;
type GetEnginesQuery = z.infer<typeof getEnginesSchema>;

export default async function voiceDispatcherRoutes(fastify: FastifyInstance) {
  
  /**
   * 🎙️ POST /voice-dispatcher/synthesize
   * Endpoint principal para síntese de voz com fallback automático
   */
  fastify.post<{
    Body: SynthesizeBody;
  }>('/synthesize', async (request: FastifyRequest<{Body: SynthesizeBody}>, reply: FastifyReply) => {
    try {
      const { user_id, text, voice_id, speed, pitch, volume } = synthesizeSchema.parse(request.body);
      
      fastify.log.info(`🎙️ VoiceDispatcher: Solicitação de síntese para user ${user_id} com voz ${voice_id}`);
      
      // 1. Buscar engines disponíveis ordenados por prioridade
      const { data: engines, error: enginesError } = await fastify.supabase
        .from('voice_engines')
        .select('*')
        .eq('status', 'online')
        .order('fallback_priority', { ascending: true });
      
      if (enginesError) {
        fastify.log.error('Erro ao buscar engines:', enginesError);
        throw new Error('Erro ao consultar engines de voz');
      }
      
      if (!engines || engines.length === 0) {
        return reply.code(503).send({
          success: false,
          error: 'Nenhuma engine de voz disponível',
          code: 'NO_ENGINES_AVAILABLE'
        });
      }
      
      // 2. Tentar cada engine em ordem de prioridade
      let lastError = null;
      let synthesisResult = null;
      
      for (const engine of engines) {
        try {
          fastify.log.info(`🔄 Tentando engine: ${engine.name} (prioridade: ${engine.fallback_priority})`);
          
          // Importar dinamicamente o handler da engine
          const engineHandler = await import(`../engines/${engine.handler_file}`);
          
          // Executar síntese
          synthesisResult = await engineHandler.synthesize({
            text,
            voice_id,
            speed,
            pitch,
            volume,
            user_id,
            engine_config: engine.config
          });
          
          if (synthesisResult.success) {
            // Registrar sucesso
            await fastify.supabase
              .from('voice_logs')
              .insert({
                user_id,
                engine_name: engine.name,
                voice_id,
                text: text.substring(0, 500), // Limitar tamanho do texto no log
                status: 'success',
                duration_ms: synthesisResult.duration_ms,
                audio_url: synthesisResult.audio_url,
                created_at: new Date().toISOString()
              });
            
            fastify.log.info(`✅ Síntese bem-sucedida com ${engine.name}`);
            
            return reply.send({
              success: true,
              data: {
                audio_url: synthesisResult.audio_url,
                duration_ms: synthesisResult.duration_ms,
                engine_used: engine.name,
                voice_id,
                text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                timestamp: new Date().toISOString()
              }
            });
          }
          
        } catch (error: any) {
          fastify.log.warn(`⚠️ Engine ${engine.name} falhou:`, error.message);
          lastError = error;
          
          // Registrar falha
          await fastify.supabase
            .from('voice_logs')
            .insert({
              user_id,
              engine_name: engine.name,
              voice_id,
              text: text.substring(0, 500),
              status: 'error',
              error_message: error.message,
              created_at: new Date().toISOString()
            });
          
          continue; // Tentar próxima engine
        }
      }
      
      // Se chegou aqui, todas as engines falharam
      return reply.code(500).send({
        success: false,
        error: 'Todas as engines de voz falharam',
        last_error: lastError?.message,
        code: 'ALL_ENGINES_FAILED'
      });
      
    } catch (error: any) {
      fastify.log.error('Erro no VoiceDispatcher:', error);
      
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
        details: error.message,
        code: 'INTERNAL_ERROR'
      });
    }
  });
  
  /**
   * 📊 GET /voice-dispatcher/engines
   * Lista engines disponíveis e seus status
   */
  fastify.get<{
    Querystring: GetEnginesQuery;
  }>('/engines', async (request: FastifyRequest<{Querystring: GetEnginesQuery}>, reply: FastifyReply) => {
    try {
      const { active_only } = request.query;
      
      let query = fastify.supabase
        .from('voice_engines')
        .select('*')
        .order('fallback_priority', { ascending: true });
      
      if (active_only) {
        query = query.eq('status', 'online');
      }
      
      const { data: engines, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return reply.send({
        success: true,
        data: {
          engines: engines || [],
          total: engines?.length || 0,
          filters: { active_only }
        }
      });
      
    } catch (error: any) {
      fastify.log.error('Erro ao listar engines:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro ao listar engines',
        details: error.message
      });
    }
  });
  
  /**
   * 🔄 POST /voice-dispatcher/engines/:id/status
   * Atualiza status de uma engine
   */
  fastify.post<{
    Params: { id: string };
    Body: { status: 'online' | 'offline' | 'maintenance' };
  }>('/engines/:id/status', async (request, reply) => {
    try {
      const { id } = request.params;
      const { status } = request.body;
      
      const { data, error } = await fastify.supabase
        .from('voice_engines')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      fastify.log.info(`🔄 Engine ${data.name} status atualizado para: ${status}`);
      
      return reply.send({
        success: true,
        data: data
      });
      
    } catch (error: any) {
      fastify.log.error('Erro ao atualizar status da engine:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro ao atualizar status',
        details: error.message
      });
    }
  });
  
  /**
   * 📈 GET /voice-dispatcher/stats
   * Estatísticas de uso das engines
   */
  fastify.get('/stats', async (request, reply) => {
    try {
      const { data: stats, error } = await fastify.supabase
        .from('voice_usage_stats')
        .select('*');
      
      if (error) {
        throw error;
      }
      
      return reply.send({
        success: true,
        data: stats || []
      });
      
    } catch (error: any) {
      fastify.log.error('Erro ao buscar estatísticas:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro ao buscar estatísticas',
        details: error.message
      });
    }
  });
  
  /**
   * 🔍 GET /voice-dispatcher/logs
   * Histórico de sínteses de voz
   */
  fastify.get<{
    Querystring: {
      user_id?: string;
      engine_name?: string;
      status?: 'success' | 'error';
      limit?: number;
    };
  }>('/logs', async (request, reply) => {
    try {
      const { user_id, engine_name, status, limit = 50 } = request.query;
      
      let query = fastify.supabase
        .from('voice_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (user_id) query = query.eq('user_id', user_id);
      if (engine_name) query = query.eq('engine_name', engine_name);
      if (status) query = query.eq('status', status);
      
      const { data: logs, error } = await query;
      
      if (error) {
        throw error;
      }
      
      return reply.send({
        success: true,
        data: {
          logs: logs || [],
          total: logs?.length || 0,
          filters: { user_id, engine_name, status, limit }
        }
      });
      
    } catch (error: any) {
      fastify.log.error('Erro ao buscar logs:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro ao buscar logs',
        details: error.message
      });
    }
  });
  
}
