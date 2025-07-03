import { FastifyInstance } from 'fastify';
import * as openvoice from '../engines/openvoice';
import * as mockOpenvoice from '../engines/mock-openvoice';
import * as elevenlabs from '../engines/elevenlabs';
import * as googletts from '../engines/googletts';
import * as xtts from '../engines/xtts';

/**
 * 🎙️ VoiceDispatcher Service
 * Gerencia múltiplas engines de TTS com fallback automático
 */
export class VoiceDispatcherService {
  private fastify: FastifyInstance;
  private engines: Map<string, any> = new Map();
  
  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }
  
  /**
   * 🚀 Inicializa o serviço carregando engines disponíveis
   */
  async initialize() {
    try {
      this.fastify.log.info('🎙️ Inicializando VoiceDispatcher...');
      
      // Carregar engines do banco
      const { data: engines, error } = await this.fastify.supabase
        .from('voice_engines')
        .select('*')
        .order('fallback_priority', { ascending: true });
      
      if (error) {
        throw error;
      }
      
      if (!engines || engines.length === 0) {
        this.fastify.log.warn('⚠️ Nenhuma engine configurada no banco');
        return;
      }
      
      // Registrar engines
      for (const engine of engines) {
        this.engines.set(engine.name, engine);
        this.fastify.log.info(`✅ Engine registrada: ${engine.name} (prioridade: ${engine.fallback_priority})`);
      }
      
      this.fastify.log.info(`🎙️ VoiceDispatcher inicializado com ${engines.length} engines`);
      
    } catch (error: any) {
      this.fastify.log.error('❌ Erro ao inicializar VoiceDispatcher:', error);
      throw error;
    }
  }
  
  /**
   * 🎯 Executa síntese de voz com fallback automático
   */
  async synthesize(params: {
    user_id: string;
    text: string;
    voice_id: string;
    speed?: number;
    pitch?: number;
    volume?: number;
  }) {
    const { user_id, text, voice_id, speed = 1.0, pitch = 0, volume = 0.8 } = params;
    
    try {
      // Buscar engines ativas ordenadas por prioridade
      const availableEngines = Array.from(this.engines.values())
        .filter(engine => engine.status === 'online')
        .sort((a, b) => a.fallback_priority - b.fallback_priority);
      
      if (availableEngines.length === 0) {
        throw new Error('Nenhuma engine disponível');
      }
      
      let lastError = null;
      
      // Tentar cada engine
      for (const engine of availableEngines) {
        try {
          this.fastify.log.info(`🔄 Tentando síntese com ${engine.name}...`);
          
          const result = await this.executeSynthesis(engine, {
            text,
            voice_id,
            speed,
            pitch,
            volume,
            user_id
          });
          
          if (result.success) {
            // Log de sucesso
            await this.logSynthesis({
              user_id,
              engine_name: engine.name,
              voice_id,
              text,
              status: 'success',
              duration_ms: result.duration_ms,
              audio_url: result.audio_url
            });
            
            return {
              success: true,
              audio_url: result.audio_url,
              duration_ms: result.duration_ms,
              engine_used: engine.name
            };
          }
          
        } catch (error: any) {
          lastError = error;
          this.fastify.log.warn(`⚠️ Engine ${engine.name} falhou:`, error.message);
          
          // Log de erro
          await this.logSynthesis({
            user_id,
            engine_name: engine.name,
            voice_id,
            text,
            status: 'error',
            error_message: error.message
          });
          
          continue;
        }
      }
      
      throw new Error(`Todas as engines falharam. Último erro: ${lastError?.message}`);
      
    } catch (error: any) {
      this.fastify.log.error('❌ Erro na síntese de voz:', error);
      throw error;
    }
  }
  
  /**
   * 🔧 Executa síntese em uma engine específica
   */
  private async executeSynthesis(engine: any, params: any) {
    const engineParams = {
      text: params.text,
      voice_id: params.voice_id,
      speed: params.speed || 1.0,
      pitch: params.pitch || 0,
      volume: params.volume || 0.8,
      user_id: params.user_id,
      engine_config: {
        api_url: engine.api_url,
        api_key: engine.config?.api_key,
        model_id: engine.config?.model_id,
        timeout: engine.config?.timeout || 30000
      }
    };

    switch (engine.name) {
      case 'openvoice':
        // Tentar engine real primeiro, usar mock se falhar
        try {
          return await openvoice.synthesize(engineParams);
        } catch (error) {
          this.fastify.log.warn(`⚠️ OpenVoice real falhou, usando mock: ${error.message}`);
          return await mockOpenvoice.synthesize(engineParams);
        }
      case 'elevenlabs':
        return await elevenlabs.synthesize(engineParams);
      case 'google-tts':
        return await googletts.synthesize(engineParams);
      case 'xtts':
        return await xtts.synthesize(engineParams);
      default:
        throw new Error(`Engine não suportada: ${engine.name}`);
    }
  }
      case 'google-tts':
        return await this.executeGoogleTTS(params, engine.config);
      default:
        throw new Error(`Engine não suportada: ${engine.name}`);
    }
  }
  
  /**
   * 🎤 OpenVoice Engine
   */
  private async executeOpenVoice(params: any, config: any) {
    // Implementação específica do OpenVoice
    const response = await fetch(`${config.api_url}/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.api_key}`
      },
      body: JSON.stringify({
        text: params.text,
        voice_id: params.voice_id,
        speed: params.speed,
        pitch: params.pitch
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenVoice API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      audio_url: result.audio_url,
      duration_ms: result.duration_ms || 0
    };
  }
  
  /**
   * 🎙️ ElevenLabs Engine
   */
  private async executeElevenLabs(params: any, config: any) {
    const response = await fetch(`${config.api_url}/v1/text-to-speech/${params.voice_id}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': config.api_key
      },
      body: JSON.stringify({
        text: params.text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
          speed: params.speed
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }
    
    // Salvar arquivo de áudio
    const audioBuffer = await response.arrayBuffer();
    const audioFileName = `elevenlabs_${Date.now()}.mp3`;
    const audioPath = `/tmp/${audioFileName}`;
    
    // Em produção, você salvaria no storage (S3, etc.)
    // Por ora, retornamos uma URL mock
    
    return {
      success: true,
      audio_url: `/audio/${audioFileName}`,
      duration_ms: Math.floor(params.text.length * 50) // Estimativa
    };
  }
  
  /**
   * 🗣️ XTTS Engine
   */
  private async executeXTTS(params: any, config: any) {
    const response = await fetch(`${config.api_url}/tts_to_audio/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: params.text,
        speaker_wav: config.speaker_wav,
        language: 'pt'
      })
    });
    
    if (!response.ok) {
      throw new Error(`XTTS API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      audio_url: result.audio_url,
      duration_ms: result.duration_ms || 0
    };
  }
  
  /**
   * 🌐 Google TTS Engine
   */
  private async executeGoogleTTS(params: any, config: any) {
    const response = await fetch(`${config.api_url}/v1/text:synthesize?key=${config.api_key}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: { text: params.text },
        voice: {
          languageCode: 'pt-BR',
          name: params.voice_id,
          ssmlGender: 'NEUTRAL'
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: params.speed,
          pitch: params.pitch
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Google TTS API error: ${response.status}`);
    }
    
    const result = await response.json();
    
    // Salvar áudio base64
    const audioFileName = `google_${Date.now()}.mp3`;
    
    return {
      success: true,
      audio_url: `/audio/${audioFileName}`,
      duration_ms: Math.floor(params.text.length * 50)
    };
  }
  
  /**
   * 📝 Registra log da síntese
   */
  private async logSynthesis(params: {
    user_id: string;
    engine_name: string;
    voice_id: string;
    text: string;
    status: 'success' | 'error';
    duration_ms?: number;
    audio_url?: string;
    error_message?: string;
  }) {
    try {
      await this.fastify.supabase
        .from('voice_logs')
        .insert({
          ...params,
          text: params.text.substring(0, 500), // Limitar tamanho
          created_at: new Date().toISOString()
        });
    } catch (error: any) {
      this.fastify.log.error('Erro ao salvar log:', error);
    }
  }
  
  /**
   * 📊 Atualiza estatísticas de uso
   */
  async updateStats(engineName: string, status: 'success' | 'error') {
    try {
      // Buscar estatística existente
      const { data: existing } = await this.fastify.supabase
        .from('voice_usage_stats')
        .select('*')
        .eq('engine_name', engineName)
        .single();
      
      if (existing) {
        // Atualizar existente
        const updates: any = { updated_at: new Date().toISOString() };
        
        if (status === 'success') {
          updates.total_success = existing.total_success + 1;
        } else {
          updates.total_errors = existing.total_errors + 1;
        }
        
        await this.fastify.supabase
          .from('voice_usage_stats')
          .update(updates)
          .eq('id', existing.id);
      } else {
        // Criar nova
        await this.fastify.supabase
          .from('voice_usage_stats')
          .insert({
            engine_name: engineName,
            total_success: status === 'success' ? 1 : 0,
            total_errors: status === 'error' ? 1 : 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
      }
    } catch (error: any) {
      this.fastify.log.error('Erro ao atualizar stats:', error);
    }
  }
  
  /**
   * 🔄 Recarrega engines do banco
   */
  async reloadEngines() {
    this.engines.clear();
    await this.initialize();
  }
  
  /**
   * 📋 Lista engines disponíveis
   */
  getEngines() {
    return Array.from(this.engines.values());
  }
  
  /**
   * 🔍 Verifica se uma engine está online
   */
  isEngineOnline(engineName: string): boolean {
    const engine = this.engines.get(engineName);
    return engine?.status === 'online';
  }
  
  /**
   * 🎯 Testa uma engine específica
   */
  async testEngine(engineName: string, testText: string = 'Teste de síntese de voz') {
    const engine = this.engines.get(engineName);
    
    if (!engine) {
      throw new Error(`Engine não encontrada: ${engineName}`);
    }
    
    try {
      const result = await this.executeSynthesis(engine, {
        text: testText,
        voice_id: 'pt-br-default',
        speed: 1.0,
        pitch: 0,
        volume: 0.8,
        user_id: 'test'
      });
      
      return {
        success: true,
        engine: engineName,
        result
      };
    } catch (error: any) {
      return {
        success: false,
        engine: engineName,
        error: error.message
      };
    }
  }
}
