import axios from 'axios';

/**
 * 🗣️ XTTS Engine Handler
 * Integração com Coqui XTTS (eXtreme Text-To-Speech)
 */

interface XTTSParams {
  text: string;
  voice_id: string;
  speed: number;
  pitch: number;
  volume: number;
  user_id: string;
  engine_config: {
    api_url: string;
    speaker_wav?: string;
    language?: string;
    timeout?: number;
  };
}

interface XTTSResponse {
  success: boolean;
  audio_url?: string;
  duration_ms?: number;
  error?: string;
}

/**
 * 🎯 Executa síntese de voz via XTTS
 */
export async function synthesize(params: XTTSParams): Promise<XTTSResponse> {
  const { text, voice_id, speed, engine_config } = params;
  
  try {
    console.log(`🗣️ XTTS: Sintetizando "${text.substring(0, 50)}..." com voz ${voice_id}`);
    
    const requestPayload = {
      text,
      speaker_wav: engine_config.speaker_wav || voice_id, // voice_id pode ser um arquivo de referência
      language: engine_config.language || 'pt',
      speed: speed,
      // XTTS específicos
      gpt_cond_len: 3,
      gpt_cond_chunk_len: 4,
      max_ref_len: 60,
      sound_norm_refs: false
    };
    
    const response = await axios.post(
      `${engine_config.api_url}/tts_to_audio/`,
      requestPayload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: engine_config.timeout || 45000 // XTTS pode ser mais lento
      }
    );
    
    if (response.status !== 200) {
      throw new Error(`XTTS API retornou status ${response.status}`);
    }
    
    const result = response.data;
    
    if (!result.success && !result.audio_url) {
      throw new Error(result.error || 'Resposta inválida da API XTTS');
    }
    
    console.log(`✅ XTTS: Síntese concluída - ${result.audio_url}`);
    
    return {
      success: true,
      audio_url: result.audio_url,
      duration_ms: result.duration_ms || estimateDuration(text)
    };
    
  } catch (error: any) {
    console.error(`❌ XTTS: Erro na síntese:`, error.message);
    
    // Tratar erros específicos
    if (error.code === 'ECONNREFUSED') {
      throw new Error('XTTS servidor offline ou inacessível');
    }
    
    if (error.code === 'ENOTFOUND') {
      throw new Error('XTTS servidor não encontrado');
    }
    
    if (error.response?.status === 400) {
      throw new Error('XTTS parâmetros inválidos - verifique texto e configurações');
    }
    
    if (error.response?.status === 500) {
      throw new Error('XTTS erro interno do servidor - tente novamente');
    }
    
    if (error.code === 'ECONNRESET') {
      throw new Error('XTTS conexão interrompida - texto muito longo ou sobrecarga');
    }
    
    throw error;
  }
}

/**
 * 🔍 Testa conectividade com XTTS
 */
export async function testConnection(config: { api_url: string }): Promise<boolean> {
  try {
    const response = await axios.get(`${config.api_url}/health`, {
      timeout: 5000
    });
    
    return response.status === 200;
  } catch (error) {
    // Tenta endpoint alternativo se /health não existir
    try {
      const response = await axios.post(`${config.api_url}/tts_to_audio/`, {
        text: 'test',
        speaker_wav: 'test.wav',
        language: 'pt'
      }, {
        timeout: 3000,
        validateStatus: (status) => status < 500 // Aceita 4xx como "conectado"
      });
      
      return response.status < 500;
    } catch (error2) {
      console.warn('⚠️ XTTS: Falha no teste de conectividade:', error2);
      return false;
    }
  }
}

/**
 * 📋 Lista vozes disponíveis no XTTS (arquivos de referência)
 */
export async function getAvailableVoices(config: { api_url: string }) {
  try {
    const response = await axios.get(`${config.api_url}/speakers`, {
      timeout: 10000
    });
    
    if (response.data.speakers) {
      return response.data.speakers.map((speaker: any) => ({
        voice_id: speaker.name || speaker.file,
        name: speaker.display_name || speaker.name,
        language: speaker.language || 'pt',
        speaker_wav: speaker.file,
        quality: speaker.quality || 'medium'
      }));
    }
    
    return [];
  } catch (error) {
    console.error('❌ XTTS: Erro ao buscar vozes:', error);
    
    // Retorna vozes padrão se a API não suportar listagem
    return [
      {
        voice_id: 'pt-br-female-1',
        name: 'Voz Feminina Brasileira',
        language: 'pt',
        speaker_wav: 'default_female_pt.wav',
        quality: 'high'
      },
      {
        voice_id: 'pt-br-male-1',
        name: 'Voz Masculina Brasileira',
        language: 'pt',
        speaker_wav: 'default_male_pt.wav',
        quality: 'high'
      }
    ];
  }
}

