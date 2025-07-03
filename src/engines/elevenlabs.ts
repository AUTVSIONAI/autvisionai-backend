import axios from 'axios';

/**
 * 🎙️ ElevenLabs Engine Handler
 * Integração com a API oficial do ElevenLabs
 */

interface ElevenLabsParams {
  text: string;
  voice_id: string;
  speed: number;
  pitch: number;
  volume: number;
  user_id: string;
  engine_config: {
    api_url: string;
    api_key: string;
    model_id?: string;
    timeout?: number;
  };
}

interface ElevenLabsResponse {
  success: boolean;
  audio_url?: string;
  duration_ms?: number;
  error?: string;
}

/**
 * 🎯 Executa síntese de voz via ElevenLabs
 */
export async function synthesize(params: ElevenLabsParams): Promise<ElevenLabsResponse> {
  const { text, voice_id, speed, engine_config } = params;
  const startTime = Date.now();
  
  try {
    console.log(`🎙️ ElevenLabs: Sintetizando "${text.substring(0, 50)}..." com voz ${voice_id}`);
    
    if (!engine_config.api_key) {
      throw new Error('ElevenLabs API key é obrigatória');
    }
    
    // Mapear voice_id para external_voice_id da ElevenLabs
    const voiceMapping: { [key: string]: string } = {
      'elevenlabs-21m00Tcm4TlvDq8ikWAM': '21m00Tcm4TlvDq8ikWAM',
      'elevenlabs-AZnzlk1XvdvUeBnXmlld': 'AZnzlk1XvdvUeBnXmlld',
      'elevenlabs-rachel': '21m00Tcm4TlvDq8ikWAM',
      'elevenlabs-domi': 'AZnzlk1XvdvUeBnXmlld'
    };

    const externalVoiceId = voiceMapping[voice_id] || '21m00Tcm4TlvDq8ikWAM';
    
    const requestPayload = {
      text,
      model_id: engine_config.model_id || 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      }
    };
    
    // Fazer chamada real para API da ElevenLabs
    const response = await axios.post(
      `${engine_config.api_url}/v1/text-to-speech/${externalVoiceId}`,
      requestPayload,
      {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': engine_config.api_key
        },
        responseType: 'arraybuffer',
        timeout: engine_config.timeout || 60000
      }
    );

    // Converter para base64
    const audioBase64 = Buffer.from(response.data).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;
    
    console.log(`✅ ElevenLabs: Síntese concluída com sucesso`);
    
    return {
      success: true,
      audio_url: audioUrl,
      duration_ms: null, // ElevenLabs não retorna duração
      processing_time_ms: Date.now() - startTime
    };

  } catch (error: any) {
    console.error(`❌ ElevenLabs: Erro na síntese:`, error.message);
    
    // Tratar erros específicos da API
    if (error.response?.status === 401) {
      throw new Error('ElevenLabs API key inválida ou expirada');
    }
    
    if (error.response?.status === 429) {
      throw new Error('ElevenLabs rate limit excedido - tente novamente em alguns minutos');
    }
    
    if (error.response?.status === 400) {
      throw new Error('ElevenLabs parâmetros inválidos - verifique voice_id e texto');
    }
    
    if (error.response?.status === 422) {
      throw new Error('ElevenLabs voz não encontrada ou indisponível');
    }
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('ElevenLabs servidor offline');
    }
    
    return {
      success: false,
      error: error.message,
      processing_time_ms: Date.now() - startTime
    };
  }
}

/**
 * 🔍 Testa conectividade com ElevenLabs
 */
export async function testConnection(config: { api_url: string; api_key: string }): Promise<boolean> {
  try {
    const response = await axios.get(`${config.api_url}/v1/voices`, {
      headers: {
        'xi-api-key': config.api_key
      },
      timeout: 10000
    });
    
    return response.status === 200 && response.data.voices;
  } catch (error) {
    console.warn('⚠️ ElevenLabs: Falha no teste de conectividade:', error);
    return false;
  }
}

/**
 * 📋 Lista vozes disponíveis no ElevenLabs
 */
