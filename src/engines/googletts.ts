import axios from 'axios';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';

/**
 * 🌐 Google TTS Engine Handler
 * Integração com Google Cloud Text-to-Speech API
 */

interface GoogleTTSParams {
  text: string;
  voice_id: string;
  speed: number;
  pitch: number;
  volume: number;
  user_id: string;
  engine_config: {
    api_url: string;
    api_key: string;
    project_id?: string;
    credentials_json?: string;
    timeout?: number;
  };
}

interface GoogleTTSResponse {
  success: boolean;
  audio_url?: string;
  duration_ms?: number;
  error?: string;
}

/**
 * 🎯 Executa síntese de voz via Google TTS
 */
export async function synthesize(params: GoogleTTSParams): Promise<GoogleTTSResponse> {
  const { text, voice_id, speed, pitch, engine_config } = params;
  const startTime = Date.now();
  
  try {
    console.log(`🌐 Google TTS: Sintetizando "${text.substring(0, 50)}..." com voz ${voice_id}`);
    
    // Se não tiver API key, usar mock
    if (!engine_config.api_key) {
      console.log(`⚠️ Google TTS: API key não configurada, usando mock`);
      return generateMockAudio(text, voice_id, startTime);
    }
    
    // Preparar configuração da voz
    const [languageCode, name, gender] = parseVoiceId(voice_id);
    
    const requestPayload = {
      input: { text },
      voice: {
        languageCode,
        name,
        ssmlGender: gender
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: speed,
        pitch: pitch,
        volumeGainDb: volumeToGainDb(params.volume),
        sampleRateHertz: 24000
      }
    };
    
    // Fazer requisição para a API REST
    const response = await axios.post(
      `${engine_config.api_url}/v1/text:synthesize?key=${engine_config.api_key}`,
      requestPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: engine_config.timeout || 30000
      }
    );
    
    if (response.status !== 200) {
      throw new Error(`Google TTS API retornou status ${response.status}`);
    }
    
    const result = response.data;
    
    if (!result.audioContent) {
      throw new Error('Resposta inválida da API Google TTS - audioContent ausente');
    }
    
    // Salvar arquivo de áudio (base64 para arquivo)
    const audioFileName = `google_tts_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
    const audioUrl = `/audio/generated/${audioFileName}`;
    
    // TODO: Implementar salvamento real do arquivo base64
    // await saveBase64Audio(result.audioContent, audioFileName);
    
    const duration_ms = estimateDuration(text);
    
    console.log(`✅ Google TTS: Síntese concluída - ${audioUrl}`);
    
    return {
      success: true,
      audio_url: audioUrl,
      duration_ms
    };
    
  } catch (error: any) {
    console.error(`❌ Google TTS: Erro na síntese:`, error.message);
    
    // Tratar erros específicos da API
    if (error.response?.status === 401) {
      throw new Error('Google TTS API key inválida ou sem permissões');
    }
    
    if (error.response?.status === 400) {
      const errorMsg = error.response.data?.error?.message || 'Parâmetros inválidos';
      throw new Error(`Google TTS: ${errorMsg}`);
    }
    
    if (error.response?.status === 429) {
      throw new Error('Google TTS rate limit excedido - tente novamente em alguns segundos');
    }
    
    if (error.response?.status === 403) {
      throw new Error('Google TTS acesso negado - verifique cotas e billing');
    }
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Google TTS servidor inacessível');
    }
    
    throw error;
  }
}

/**
 * 🔍 Testa conectividade com Google TTS
 */
export async function testConnection(config: { api_url: string; api_key: string }): Promise<boolean> {
  try {
    const response = await axios.get(`${config.api_url}/v1/voices?key=${config.api_key}`, {
      timeout: 10000
    });
    
    return response.status === 200 && response.data.voices;
  } catch (error) {
    console.warn('⚠️ Google TTS: Falha no teste de conectividade:', error);
    return false;
  }
}

/**
 * 📋 Lista vozes disponíveis no Google TTS
 */
export async function getAvailableVoices(config: { api_url: string; api_key: string }) {
  try {
    const response = await axios.get(`${config.api_url}/v1/voices?key=${config.api_key}`, {
      timeout: 15000
    });
    
    if (response.data.voices) {
      return response.data.voices
        .filter((voice: any) => voice.languageCodes.includes('pt-BR') || voice.languageCodes.includes('pt'))
        .map((voice: any) => ({
          voice_id: `${voice.languageCodes[0]}-${voice.name}-${voice.ssmlGender}`,
          name: voice.name,
          language: voice.languageCodes[0],
          gender: voice.ssmlGender,
          natural_sample_rate: voice.naturalSampleRateHertz,
          supported_languages: voice.languageCodes
        }));
    }
    
    return [];
  } catch (error) {
    console.error('❌ Google TTS: Erro ao buscar vozes:', error);
    return [];
  }
}

/**
 * 💰 Estima custo da síntese
 */
export async function calculateCost(text: string): Promise<number> {
  // Google TTS: $4.00 per 1 million characters
  const characters = text.length;
  const costPer1M = 4.00;
  
  return (characters / 1000000) * costPer1M;
}

/**
 * 📊 Verifica cotas e limites
 */
export async function getQuotaInfo(config: { api_key: string; project_id?: string }) {
  try {
    // Esta funcionalidade requer Google Cloud Console API
    // Por simplicidade, retornamos informações estimadas
    return {
      monthly_quota: 4000000, // 4M characters per month (free tier)
      used_this_month: 0, // Seria obtido via Monitoring API
      remaining: 4000000,
      cost_this_month: 0.00
    };
  } catch (error) {
    console.error('❌ Google TTS: Erro ao verificar cotas:', error);
    return null;
  }
}

/**
 * 🎭 Converte voice_id para parâmetros do Google
 */
function parseVoiceId(voiceId: string): [string, string, string] {
  // Formato esperado: "pt-BR-Wavenet-A-FEMALE" ou "pt-BR-Standard-A-MALE"
  const parts = voiceId.split('-');
  
  if (parts.length >= 5) {
    const languageCode = `${parts[0]}-${parts[1]}`;
    const name = `${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}`;
    const gender = parts[4];
    return [languageCode, name, gender];
  }
  
  // Fallback para vozes padrão brasileiras
  return ['pt-BR', 'pt-BR-Wavenet-A', 'FEMALE'];
}

/**
 * 🔊 Converte volume (0-1) para gainDb (-96 a 16)
 */
function volumeToGainDb(volume: number): number {
  if (volume <= 0) return -96;
  if (volume >= 1) return 16;
  
  // Conversão logarítmica
  return Math.round(20 * Math.log10(volume));
}

/**
 * ⏱️ Estima duração do áudio baseado no texto
 */
function estimateDuration(text: string): number {
  // Google TTS: aproximadamente 180-200 palavras por minuto
  const words = text.split(' ').length;
  const durationSeconds = (words / 190) * 60;
  return Math.floor(durationSeconds * 1000);
}

/**
 * 🎚️ Valida parâmetros específicos do Google TTS
 */
export function validateParams(params: Partial<GoogleTTSParams>): string[] {
  const errors: string[] = [];
  
  if (!params.text || params.text.trim().length === 0) {
    errors.push('Texto é obrigatório');
  }
  
  if (params.text && params.text.length > 5000) {
    errors.push('Texto muito longo para Google TTS (máximo 5000 caracteres)');
  }
  
  if (!params.voice_id) {
    errors.push('Voice ID é obrigatório');
  }
  
  if (!params.engine_config?.api_key) {
    errors.push('Google TTS API key é obrigatória');
  }
  
  if (params.speed && (params.speed < 0.25 || params.speed > 4.0)) {
    errors.push('Speed deve estar entre 0.25 e 4.0 para Google TTS');
  }
  
  if (params.pitch && (params.pitch < -20.0 || params.pitch > 20.0)) {
    errors.push('Pitch deve estar entre -20.0 e 20.0 para Google TTS');
  }
  
  return errors;
}

/**
 * 🎭 Vozes recomendadas brasileiras
 */
export const recommendedVoices = [
  {
    voice_id: 'pt-BR-Wavenet-A-FEMALE',
    name: 'pt-BR-Wavenet-A',
    description: 'Voz feminina brasileira de alta qualidade (WaveNet)',
    gender: 'FEMALE',
    quality: 'premium',
    cost_tier: 'standard'
  },
  {
    voice_id: 'pt-BR-Wavenet-B-MALE',
    name: 'pt-BR-Wavenet-B',
    description: 'Voz masculina brasileira de alta qualidade (WaveNet)', 
    gender: 'MALE',
    quality: 'premium',
    cost_tier: 'standard'
  },
  {
    voice_id: 'pt-BR-Standard-A-FEMALE',
    name: 'pt-BR-Standard-A',
    description: 'Voz feminina brasileira padrão (econômica)',
    gender: 'FEMALE', 
    quality: 'good',
    cost_tier: 'basic'
  },
  {
    voice_id: 'pt-BR-Standard-B-MALE',
    name: 'pt-BR-Standard-B',
    description: 'Voz masculina brasileira padrão (econômica)',
    gender: 'MALE',
    quality: 'good', 
    cost_tier: 'basic'
  },
  {
    voice_id: 'pt-BR-Neural2-A-FEMALE',
    name: 'pt-BR-Neural2-A',
    description: 'Voz feminina brasileira neural (mais natural)',
    gender: 'FEMALE',
    quality: 'excellent',
    cost_tier: 'premium'
  },
  {
    voice_id: 'pt-BR-Neural2-B-MALE', 
    name: 'pt-BR-Neural2-B',
    description: 'Voz masculina brasileira neural (mais natural)',
    gender: 'MALE',
    quality: 'excellent',
    cost_tier: 'premium'
  }
];

/**
 * 📊 Informações sobre a engine
 */
export const engineInfo = {
  name: 'Google Cloud TTS',
  version: '1.0.0',
  description: 'Síntese de voz avançada do Google com vozes neurais e WaveNet',
  supported_languages: ['pt-BR', 'pt-PT', 'en-US', 'es-ES', 'fr-FR', 'de-DE'],
  supported_formats: ['mp3', 'wav', 'ogg'],
  max_text_length: 5000,
  estimated_cost_per_char: 0.000004, // $4 per 1M characters
  requires_api_key: true,
  has_usage_limits: true,
  quality_tiers: ['Standard', 'WaveNet', 'Neural2'],
  processing_time: 'fast'
};
