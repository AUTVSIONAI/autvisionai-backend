/**
 * 🧠 AUTVISION LLM MANAGER - SISTEMA ROBUSTO COM FALLBACK AUTOMÁTICO
 * 
 * Sistema i  private async fetchFreeModels(): Promise<LLMModel[]> {
    this.ensureApiKey(); // Garantir que a chave está carregada
    
    try {
      console.log('🔍 Buscando modelos grátis na OpenRouter...');ligente que:
 * - Verifica dinamicamente modelos LLM grátis disponíveis na OpenRouter
 * - Mantém cache em memória dos modelos válidos
 * - Fallback automático entre modelos
 * - Auto-renovação da lista de modelos
 * - Usa a chave global OPENROUTER_API_KEY
 * 
 * @author AUTVISION Team
 * @version 3.0 - Ultra Robusto
 */

import axios from 'axios';

export interface LLMModel {
  id: string;
  name: string;
  model_key: string;
  pricing: {
    prompt: number;
    completion: number;
  };
  context_length: number;
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
  top_provider: {
    max_completion_tokens?: number;
  };
  per_request_limits?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

export interface LLMResponse {
  response: string;
  modelUsed: string;
  attemptCount: number;
  tokensUsed?: number;
  latency: number;
  cached: boolean;
}

export interface CachedModel {
  model: LLMModel;
  lastTested: Date;
  isWorking: boolean;
  priority: number;
}

class LLMManager {
  private readonly OPENROUTER_API_KEY: string;
  private readonly OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutos
  private readonly TEST_PROMPT = 'ping';
  
  private modelsCache: Map<string, CachedModel> = new Map();
  private lastCacheUpdate: Date = new Date(0);
  private isUpdating: boolean = false;
  constructor() {
    // Não inicializar a chave imediatamente - fazer lazy loading
    this.OPENROUTER_API_KEY = '';
    console.log('🔧 LLM Manager criado - inicialização lazy');
  }

  /**
   * 🔑 Inicializa a chave se necessário (lazy loading)
   */
  private ensureApiKey(): void {
    if (!this.OPENROUTER_API_KEY) {
      this.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
      
      if (!this.OPENROUTER_API_KEY) {
        console.warn('⚠️ OPENROUTER_API_KEY não encontrada no .env!');
        throw new Error('OPENROUTER_API_KEY não configurada');
      } else {
        console.log('✅ LLM Manager inicializado com chave global OpenRouter');
        // Inicializar cache na primeira chamada
        this.updateModelsCache().catch(err => 
          console.error('❌ Erro ao inicializar cache de modelos:', err.message)
        );
      }
    }
  }