export async function getAvailableVoices(config: { api_url: string; api_key: string }) {
  try {
    const response = await axios.get(`${config.api_url}/v1/voices`, {
      headers: {
        'xi-api-key': config.api_key
      },
      timeout: 10000
    });
    
    if (response.data.voices) {
      return response.data.voices.map((voice: any) => ({
        voice_id: voice.voice_id,
        name: voice.name,
        description: voice.description,
        category: voice.category,
        language: voice.fine_tuning?.language || 'en',
        preview_url: voice.preview_url,
        available_for_tiers: voice.available_for_tiers
      }));
    }
    
    return [];
  } catch (error) {
    console.error('❌ ElevenLabs: Erro ao buscar vozes:', error);
    return [];
  }
}

/**
 * 📊 Verifica uso da API (caracteres restantes)
 */
export async function getUsageInfo(config: { api_url: string; api_key: string }) {
  try {
    const response = await axios.get(`${config.api_url}/v1/user/subscription`, {
      headers: {
        'xi-api-key': config.api_key
      },
      timeout: 5000
    });
    
    return {
      character_count: response.data.character_count,
      character_limit: response.data.character_limit,
      can_extend_character_limit: response.data.can_extend_character_limit,
      allowed_to_extend_character_limit: response.data.allowed_to_extend_character_limit,
      next_character_count_reset_unix: response.data.next_character_count_reset_unix
    };
  } catch (error) {
    console.error('❌ ElevenLabs: Erro ao verificar uso:', error);
    return null;
  }
}

/**
 * ⏱️ Estima duração do áudio baseado no texto
 */
function estimateDuration(text: string): number {
  // ElevenLabs: aproximadamente 150-180 palavras por minuto
  const words = text.split(' ').length;
  const durationSeconds = (words / 165) * 60;
  return Math.floor(durationSeconds * 1000);
}

/**
 * 🎚️ Valida parâmetros específicos do ElevenLabs
 */
export function validateParams(params: Partial<ElevenLabsParams>): string[] {
  const errors: string[] = [];
  
  if (!params.text || params.text.trim().length === 0) {
    errors.push('Texto é obrigatório');
  }
  
  if (params.text && params.text.length > 2500) {
    errors.push('Texto muito longo para ElevenLabs (máximo 2500 caracteres)');
  }
  
  if (!params.voice_id) {
    errors.push('Voice ID é obrigatório');
  }
  
  if (!params.engine_config?.api_key) {
    errors.push('ElevenLabs API key é obrigatória');
  }
  
  return errors;
}

/**
 * 💰 Calcula custo estimado da síntese
 */
export function calculateEstimatedCost(text: string, tier: 'free' | 'starter' | 'creator' | 'pro' = 'free'): number {
  const charCount = text.length;
  
  // Preços por caractere (aproximados em USD)
  const pricing = {
    free: 0, // Plano gratuito tem limite mensal
    starter: 0.00003, // $0.30 per 1K characters
    creator: 0.00003,
    pro: 0.00003
  };
  
  return charCount * pricing[tier];
}

/**
 * 🎭 Lista modelos disponíveis
 */
export const availableModels = [
  {
    id: 'eleven_multilingual_v2',
    name: 'Eleven Multilingual v2',
    description: 'Modelo multilingual mais recente, suporta 29 idiomas',
    languages: ['pt', 'en', 'es', 'fr', 'de', 'it', 'pl', 'hi', 'ar'],
    quality: 'high'
  },
  {
    id: 'eleven_turbo_v2',
    name: 'Eleven Turbo v2',
    description: 'Modelo otimizado para velocidade, latência baixa',
    languages: ['en'],
    quality: 'medium',
    latency: 'low'
  },
  {
    id: 'eleven_monolingual_v1',
    name: 'Eleven Monolingual v1',
    description: 'Modelo original apenas em inglês, alta qualidade',
    languages: ['en'],
    quality: 'very_high'
  }
];

/**
 * 📊 Informações sobre a engine
 */
export const engineInfo = {
  name: 'ElevenLabs',
  version: '1.0.0',
  description: 'API premium de síntese de voz com IA avançada e vozes naturais',
  supported_languages: ['pt-BR', 'en-US', 'es-ES', 'fr-FR', 'de-DE', 'it-IT'],
  supported_formats: ['mp3'],
  max_text_length: 2500,
  estimated_cost_per_char: 0.00003,
  requires_api_key: true,
  has_usage_limits: true
};
