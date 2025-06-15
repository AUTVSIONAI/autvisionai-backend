import axios from 'axios';

export interface LLMModel {
  name: string;
  model: string;
  apiKey: string;
}

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenRouterService {
  private models: LLMModel[] = [
    {
      name: 'LLaMA 3.3 8B',
      model: 'meta-llama/llama-3.3-8b-instruct:free',
      apiKey: process.env.LLM_LLAMA3_8B_KEY || ''
    },
    {
      name: 'DeepSeek R1',
      model: 'deepseek/deepseek-r1-0528:free',
      apiKey: process.env.LLM_DEEPSEEK_R1_KEY || ''
    },
    {
      name: 'DeepSeek Prover',
      model: 'deepseek/deepseek-prover-v2:free',
      apiKey: process.env.LLM_DEEPSEEK_PROVER_KEY || ''
    },
    {
      name: 'DevStral',
      model: 'mistralai/devstral-small:free',
      apiKey: process.env.LLM_DEVSTRAL_KEY || ''
    },
    {
      name: 'Qwen 3',
      model: 'qwen/qwen3-30b-a3b:free',
      apiKey: process.env.LLM_QWEN3_KEY || ''
    },
    {
      name: 'LLaMA 4',
      model: 'meta-llama/llama-4-maverick:free',
      apiKey: process.env.LLM_LLAMA4_KEY || ''
    }
  ];

  /**
   * 🧠 SISTEMA DE FALLBACK ROBUSTO
   * Tenta todos os modelos em sequência até obter resposta
   */
  async askWithFallback(prompt: string, systemPrompt?: string): Promise<{
    response: string;
    modelUsed: string;
    attemptCount: number;
    tokensUsed?: number;
  }> {
    let attemptCount = 0;
    const errors: string[] = [];

    for (const model of this.models) {
      attemptCount++;
      
      if (!model.apiKey || model.apiKey === 'CONFIGURE_SUA_CHAVE_OPENROUTER_AQUI') {
        errors.push(`${model.name}: Chave não configurada`);
        continue;
      }

      try {
        const response = await this.callOpenRouter(model, prompt, systemPrompt);
        
        return {
          response: response.choices[0].message.content,
          modelUsed: model.name,
          attemptCount,
          tokensUsed: response.usage?.total_tokens
        };
      } catch (error: any) {
        errors.push(`${model.name}: ${error.message}`);
        console.log(`⚠️ Tentativa ${attemptCount} falhou (${model.name}):`, error.message);
      }
    }

    // Se todos falharam, retorna resposta de emergência
    return {
      response: `🔧 Sistema em modo de emergência. Configure as chaves OpenRouter para ativar a IA completa.\n\nErros encontrados:\n${errors.join('\n')}`,
      modelUsed: 'Sistema de Emergência',
      attemptCount,
      tokensUsed: 0
    };
  }

  /**
   * 📡 Chama a API OpenRouter para um modelo específico
   */
  private async callOpenRouter(
    model: LLMModel, 
    prompt: string, 
    systemPrompt?: string
  ): Promise<OpenRouterResponse> {
    const messages = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: prompt });

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: model.model,
        messages,
        max_tokens: 1000,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${model.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://autvision.ai',
          'X-Title': 'AUTVISION Backend'
        },
        timeout: 30000
      }
    );

    return response.data;
  }

  /**
   * 📋 Retorna lista de modelos disponíveis
   */
  getAvailableModels(): Array<{name: string; model: string; configured: boolean}> {
    return this.models.map(model => ({
      name: model.name,
      model: model.model,
      configured: !!(model.apiKey && model.apiKey !== 'CONFIGURE_SUA_CHAVE_OPENROUTER_AQUI')
    }));
  }
}