  /**
   * 🔍 Obtém modelos LLM grátis disponíveis da OpenRouter
   */
  private async fetchFreeModels(): Promise<LLMModel[]> {
    try {
      console.log('🔍 Buscando modelos grátis da OpenRouter...');
      
      const response = await axios.get(`${this.OPENROUTER_BASE_URL}/models`, {
        headers: {
          'Authorization': `Bearer ${this.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://autvision.ai',
          'X-Title': 'AUTVISION Backend'
        },
        timeout: 15000
      });

      const allModels: LLMModel[] = response.data.data || [];
      
      // Filtrar apenas modelos grátis (pricing.prompt = 0 e pricing.completion = 0)
      const freeModels = allModels.filter(model => 
        model.pricing.prompt === 0 && 
        model.pricing.completion === 0 &&
        model.id.includes(':free') // Garantir que é versão grátis
      );

      console.log(`✅ Encontrados ${freeModels.length} modelos grátis disponíveis`);
      
      // Ordenar por prioridade (LLaMA, DeepSeek, etc.)
      return this.prioritizeModels(freeModels);
      
    } catch (error: any) {
      console.error('❌ Erro ao buscar modelos da OpenRouter:', error.message);
      return this.getFallbackModels();
    }
  }

  /**
   * 🎯 Prioriza modelos por qualidade e confiabilidade
   */
  private prioritizeModels(models: LLMModel[]): LLMModel[] {
    const priorityOrder = [
      'meta-llama/llama-3.3-8b-instruct:free',
      'deepseek/deepseek-r1-0528:free', 
      'deepseek/deepseek-prover-v2:free',
      'mistralai/devstral-small:free',
      'qwen/qwen3-30b-a3b:free',
      'meta-llama/llama-4-maverick:free'
    ];

    return models.sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.id);
      const bPriority = priorityOrder.indexOf(b.id);
      
      // Se ambos estão na lista de prioridade
      if (aPriority !== -1 && bPriority !== -1) {
        return aPriority - bPriority;
      }
      
      // Se apenas um está na lista
      if (aPriority !== -1) return -1;
      if (bPriority !== -1) return 1;
      
      // Se nenhum está na lista, ordenar alfabeticamente
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * 🆘 Modelos de fallback caso a API da OpenRouter falhe
   */
  private getFallbackModels(): LLMModel[] {
    return [
      {
        id: 'meta-llama/llama-3.3-8b-instruct:free',
        name: 'LLaMA 3.3 8B Instruct (Free)',
        model_key: 'meta-llama/llama-3.3-8b-instruct:free',
        pricing: { prompt: 0, completion: 0 },
        context_length: 8192,
        architecture: { modality: 'text', tokenizer: 'Llama3' },
        top_provider: { max_completion_tokens: 2048 }
      },
      {
        id: 'deepseek/deepseek-r1-0528:free',
        name: 'DeepSeek R1 (Free)',
        model_key: 'deepseek/deepseek-r1-0528:free',
        pricing: { prompt: 0, completion: 0 },
        context_length: 32768,
        architecture: { modality: 'text', tokenizer: 'DeepSeek' },
        top_provider: { max_completion_tokens: 4096 }
      },
      {
        id: 'mistralai/devstral-small:free',
        name: 'DevStral Small (Free)',
        model_key: 'mistralai/devstral-small:free',
        pricing: { prompt: 0, completion: 0 },
        context_length: 8192,
        architecture: { modality: 'text', tokenizer: 'Mistral' },
        top_provider: { max_completion_tokens: 2048 }
      }
    ];
  }

  /**
   * 🧪 Testa se um modelo específico está funcionando
   */
  private async testModel(model: LLMModel): Promise<boolean> {
    try {
      const startTime = Date.now();
      
      const response = await axios.post(
        `${this.OPENROUTER_BASE_URL}/chat/completions`,
        {
          model: model.id,
          messages: [{ role: 'user', content: this.TEST_PROMPT }],
          max_tokens: 50,
          temperature: 0.1
        },
        {
          headers: {
            'Authorization': `Bearer ${this.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://autvision.ai',
            'X-Title': 'AUTVISION Backend'
          },
          timeout: 10000
        }
      );

      const latency = Date.now() - startTime;
      const hasValidResponse = response.data?.choices?.[0]?.message?.content;
      
      if (hasValidResponse) {
        console.log(`✅ ${model.name} funcionando (${latency}ms)`);
        return true;
      } else {
        console.log(`❌ ${model.name} resposta inválida`);
        return false;
      }
      
    } catch (error: any) {
      console.log(`❌ ${model.name} falhou no teste:`, error.message);
      return false;
    }
  }

  /**
   * 🔄 Atualiza cache de modelos válidos
   */  async updateModelsCache(): Promise<void> {
    this.ensureApiKey(); // Garantir que a chave está carregada
    
    if (this.isUpdating) {
      console.log('⏳ Cache já está sendo atualizado...');
      return;
    }

    this.isUpdating = true;
    
    try {
      console.log('🔄 Atualizando cache de modelos LLM...');
      
      const freeModels = await this.fetchFreeModels();
      const newCache = new Map<string, CachedModel>();
      
      // Testar cada modelo
      for (let i = 0; i < freeModels.length; i++) {
        const model = freeModels[i];
        const isWorking = await this.testModel(model);
        
        newCache.set(model.id, {
          model,
          lastTested: new Date(),
          isWorking,
          priority: i + 1
        });
        
        // Pequena pausa entre testes para não sobrecarregar
        if (i < freeModels.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      this.modelsCache = newCache;
      this.lastCacheUpdate = new Date();
      
      const workingModels = Array.from(newCache.values()).filter(c => c.isWorking);
      console.log(`✅ Cache atualizado: ${workingModels.length}/${newCache.size} modelos funcionando`);
      
    } catch (error: any) {
      console.error('❌ Erro ao atualizar cache:', error.message);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * 🕒 Verifica se cache precisa ser atualizado
   */
  private shouldUpdateCache(): boolean {
    const now = new Date();
    const timeSinceUpdate = now.getTime() - this.lastCacheUpdate.getTime();
    return timeSinceUpdate > this.CACHE_DURATION;
  }

  /**
   * 🎯 Obtém modelos funcionais ordenados por prioridade
   */
  private getWorkingModels(): CachedModel[] {
    return Array.from(this.modelsCache.values())
      .filter(cached => cached.isWorking)
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * 🧠 MÉTODO PRINCIPAL: Chama LLM com fallback automático
   */  async askWithFallback(
    prompt: string, 
    systemPrompt?: string,
    options?: {
      temperature?: number;
      max_tokens?: number;
      timeout?: number;
    }
  ): Promise<LLMResponse> {
    
    this.ensureApiKey(); // Garantir que a chave está carregada
    
    // Atualizar cache se necessário
    if (this.shouldUpdateCache() && !this.isUpdating) {
      // Atualizar em background
      this.updateModelsCache().catch(err => 
        console.error('❌ Erro ao atualizar cache em background:', err.message)
      );
    }

    const workingModels = this.getWorkingModels();
    
    if (workingModels.length === 0) {
      console.warn('⚠️ Nenhum modelo funcionando, forçando atualização do cache...');
      await this.updateModelsCache();
      const retryModels = this.getWorkingModels();
      
      if (retryModels.length === 0) {
        return this.getEmergencyResponse(prompt);
      }
    }

    const startTime = Date.now();
    let attemptCount = 0;
    const errors: string[] = [];

    // Tentar cada modelo funcionando
    for (const cachedModel of this.getWorkingModels()) {
      attemptCount++;
      const model = cachedModel.model;

      try {
        console.log(`🎯 Tentativa ${attemptCount}: ${model.name}`);
        
        const messages = [];
        if (systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: prompt });

        const response = await axios.post(
          `${this.OPENROUTER_BASE_URL}/chat/completions`,
          {
            model: model.id,
            messages,
            max_tokens: options?.max_tokens || 2048,
            temperature: options?.temperature || 0.7
          },
          {
            headers: {
              'Authorization': `Bearer ${this.OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://autvision.ai',
              'X-Title': 'AUTVISION Backend'
            },
            timeout: options?.timeout || 30000
          }
        );

        const responseData = response.data;
        const content = responseData.choices?.[0]?.message?.content;
        
        if (!content) {
          throw new Error('Resposta vazia do modelo');
        }

        const latency = Date.now() - startTime;
        
        console.log(`✅ Sucesso com ${model.name} (${latency}ms, ${attemptCount} tentativas)`);
        
        return {
          response: content,
          modelUsed: model.name,
          attemptCount,
          tokensUsed: responseData.usage?.total_tokens,
          latency,
          cached: true
        };

      } catch (error: any) {
        const errorMsg = `${model.name}: ${error.message}`;
        errors.push(errorMsg);
        console.log(`❌ ${errorMsg}`);
        
        // Marcar modelo como não funcionando se erro crítico
        if (error.response?.status === 401 || error.response?.status === 403) {
          cachedModel.isWorking = false;
        }
      }
    }

    // Se todos falharam
    console.error(`❌ Todos os ${attemptCount} modelos falharam`);
    return this.getEmergencyResponse(prompt, errors);
  }

  /**
   * 🆘 Resposta de emergência quando todos os modelos falham
   */
  private getEmergencyResponse(prompt: string, errors?: string[]): LLMResponse {
    const emergencyResponse = `🔧 **Sistema AUTVISION em Modo de Emergência**

Sua mensagem: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"

⚠️ Todos os modelos LLM estão temporariamente indisponíveis. O sistema está:
• ✅ Funcionando normalmente
• 🔄 Monitorando modelos automaticamente
• 🔧 Tentando reconectar aos serviços de IA

${errors ? `\n**Detalhes técnicos:**\n${errors.join('\n')}` : ''}

🚀 **O sistema se recuperará automaticamente assim que os modelos voltarem online.**`;

    return {
      response: emergencyResponse,
      modelUsed: 'Sistema de Emergência AUTVISION',
      attemptCount: 0,
      tokensUsed: 0,
      latency: 0,
      cached: false
    };
  }

  /**
   * 📊 Obtém estatísticas do cache
   */
  getCacheStats(): {
    totalModels: number;
    workingModels: number;
    lastUpdate: Date;
    cacheAge: number;
    models: Array<{name: string; status: string; priority: number}>;
  } {
    const working = this.getWorkingModels();
    const cacheAge = Date.now() - this.lastCacheUpdate.getTime();
    
    return {
      totalModels: this.modelsCache.size,
      workingModels: working.length,
      lastUpdate: this.lastCacheUpdate,
      cacheAge,
      models: Array.from(this.modelsCache.values()).map(cached => ({
        name: cached.model.name,
        status: cached.isWorking ? 'funcionando' : 'offline',
        priority: cached.priority
      }))
    };
  }

  /**
   * 🔄 Força atualização do cache (para rota administrativa)
   */
  async forceRefresh(): Promise<{success: boolean; message: string; stats: any}> {
    try {
      await this.updateModelsCache();
      const stats = this.getCacheStats();
      
      return {
        success: true,
        message: `Cache atualizado com sucesso. ${stats.workingModels}/${stats.totalModels} modelos funcionando.`,
        stats
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Erro ao atualizar cache: ${error.message}`,
        stats: this.getCacheStats()
      };
    }
  }
}

// Singleton instance
export const llmManager = new LLMManager();

// Auto-refresh a cada 30 minutos
setInterval(() => {
  llmManager.updateModelsCache().catch(err => 
    console.error('❌ Erro no auto-refresh:', err.message)
  );
}, 30 * 60 * 1000);

export default llmManager;
