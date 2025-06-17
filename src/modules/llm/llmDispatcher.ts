/**
 * 🚀 AUTVISION LLM DISPATCHER - SISTEMA MULTI-PROVEDOR COM FALLBACK INTELIGENTE
 * 
 * Sistema modular que:
 * - Suporta múltiplos provedores LLM (OpenRouter, Groq, Together, Gemini)
 * - Fallback automático inteligente entre provedores
 * - Cache de provedores funcionais
 * - Balanceamento de carga por latência
 * - Logs detalhados de qual LLM foi usado na tabela llm_execution_log
 * - Modular e extensível
 * 
 * @author AUTVISION Team
 * @version 1.0 - Multi-Provider Dispatcher
 */

import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

export interface LLMRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  systemMessage?: string;
}

export interface LLMResponse {
  response: string;
  provider: string;
  modelUsed: string;
  latency: number;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  success: boolean;
  attemptCount: number;
  cached: boolean;
}

export interface ProviderConfig {
  name: string;
  apiKey: string;
  baseUrl: string;
  models: string[];
  priority: number;
  timeout: number;
  maxRetries: number;
  isActive: boolean;
  lastTested?: Date;
  avgLatency?: number;
}

export interface ProviderStatus {
  name: string;
  isActive: boolean;
  modelsAvailable: number;
  avgLatency: number;
  lastTested: Date;
  successRate: number;
  totalRequests: number;
  successfulRequests: number;
}

class LLMDispatcher {
  private providers: Map<string, ProviderConfig> = new Map();
  private providerStats: Map<string, ProviderStatus> = new Map();
  private responseCache: Map<string, { response: LLMResponse; timestamp: Date }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos para cache de respostas
  private readonly HEALTH_CHECK_INTERVAL = 10 * 60 * 1000; // 10 minutos para health check
  private healthCheckTimer?: NodeJS.Timeout;
  private supabase: any;  constructor() {
    // NÃO inicializar provedores no constructor
    // Aguardar chamada explícita para inicializar após env estar carregado
    console.log('🔧 LLM Dispatcher criado - aguardando inicialização manual');
  }

  /**
   * 🚀 Inicialização manual após env estar carregado
   */
  public initialize(): void {
    // Verificar se as variáveis de ambiente estão disponíveis
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠️ Supabase não configurado, logs serão apenas no console');
      this.supabase = null;
    } else {
      // Inicializar Supabase para logs
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      console.log('✅ Supabase inicializado para logs do LLM Dispatcher');
    }
    
