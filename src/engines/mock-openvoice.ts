import { FastifyBaseLogger } from 'fastify';
import { randomUUID } from 'crypto';

/**
 * 🎭 Mock OpenVoice Engine Handler
 * Simula síntese de voz para testes quando OVOS não está disponível
 */

interface MockOpenVoiceParams {
  text: string;
  voice_id: string;
  speed: number;
  pitch: number;
  volume: number;
  user_id: string;
  engine_config: {
    api_url: string;
    api_key?: string;
    timeout?: number;
  };
}

interface MockOpenVoiceResponse {
  success: boolean;
  audio_url?: string;
  audio_base64?: string;
  duration_ms?: number;
  error?: string;
}

/**
 * 🎯 Simula síntese de voz para testes
 */
export async function synthesize(params: MockOpenVoiceParams): Promise<MockOpenVoiceResponse> {
  const { text, voice_id, speed, pitch, volume } = params;
  
  try {
    console.log(`🎭 MockOpenVoice: Simulando síntese para "${text.substring(0, 50)}..." com voz ${voice_id}`);
    
    // Simular tempo de processamento
    const processingTime = Math.random() * 2000 + 500; // 500-2500ms
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simular sucesso/falha baseado em texto
    if (text.toLowerCase().includes('erro') || text.toLowerCase().includes('falha')) {
      throw new Error('Simulação de erro solicitada no texto');
    }
    
    // Gerar áudio mock (WAV vazio válido)
    const mockAudioBase64 = generateMockAudio(text, voice_id);
    
    // Estimar duração baseada no texto
    const duration = estimateAudioDuration(text, speed);
    
    console.log(`✅ MockOpenVoice: Síntese simulada concluída em ${Math.round(processingTime)}ms`);
    
    return {
      success: true,
      audio_base64: mockAudioBase64,
      duration_ms: duration,
      processing_time_ms: Math.round(processingTime),
      characters_count: text.length,
      estimated_cost: 0
    };
    
  } catch (error: any) {
    console.error(`❌ MockOpenVoice: Erro simulado: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      processing_time_ms: 1000,
      characters_count: text.length,
      estimated_cost: 0
    };
  }
}

/**
 * 🎯 Gera áudio WAV mock válido
 */
function generateMockAudio(text: string, voice_id: string): string {
  // WAV header básico para um arquivo vazio de 1 segundo
  const sampleRate = 44100;
  const duration = estimateAudioDuration(text, 1.0) / 1000; // em segundos
  const numSamples = Math.round(sampleRate * duration);
  
  // Cabeçalho WAV
  const header = Buffer.alloc(44);
  
  // "RIFF"
  header.write('RIFF', 0);
  // Tamanho do arquivo
  header.writeUInt32LE(36 + numSamples * 2, 4);
  // "WAVE"
  header.write('WAVE', 8);
  // "fmt "
  header.write('fmt ', 12);
  // Tamanho do chunk fmt
  header.writeUInt32LE(16, 16);
  // Audio format (PCM)
  header.writeUInt16LE(1, 20);
  // Número de canais (mono)
  header.writeUInt16LE(1, 22);
  // Sample rate
  header.writeUInt32LE(sampleRate, 24);
  // Byte rate
  header.writeUInt32LE(sampleRate * 2, 28);
  // Block align
  header.writeUInt16LE(2, 32);
  // Bits per sample
  header.writeUInt16LE(16, 34);
  // "data"
  header.write('data', 36);
  // Data size
  header.writeUInt32LE(numSamples * 2, 40);
  
  // Gerar dados de áudio silencioso
  const audioData = Buffer.alloc(numSamples * 2);
  
  // Combinar header e dados
  const wavFile = Buffer.concat([header, audioData]);
  
  return wavFile.toString('base64');
}

/**
 * 🎯 Estima duração do áudio baseado no texto
 */
function estimateAudioDuration(text: string, speed: number): number {
  // Aproximadamente 150 palavras por minuto em português
  const words = text.split(' ').length;
  const baseMinutes = words / 150;
  const adjustedMinutes = baseMinutes / speed;
  return Math.round(adjustedMinutes * 60 * 1000); // em milissegundos
}

/**
 * 🔍 Simula teste de conectividade
 */
export async function testConnection(config: { api_url: string; api_key?: string }): Promise<boolean> {
  // Simula 80% de sucesso para testes
  return Math.random() > 0.2;
}

/**
 * 📋 Simula lista de vozes disponíveis
 */
export async function getAvailableVoices(config: { api_url: string; api_key?: string }) {
  return [
    'pt-br-female-1',
    'pt-br-male-1',
    'openvoice-pt-br-female-1',
    'openvoice-pt-br-male-1'
  ];
}

/**
 * 🎚️ Valida parâmetros
 */
export function validateParams(params: Partial<MockOpenVoiceParams>): string[] {
  const errors: string[] = [];
  
  if (!params.text || params.text.trim().length === 0) {
    errors.push('Texto é obrigatório');
  }
  
  if (params.text && params.text.length > 5000) {
    errors.push('Texto muito longo (máximo 5000 caracteres)');
  }
  
  if (!params.voice_id) {
    errors.push('Voice ID é obrigatório');
  }
  
  return errors;
}

/**
 * 📊 Informações sobre a engine mock
 */
export const engineInfo = {
  name: 'MockOpenVoice',
  version: '1.0.0',
  description: 'Engine mock para testes de síntese de voz',
  supported_languages: ['pt-BR', 'en-US'],
  supported_formats: ['wav'],
  max_text_length: 5000,
  estimated_cost_per_char: 0
};

export default {
  synthesize,
  testConnection,
  getAvailableVoices,
  validateParams,
  engineInfo
};
