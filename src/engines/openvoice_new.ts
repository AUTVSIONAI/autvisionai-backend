import axios from 'axios';

/**
 * 🎤 OpenVoice Engine Handler
 * Integração com OVOS + fallback mock
 */

interface OpenVoiceParams {
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

interface OpenVoiceResponse {
  success: boolean;
  audio_url?: string;
  duration_ms?: number;
  error?: string;
  processing_time_ms?: number;
}

export async function synthesize(params: OpenVoiceParams): Promise<OpenVoiceResponse> {
  const { text, voice_id, speed, pitch, volume, engine_config } = params;
  const startTime = Date.now();
  
  try {
    console.log(`🎤 OpenVoice: Sintetizando "${text.substring(0, 50)}..." com voz ${voice_id}`);
    
    // Tentar OVOS real primeiro
    const requestPayload = {
      text,
      voice: voice_id,
      speed: speed || 1.0,
      pitch: pitch || 0,
      volume: volume || 0.8,
      lang: 'pt-BR'
    };
    
    try {
      const response = await axios.post(
        `${engine_config.api_url}/api/tts/synthesize`,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'audio/wav'
          },
          responseType: 'arraybuffer',
          timeout: engine_config.timeout || 30000
        }
      );

      // Converter para base64
      const audioBase64 = Buffer.from(response.data).toString('base64');
      const audioUrl = `data:audio/wav;base64,${audioBase64}`;
      
      console.log(`✅ OpenVoice: Síntese OVOS concluída com sucesso`);
      
      return {
        success: true,
        audio_url: audioUrl,
        duration_ms: null,
        processing_time_ms: Date.now() - startTime
      };

    } catch (ovosError) {
      console.log(`⚠️ OpenVoice: OVOS não disponível, usando mock`);
      
      // Fallback para mock
      return generateMockAudio(text, voice_id, startTime);
    }

  } catch (error: any) {
    console.error('❌ OpenVoice Error:', error.message);
    
    return {
      success: false,
      error: error.message,
      processing_time_ms: Date.now() - startTime
    };
  }
}

function generateMockAudio(text: string, voice_id: string, startTime: number): OpenVoiceResponse {
  // Simular tempo de processamento
  const processingTime = 1000 + Math.random() * 2000;
  
  // Gerar um áudio BEEP simples como demonstração
  const mockAudioBase64 = generateBeepAudio(text.length);
  const audioUrl = `data:audio/wav;base64,${mockAudioBase64}`;
  
  console.log(`🎵 OpenVoice: Mock audio gerado para "${text.substring(0, 30)}..." (${text.length} chars)`);
  
  return {
    success: true,
    audio_url: audioUrl,
    duration_ms: Math.floor(text.length * 50), // ~50ms por caractere
    processing_time_ms: Date.now() - startTime
  };
}

function generateBeepAudio(textLength: number): string {
  // Header WAV simples (44 bytes)
  const sampleRate = 44100;
  const duration = Math.max(1, textLength * 0.05); // 50ms por caractere
  const numSamples = Math.floor(sampleRate * duration);
  const numChannels = 1;
  const bytesPerSample = 2;
  const byteRate = sampleRate * numChannels * bytesPerSample;
  const dataSize = numSamples * numChannels * bytesPerSample;
  const fileSize = 44 + dataSize;

  const buffer = Buffer.alloc(44 + dataSize);
  let offset = 0;

  // WAV Header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(fileSize - 8, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4;
  buffer.writeUInt16LE(1, offset); offset += 2;
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(numChannels * bytesPerSample, offset); offset += 2;
  buffer.writeUInt16LE(bytesPerSample * 8, offset); offset += 2;
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  // Generate simple beep tone
  const frequency = 440; // A4 note
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
    const value = Math.floor(sample * 32767);
    buffer.writeInt16LE(value, offset);
    offset += 2;
  }

  return buffer.toString('base64');
}

export async function isAvailable(apiUrl: string): Promise<boolean> {
  try {
    const response = await axios.get(`${apiUrl}/api/status`, {
      timeout: 5000
    });
    return response.status === 200;
  } catch (error) {
    console.log('⚠️ OpenVoice/OVOS não disponível, usando mock');
    return false; // Mock sempre disponível
  }
}