/**
 * 🎤 Clona uma voz a partir de arquivo de áudio
 */
export async function cloneVoice(config: { api_url: string }, audioFile: Buffer, voiceName: string) {
  try {
    const formData = new FormData();
    formData.append('audio', new Blob([audioFile]), 'voice_sample.wav');
    formData.append('name', voiceName);
    formData.append('language', 'pt');
    
    const response = await axios.post(`${config.api_url}/clone_speaker`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000 // Clonagem pode demorar
    });
    
    if (response.data.success) {
      return {
        success: true,
        voice_id: response.data.speaker_id,
        message: 'Voz clonada com sucesso'
      };
    } else {
      throw new Error(response.data.error || 'Falha na clonagem da voz');
    }
  } catch (error: any) {
    console.error('❌ XTTS: Erro na clonagem de voz:', error);
    throw error;
  }
}

/**
 * ⏱️ Estima duração do áudio baseado no texto
 */
function estimateDuration(text: string): number {
  // XTTS: aproximadamente 140-160 palavras por minuto (um pouco mais lento)
  const words = text.split(' ').length;
  const durationSeconds = (words / 150) * 60;
  return Math.floor(durationSeconds * 1000);
}

/**
 * 🎚️ Valida parâmetros específicos do XTTS
 */
export function validateParams(params: Partial<XTTSParams>): string[] {
  const errors: string[] = [];
  
  if (!params.text || params.text.trim().length === 0) {
    errors.push('Texto é obrigatório');
  }
  
  if (params.text && params.text.length > 10000) {
    errors.push('Texto muito longo para XTTS (máximo 10000 caracteres)');
  }
  
  if (!params.voice_id && !params.engine_config?.speaker_wav) {
    errors.push('Voice ID ou speaker_wav é obrigatório');
  }
  
  if (params.speed && (params.speed < 0.1 || params.speed > 2.0)) {
    errors.push('Speed deve estar entre 0.1 e 2.0 para XTTS');
  }
  
  return errors;
}

/**
 * 🔧 Configurações recomendadas por tipo de uso
 */
export const recommendedConfigs = {
  'conversational': {
    gpt_cond_len: 3,
    gpt_cond_chunk_len: 4,
    max_ref_len: 60,
    sound_norm_refs: false,
    description: 'Otimizado para conversas naturais'
  },
  'audiobook': {
    gpt_cond_len: 6,
    gpt_cond_chunk_len: 8,
    max_ref_len: 120,
    sound_norm_refs: true,
    description: 'Otimizado para narrativa longa'
  },
  'fast': {
    gpt_cond_len: 2,
    gpt_cond_chunk_len: 2,
    max_ref_len: 30,
    sound_norm_refs: false,
    description: 'Otimizado para velocidade'
  }
};

/**
 * 🎭 Idiomas suportados
 */
export const supportedLanguages = [
  { code: 'pt', name: 'Português', quality: 'excellent' },
  { code: 'en', name: 'English', quality: 'excellent' },
  { code: 'es', name: 'Español', quality: 'good' },
  { code: 'fr', name: 'Français', quality: 'good' },
  { code: 'de', name: 'Deutsch', quality: 'good' },
  { code: 'it', name: 'Italiano', quality: 'good' },
  { code: 'pl', name: 'Polski', quality: 'fair' },
  { code: 'tr', name: 'Türkçe', quality: 'fair' },
  { code: 'ru', name: 'Русский', quality: 'fair' },
  { code: 'nl', name: 'Nederlands', quality: 'fair' },
  { code: 'cs', name: 'Čeština', quality: 'fair' },
  { code: 'ar', name: 'العربية', quality: 'fair' },
  { code: 'zh-cn', name: '中文', quality: 'fair' },
  { code: 'hu', name: 'Magyar', quality: 'fair' },
  { code: 'ko', name: '한국어', quality: 'fair' },
  { code: 'ja', name: '日本語', quality: 'fair' },
  { code: 'hi', name: 'हिन्दी', quality: 'fair' }
];

/**
 * 📊 Informações sobre a engine
 */
export const engineInfo = {
  name: 'XTTS (Coqui)',
  version: '2.0.0',
  description: 'Engine de síntese de voz baseada em IA com capacidade de clonagem de voz',
  supported_languages: supportedLanguages.map(lang => lang.code),
  supported_formats: ['wav', 'mp3'],
  max_text_length: 10000,
  estimated_cost_per_char: 0, // Open source, sem custo direto
  supports_voice_cloning: true,
  requires_api_key: false,
  processing_time: 'medium'
};
