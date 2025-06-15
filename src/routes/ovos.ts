import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import axios from 'axios';

const speakSchema = z.object({
  text: z.string().min(1, 'Texto para fala não pode estar vazio'),
  voice: z.string().optional(),
  settings: z.object({
    speed: z.number().min(0.1).max(3.0).optional(),
    pitch: z.number().min(-20).max(20).optional(),
    volume: z.number().min(0).max(1).optional()
  }).optional(),
  context: z.object({
    agentId: z.string().optional(),
    userId: z.string().optional(),
    source: z.string().default('autvision-backend')
  }).optional()
});

const listenSchema = z.object({
  timeout: z.number().min(1000).max(30000).default(5000),
  language: z.string().default('pt-BR'),
  context: z.object({
    agentId: z.string().optional(),
    userId: z.string().optional()
  }).optional()
});

type SpeakBody = z.infer<typeof speakSchema>;
type ListenBody = z.infer<typeof listenSchema>;

export default async function ovosRoutes(fastify: FastifyInstance) {
  const OVOS_API_URL = process.env.OVOS_API_URL || 'http://localhost:8181';
  const OVOS_TIMEOUT = parseInt(process.env.OVOS_TIMEOUT || '30000');

  /**
   * 🎙️ POST /ovos/speak
   * Envia comando para o OVOS falar um texto
   */
  fastify.post<{
    Body: SpeakBody;
  }>('/speak', async (request: FastifyRequest<{Body: SpeakBody}>, reply: FastifyReply) => {
    try {
      // Validação do body
      const { text, voice, settings, context } = speakSchema.parse(request.body);

      fastify.log.info(`🎙️ OVOS TTS: "${text.substring(0, 100)}..."`);

      // Monta payload para o OVOS
      const payload = {
        text,
        voice: voice || 'default',
        settings: {
          speed: settings?.speed || 1.0,
          pitch: settings?.pitch || 0,
          volume: settings?.volume || 0.8
        },
        context: {
          ...context,
          timestamp: new Date().toISOString(),
          source: 'autvision-backend'
        }
      };

      // Chama a API do OVOS
      const ovosResponse = await axios.post(
        `${OVOS_API_URL}/api/v1/tts/speak`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: OVOS_TIMEOUT
        }
      );

      // Grava o log da execução
      await fastify.supabase
        .from('ovos_interactions')
        .insert({
          type: 'tts',
          input: text,
          output: ovosResponse.data,
          status: 'success',
          agent_id: context?.agentId,
          user_id: context?.userId,
          created_at: new Date().toISOString()
        });

      fastify.log.info(`✅ OVOS TTS executado com sucesso`);

      return reply.send({
        success: true,
        data: {
          text,
          voice: voice || 'default',
          audioUrl: ovosResponse.data?.audioUrl,
          duration: ovosResponse.data?.duration,
          status: 'completed',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      fastify.log.error('Erro na rota /ovos/speak:', error);

      // Grava o erro no log
      const { text, context } = request.body || {};
      if (text) {
        await fastify.supabase
          .from('ovos_interactions')
          .insert({
            type: 'tts',
            input: text,
            output: { error: error.message },
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
          error: 'OVOS não está acessível',
          code: 'OVOS_UNAVAILABLE'
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Erro ao executar TTS',
        details: error.message,
        code: 'TTS_ERROR'
      });
    }
  });

  /**
   * 👂 POST /ovos/listen
   * Inicia captura de áudio via STT do OVOS
   */
  fastify.post<{
    Body: ListenBody;
  }>('/listen', async (request: FastifyRequest<{Body: ListenBody}>, reply: FastifyReply) => {
    try {
      // Validação do body
      const { timeout, language, context } = listenSchema.parse(request.body);

      fastify.log.info(`👂 OVOS STT iniciado (${language}, timeout: ${timeout}ms)`);

      // Monta payload para o OVOS
      const payload = {
        timeout,
        language,
        context: {
          ...context,
          timestamp: new Date().toISOString(),
          source: 'autvision-backend'
        }
      };

      // Chama a API do OVOS
      const ovosResponse = await axios.post(
        `${OVOS_API_URL}/api/v1/stt/listen`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: timeout + 5000 // Timeout um pouco maior que o do OVOS
        }
      );

      const transcription = ovosResponse.data?.transcription || '';
      const confidence = ovosResponse.data?.confidence || 0;

      // Grava o log da execução
      await fastify.supabase
        .from('ovos_interactions')
        .insert({
          type: 'stt',
          input: `Escuta de ${timeout}ms em ${language}`,
          output: { transcription, confidence },
          status: 'success',
          agent_id: context?.agentId,
          user_id: context?.userId,
          created_at: new Date().toISOString()
        });

      fastify.log.info(`✅ OVOS STT concluído: "${transcription}"`);

      return reply.send({
        success: true,
        data: {
          transcription,
          confidence,
          language,
          duration: ovosResponse.data?.duration,
          status: 'completed',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      fastify.log.error('Erro na rota /ovos/listen:', error);

      // Grava o erro no log
      const { language, context } = request.body || {};
      await fastify.supabase
        .from('ovos_interactions')
        .insert({
          type: 'stt',
          input: `Tentativa de escuta em ${language}`,
          output: { error: error.message },
          status: 'error',
          agent_id: context?.agentId,
          user_id: context?.userId,
          created_at: new Date().toISOString()
        });
      
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
          error: 'OVOS não está acessível',
          code: 'OVOS_UNAVAILABLE'
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Erro ao executar STT',
        details: error.message,
        code: 'STT_ERROR'
      });
    }
  });

  /**
   * 📊 GET /ovos/status
   * Verifica status e saúde do OVOS
   */
  fastify.get('/status', async (request, reply) => {
    try {
      const response = await axios.get(`${OVOS_API_URL}/api/v1/status`, {
        timeout: 5000
      });

      return reply.send({
        success: true,
        data: {
          ovos: response.data,
          connection: 'active',
          url: OVOS_API_URL,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error: any) {
      fastify.log.error('Erro ao verificar status OVOS:', error);
      
      if (error.code === 'ECONNREFUSED') {
        return reply.code(503).send({
          success: false,
          error: 'OVOS não está acessível',
          code: 'OVOS_UNAVAILABLE',
          data: {
            connection: 'inactive',
            url: OVOS_API_URL
          }
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Erro ao verificar status',
        code: 'STATUS_ERROR'
      });
    }
  });

  /**
   * 📈 GET /ovos/interactions
   * Retorna histórico de interações com OVOS
   */
  fastify.get<{
    Querystring: { type?: 'tts' | 'stt'; limit?: number; agentId?: string };
  }>('/interactions', async (request, reply) => {
    try {
      const { type, limit = 50, agentId } = request.query;

      let query = fastify.supabase
        .from('ovos_interactions')
        .select('id, type, input, output, status, created_at, agent_id, user_id')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (type) {
        query = query.eq('type', type);
      }

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data: interactions, error } = await query;

      if (error) {
        return reply.code(500).send({
          success: false,
          error: 'Erro ao buscar interações',
          code: 'DATABASE_ERROR'
        });
      }

      return reply.send({
        success: true,
        data: {
          interactions,
          total: interactions?.length || 0,
          filters: { type, agentId }
        }
      });

    } catch (error) {
      fastify.log.error('Erro na rota /ovos/interactions:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });
}