    this.initializeProviders();
    this.startHealthCheckTimer();
    console.log('🚀 LLM Dispatcher inicializado com múltiplos provedores e logging inteligente');
  }  /**
   * 🔧 Inicializa configurações dos provedores
   */
  private initializeProviders(): void {    console.log('🔍 DEBUG - Verificando TODAS as variáveis de ambiente:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- Total env vars:', Object.keys(process.env).length);
    console.log('- OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? `✅ ${process.env.OPENROUTER_API_KEY.substring(0, 20)}...` : '❌ Não encontrada');
    console.log('- GROQ_API_KEY:', process.env.GROQ_API_KEY ? `✅ ${process.env.GROQ_API_KEY.substring(0, 20)}...` : '❌ Não encontrada');
    console.log('- LLM_GROQ_GLOBAL_API_KEY:', process.env.LLM_GROQ_GLOBAL_API_KEY ? `✅ ${process.env.LLM_GROQ_GLOBAL_API_KEY.substring(0, 20)}...` : '❌ Não encontrada');
    console.log('- TOGETHER_API_KEY:', process.env.TOGETHER_API_KEY ? `✅ ${process.env.TOGETHER_API_KEY.substring(0, 20)}...` : '❌ Não encontrada');
    console.log('- LLM_TOGETHER_GLOBAL_API_KEY:', process.env.LLM_TOGETHER_GLOBAL_API_KEY ? `✅ ${process.env.LLM_TOGETHER_GLOBAL_API_KEY.substring(0, 20)}...` : '❌ Não encontrada');
    console.log('- GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? `✅ ${process.env.GEMINI_API_KEY.substring(0, 20)}...` : '❌ Não encontrada');
    console.log('- LLM_GEMINI_API_KEY:', process.env.LLM_GEMINI_API_KEY ? `✅ ${process.env.LLM_GEMINI_API_KEY.substring(0, 20)}...` : '❌ Não encontrada');
    
    // DEBUG: Listar todas as chaves que começam com essas strings
    const envKeys = Object.keys(process.env);
    console.log('🔍 Chaves contendo GROQ:', envKeys.filter(k => k.includes('GROQ')));
    console.log('🔍 Chaves contendo TOGETHER:', envKeys.filter(k => k.includes('TOGETHER')));
    console.log('🔍 Chaves contendo GEMINI:', envKeys.filter(k => k.includes('GEMINI')));

    // OpenRouter (Principal)
    if (process.env.OPENROUTER_API_KEY) {
      this.providers.set('openrouter', {
        name: 'OpenRouter',
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: 'https://openrouter.ai/api/v1',
        models: [
          'meta-llama/llama-3.3-8b-instruct:free',
          'deepseek/deepseek-r1-0528:free',
          'deepseek/deepseek-prover-v2:free',
          'mistralai/devstral-small:free',
          'qwen/qwen3-30b-a3b:free'
        ],
        priority: 1,
        timeout: 30000,
        maxRetries: 3,
        isActive: true,
        avgLatency: 2000
      });
      console.log('✅ OpenRouter provedor configurado');    }    // Groq (Ultra rápido) - usando LLM_GROQ_GLOBAL_API_KEY que existe no Vercel
    const groqApiKey = process.env.GROQ_API_KEY || process.env.LLM_GROQ_GLOBAL_API_KEY;
    if (groqApiKey) {
      this.providers.set('groq', {
        name: 'Groq',
        apiKey: groqApiKey,
        baseUrl: 'https://api.groq.com/openai/v1',
        models: [
          'llama-3.1-8b-instant',
          'llama-3.1-70b-versatile',
          'mixtral-8x7b-32768',
          'gemma-7b-it'
        ],
        priority: 2,
        timeout: 15000,
        maxRetries: 2,
        isActive: true,
        avgLatency: 800
      });
      console.log('✅ Groq provedor configurado');
    }

    // Together AI - usando LLM_TOGETHER_GLOBAL_API_KEY que existe no Vercel
    const togetherApiKey = process.env.TOGETHER_API_KEY || process.env.LLM_TOGETHER_GLOBAL_API_KEY;
    if (togetherApiKey) {
      this.providers.set('together', {
        name: 'Together AI',
        apiKey: togetherApiKey,
        baseUrl: 'https://api.together.xyz/v1',
        models: [
          'meta-llama/Llama-3-8b-chat-hf',
          'meta-llama/Llama-3-70b-chat-hf',
          'mistralai/Mixtral-8x7B-Instruct-v0.1',
          'NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO'
        ],
        priority: 3,
        timeout: 25000,
        maxRetries: 2,
        isActive: true,
        avgLatency: 3000
      });
      console.log('✅ Together AI provedor configurado');
    }

    // Google Gemini - usando LLM_GEMINI_API_KEY que existe no Vercel
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.LLM_GEMINI_API_KEY;
    if (geminiApiKey) {
      this.providers.set('gemini', {
        name: 'Google Gemini',
        apiKey: geminiApiKey,
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        models: [
          'gemini-1.5-flash',
          'gemini-1.5-pro',
          'gemini-pro'
        ],
        priority: 4,
        timeout: 20000,
        maxRetries: 2,
        isActive: true,
        avgLatency: 2500
      });
      console.log('✅ Google Gemini provedor configurado');
    }

    // Inicializar estatísticas dos provedores
    this.providers.forEach((config, name) => {
      this.providerStats.set(name, {
        name: config.name,
        isActive: config.isActive,
        modelsAvailable: config.models.length,
        avgLatency: config.avgLatency || 5000,
        lastTested: new Date(),
        successRate: 100,
        totalRequests: 0,
        successfulRequests: 0
      });
    });

    console.log(`✅ Inicializados ${this.providers.size} provedores LLM:`, 
                Array.from(this.providers.keys()).join(', '));
  }

  /**
   * 🎯 Dispatch principal - rota para o melhor provedor disponível
   */
  public async dispatch(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(request);
    
    // Verificar cache
    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      console.log('⚡ Resposta retornada do cache');
      return { ...cached, cached: true };
    }

    // Obter provedores ordenados por prioridade e performance
    const orderedProviders = this.getOrderedProviders();
    
    if (orderedProviders.length === 0) {
      throw new Error('Nenhum provedor LLM disponível');
    }

    let lastError: Error | null = null;
    let attemptCount = 0;

    // Tentar cada provedor em ordem de prioridade
    for (const provider of orderedProviders) {
      attemptCount++;
      
      try {
        console.log(`🔄 Tentativa ${attemptCount}: Usando provedor ${provider.name}...`);
        
        const response = await this.callProvider(provider, request);
        const totalLatency = Date.now() - startTime;
          // Atualizar estatísticas de sucesso
        this.updateProviderStats(provider.name, true, totalLatency);
        
        const finalResponse: LLMResponse = {
          ...response,
          latency: totalLatency,
          attemptCount,
          cached: false
        };

        // Salvar no cache
        this.setCachedResponse(cacheKey, finalResponse);
        
        // 🔥 LOG NO SUPABASE - TABELA llm_execution_log
        await this.logExecutionToSupabase(request, finalResponse, provider.name);
        
        console.log(`✅ Sucesso com ${provider.name} em ${totalLatency}ms`);
        return finalResponse;
        
      } catch (error: any) {
        lastError = error;
        console.warn(`⚠️ Falha no provedor ${provider.name}:`, error.message);
        
        // Atualizar estatísticas de falha
        this.updateProviderStats(provider.name, false, Date.now() - startTime);
        
        // Se não é o último provedor, continuar tentando
        if (attemptCount < orderedProviders.length) {
          console.log(`🔄 Tentando próximo provedor...`);
          continue;
        }
      }
    }

    // Todos os provedores falharam
    const fallbackResponse: LLMResponse = {
      response: 'Desculpe, todos os serviços de IA estão temporariamente indisponíveis. Tente novamente em alguns instantes.',
      provider: 'fallback',
      modelUsed: 'emergency-mode',
      latency: Date.now() - startTime,
      success: false,
      attemptCount,
      cached: false
    };

    console.error('❌ Todos os provedores LLM falharam:', lastError?.message);
    return fallbackResponse;
  }

  /**
   * 🎯 Chama um provedor específico
   */
  private async callProvider(provider: ProviderConfig, request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    
    // Selecionar modelo do provedor
    const model = this.selectBestModel(provider);
    
    let response: any;
    
    switch (provider.name) {
      case 'OpenRouter':
        response = await this.callOpenRouter(provider, model, request);
        break;
      case 'Groq':
        response = await this.callGroq(provider, model, request);
        break;
      case 'Together AI':
        response = await this.callTogether(provider, model, request);
        break;
      case 'Google Gemini':
        response = await this.callGemini(provider, model, request);
        break;
      default:
        throw new Error(`Provedor desconhecido: ${provider.name}`);
    }

    return {
      response: response.content,
      provider: provider.name,
      modelUsed: model,
      latency: Date.now() - startTime,
      tokensUsed: response.tokensUsed,
      success: true,
      attemptCount: 1,
      cached: false
    };
  }
  /**
   * 🔌 OpenRouter API call
   */  private async callOpenRouter(provider: ProviderConfig, model: string, request: LLMRequest): Promise<any> {
    console.log(`🔧 DEBUG OpenRouter: Tentando modelo ${model}`);
    console.log(`🔧 DEBUG OpenRouter: API Key presente: ${!!provider.apiKey}`);
    console.log(`🔧 DEBUG OpenRouter: API Key primeiros chars: ${provider.apiKey?.substring(0, 15)}...`);
    
    try {
      const response = await axios.post(
        `${provider.baseUrl}/chat/completions`,
        {
          model,
          messages: [
            ...(request.systemMessage ? [{ role: 'system', content: request.systemMessage }] : []),
            { role: 'user', content: request.prompt }
          ],
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 2048,
          stream: false
        },
        {
          headers: {
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://autvision.ai',
            'X-Title': 'AUTVISION Backend'        },
        timeout: provider.timeout
      }
    );

    console.log(`✅ OpenRouter respondeu com sucesso para modelo ${model}`);
    const content = response.data.choices[0]?.message?.content || 'Resposta vazia';
    const usage = response.data.usage;

    return {
      content,
      tokensUsed: usage ? {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens
      } : undefined
    };
    } catch (error: any) {
      console.error(`❌ Erro OpenRouter (${model}):`, error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * ⚡ Groq API call
   */
  private async callGroq(provider: ProviderConfig, model: string, request: LLMRequest): Promise<any> {
    const response = await axios.post(
      `${provider.baseUrl}/chat/completions`,
      {
        model,
        messages: [
          ...(request.systemMessage ? [{ role: 'system', content: request.systemMessage }] : []),
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2048
      },
      {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: provider.timeout
      }
    );

    const content = response.data.choices[0]?.message?.content || 'Resposta vazia';
    const usage = response.data.usage;

    return {
      content,
      tokensUsed: usage ? {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens
      } : undefined
    };
  }

  /**
   * 🤝 Together AI API call
   */
  private async callTogether(provider: ProviderConfig, model: string, request: LLMRequest): Promise<any> {
    const response = await axios.post(
      `${provider.baseUrl}/chat/completions`,
      {
        model,
        messages: [
          ...(request.systemMessage ? [{ role: 'system', content: request.systemMessage }] : []),
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2048
      },
      {
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: provider.timeout
      }
    );

    const content = response.data.choices[0]?.message?.content || 'Resposta vazia';
    const usage = response.data.usage;

    return {
      content,
      tokensUsed: usage ? {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens
      } : undefined
    };
  }

  /**
   * 🧠 Google Gemini API call
   */
  private async callGemini(provider: ProviderConfig, model: string, request: LLMRequest): Promise<any> {
    const response = await axios.post(
      `${provider.baseUrl}/models/${model}:generateContent?key=${provider.apiKey}`,
      {
        contents: [{
          parts: [{
            text: request.systemMessage 
              ? `${request.systemMessage}\n\nUser: ${request.prompt}`
              : request.prompt
          }]
        }],
        generationConfig: {
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.maxTokens || 2048
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: provider.timeout
      }
    );

    const content = response.data.candidates[0]?.content?.parts[0]?.text || 'Resposta vazia';
    const usage = response.data.usageMetadata;

    return {
      content,
      tokensUsed: usage ? {
        prompt: usage.promptTokenCount,
        completion: usage.candidatesTokenCount,
        total: usage.totalTokenCount
      } : undefined
    };
  }

  /**
   * 📊 Ordena provedores por prioridade e performance
   */
  private getOrderedProviders(): ProviderConfig[] {
    const activeProviders = Array.from(this.providers.values())
      .filter(p => p.isActive);

    return activeProviders.sort((a, b) => {
      const statsA = this.providerStats.get(a.name.toLowerCase()) || {} as any;
      const statsB = this.providerStats.get(b.name.toLowerCase()) || {} as any;
      
      // Prioridade por taxa de sucesso e latência
      const scoreA = (statsA.successRate || 100) - (statsA.avgLatency || 5000) / 100;
      const scoreB = (statsB.successRate || 100) - (statsB.avgLatency || 5000) / 100;
      
      return scoreB - scoreA; // Maior score primeiro
    });
  }

  /**
   * 🎲 Seleciona o melhor modelo de um provedor
   */
  private selectBestModel(provider: ProviderConfig): string {
    // Por enquanto, usa o primeiro modelo (pode ser melhorado com métricas)
    return provider.models[0];
  }

  /**
   * 📈 Atualiza estatísticas do provedor
   */
  private updateProviderStats(providerName: string, success: boolean, latency: number): void {
    const key = providerName.toLowerCase();
    const stats = this.providerStats.get(key);
    
    if (stats) {
      stats.totalRequests++;
      if (success) {
        stats.successfulRequests++;
        stats.avgLatency = (stats.avgLatency + latency) / 2; // Média simples
      }
      stats.successRate = (stats.successfulRequests / stats.totalRequests) * 100;
      stats.lastTested = new Date();
      
      // Desativar provedor se taxa de sucesso muito baixa
      if (stats.successRate < 30 && stats.totalRequests > 5) {
        const provider = this.providers.get(key);
        if (provider) {
          provider.isActive = false;
          console.warn(`⚠️ Provedor ${providerName} desativado (taxa de sucesso: ${stats.successRate.toFixed(1)}%)`);
        }
      }
    }
  }

  /**
   * 🔑 Gera chave de cache para request
   */
  private getCacheKey(request: LLMRequest): string {
    return `llm_${Buffer.from(request.prompt).toString('base64').slice(0, 32)}_${request.temperature || 0.7}`;
  }

  /**
   * 💾 Obtém resposta do cache
   */
  private getCachedResponse(key: string): LLMResponse | null {
    const cached = this.responseCache.get(key);
    if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_DURATION) {
      return cached.response;
    }
    return null;
  }

  /**
   * 💾 Salva resposta no cache
   */
  private setCachedResponse(key: string, response: LLMResponse): void {
    this.responseCache.set(key, {
      response,
      timestamp: new Date()
    });
  }

  /**
   * 🏥 Health check dos provedores
   */
  private async healthCheck(): Promise<void> {
    console.log('🏥 Executando health check dos provedores...');
    
    for (const [name, provider] of this.providers) {
      try {
        const testRequest: LLMRequest = {
          prompt: 'ping',
          maxTokens: 10
        };
        
        await this.callProvider(provider, testRequest);
        provider.isActive = true;
        
        const stats = this.providerStats.get(name);
        if (stats) {
          stats.isActive = true;
          stats.lastTested = new Date();
        }
        
      } catch (error) {
        console.warn(`⚠️ Health check falhou para ${provider.name}:`, (error as Error).message);
        provider.isActive = false;
        
        const stats = this.providerStats.get(name);
        if (stats) {
          stats.isActive = false;
          stats.lastTested = new Date();
        }
      }
    }
  }

  /**
   * ⏰ Inicia timer de health check
   */
  private startHealthCheckTimer(): void {
    this.healthCheckTimer = setInterval(() => {
      this.healthCheck().catch(err => 
        console.error('❌ Erro no health check:', err.message)
      );
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * 📊 Obtém estatísticas dos provedores
   */
  public getProviderStats(): ProviderStatus[] {
    return Array.from(this.providerStats.values());
  }
  /**
   * 🔄 Força refresh de todos os provedores
   */
  public async forceRefresh(): Promise<void> {
    console.log('🔄 Forçando refresh de todos os provedores...');
    this.responseCache.clear();
    await this.healthCheck();
  }
  /**
   * 📊 Loga execução no Supabase - Tabela llm_execution_log
   */  private async logExecutionToSupabase(request: LLMRequest, response: LLMResponse, providerName: string): Promise<void> {
    try {
      // TEMPORÁRIO: Apenas logar no console para evitar erros de tabelas
      console.log('📊 [LLM EXECUTION LOG]:', {
        provider: providerName,
        model: response.modelUsed,
        success: response.success,
        latency: response.latency,
        tokens: response.tokensUsed?.total || 0,
        prompt_preview: request.prompt.substring(0, 100) + '...'
      });
      
      // Se Supabase não está configurado, apenas logar no console
      if (!this.supabase) {
        return;
      }

      // OPCIONAL: Tentar salvar no Supabase se a tabela existir
      try {
        const logData = {
          provider_name: providerName,
          model_used: response.modelUsed,
          prompt: request.prompt.substring(0, 1000),
          response_text: response.response.substring(0, 2000),
          system_message: request.systemMessage?.substring(0, 500) || null,
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 2048,
          tokens_used: response.tokensUsed?.total || 0,
          prompt_tokens: response.tokensUsed?.prompt || 0,
          completion_tokens: response.tokensUsed?.completion || 0,
          latency_ms: response.latency,
          attempt_count: response.attemptCount,
          success: response.success,
          cached: response.cached,
          execution_timestamp: new Date().toISOString(),
          user_id: null,
          session_id: null
        };

        const { error } = await this.supabase
          .from('llm_execution_log')
          .insert([logData]);

        if (error) {
          console.warn('⚠️ Tabela llm_execution_log não existe, usando apenas console logs');
        } else {
          console.log('📊 Log salvo no Supabase com sucesso');
        }
      } catch (dbError) {
        // Silenciar erros de banco para não quebrar a aplicação
        console.warn('⚠️ Log DB opcional falhou, continuando...');
      }
    } catch (error: any) {
      console.warn('⚠️ Falha geral no log:', error.message);
    }
  }

  /**
   * 📊 Retorna status detalhado dos provedores para debug
   */
  public getProviderStatus(): any {
    const providers = Array.from(this.providers.entries()).map(([key, config]) => ({
      key,
      name: config.name,
      isActive: config.isActive,
      hasApiKey: !!config.apiKey,
      models: config.models,
      priority: config.priority,
      stats: this.providerStats.get(key) || {}
    }));

    return {
      totalProviders: this.providers.size,
      activeProviders: providers.filter(p => p.isActive).length,
      providers,
      lastInitialized: new Date().toISOString()
    };
  }

  /**
   * 🧹 Cleanup
   */
  public destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
  }
}

// Singleton instance
export const llmDispatcher = new LLMDispatcher();
export default llmDispatcher;
