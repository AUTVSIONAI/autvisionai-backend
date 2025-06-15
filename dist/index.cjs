"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/fastify-plugin/lib/getPluginName.js
var require_getPluginName = __commonJS({
  "node_modules/fastify-plugin/lib/getPluginName.js"(exports2, module2) {
    "use strict";
    var fpStackTracePattern = /at\s{1}(?:.*\.)?plugin\s{1}.*\n\s*(.*)/;
    var fileNamePattern = /(\w*(\.\w*)*)\..*/;
    module2.exports = function getPluginName(fn) {
      if (fn.name.length > 0) return fn.name;
      const stackTraceLimit = Error.stackTraceLimit;
      Error.stackTraceLimit = 10;
      try {
        throw new Error("anonymous function");
      } catch (e) {
        Error.stackTraceLimit = stackTraceLimit;
        return extractPluginName(e.stack);
      }
    };
    function extractPluginName(stack) {
      const m = stack.match(fpStackTracePattern);
      return m ? m[1].split(/[/\\]/).slice(-1)[0].match(fileNamePattern)[1] : "anonymous";
    }
    module2.exports.extractPluginName = extractPluginName;
  }
});

// node_modules/fastify-plugin/lib/toCamelCase.js
var require_toCamelCase = __commonJS({
  "node_modules/fastify-plugin/lib/toCamelCase.js"(exports2, module2) {
    "use strict";
    module2.exports = function toCamelCase(name) {
      if (name[0] === "@") {
        name = name.slice(1).replace("/", "-");
      }
      const newName = name.replace(/-(.)/g, function(match, g1) {
        return g1.toUpperCase();
      });
      return newName;
    };
  }
});

// node_modules/fastify-plugin/plugin.js
var require_plugin = __commonJS({
  "node_modules/fastify-plugin/plugin.js"(exports2, module2) {
    "use strict";
    var getPluginName = require_getPluginName();
    var toCamelCase = require_toCamelCase();
    var count = 0;
    function plugin(fn, options = {}) {
      let autoName = false;
      if (typeof fn.default !== "undefined") {
        fn = fn.default;
      }
      if (typeof fn !== "function") {
        throw new TypeError(
          `fastify-plugin expects a function, instead got a '${typeof fn}'`
        );
      }
      if (typeof options === "string") {
        options = {
          fastify: options
        };
      }
      if (typeof options !== "object" || Array.isArray(options) || options === null) {
        throw new TypeError("The options object should be an object");
      }
      if (options.fastify !== void 0 && typeof options.fastify !== "string") {
        throw new TypeError(`fastify-plugin expects a version string, instead got '${typeof options.fastify}'`);
      }
      if (!options.name) {
        autoName = true;
        options.name = getPluginName(fn) + "-auto-" + count++;
      }
      fn[Symbol.for("skip-override")] = options.encapsulate !== true;
      fn[Symbol.for("fastify.display-name")] = options.name;
      fn[Symbol.for("plugin-meta")] = options;
      if (!fn.default) {
        fn.default = fn;
      }
      const camelCase = toCamelCase(options.name);
      if (!autoName && !fn[camelCase]) {
        fn[camelCase] = fn;
      }
      return fn;
    }
    module2.exports = plugin;
    module2.exports.default = plugin;
    module2.exports.fastifyPlugin = plugin;
  }
});

// src/index.ts
var import_fastify = __toESM(require("fastify"), 1);
var import_cors = __toESM(require("@fastify/cors"), 1);
var import_helmet = __toESM(require("@fastify/helmet"), 1);
var import_rate_limit = __toESM(require("@fastify/rate-limit"), 1);
var import_dotenv = require("dotenv");
var import_path = require("path");

// src/plugins/supabaseClient.ts
var import_supabase_js = require("@supabase/supabase-js");
var import_fastify_plugin = __toESM(require_plugin(), 1);
var supabasePlugin = async (fastify2) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("\u{1F534} Supabase credentials n\xE3o configuradas");
  }
  const supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  try {
    const { data, error } = await supabase.from("agents").select("count").limit(1);
    if (error) throw error;
    fastify2.log.info("\u2705 Supabase conectado com sucesso");
  } catch (error) {
    fastify2.log.error("\u{1F534} Erro ao conectar com Supabase:", error);
  }
  fastify2.decorate("supabase", supabase);
};
var supabaseClient_default = (0, import_fastify_plugin.default)(supabasePlugin, {
  name: "supabase"
});

// src/routes/command.ts
var import_zod = require("zod");
var executeCommandSchema = import_zod.z.object({
  command: import_zod.z.string().min(1, "Comando n\xE3o pode estar vazio"),
  agentId: import_zod.z.string().uuid("ID do agente deve ser um UUID v\xE1lido"),
  userId: import_zod.z.string().optional(),
  context: import_zod.z.object({
    source: import_zod.z.string().default("backend"),
    timestamp: import_zod.z.string().optional(),
    metadata: import_zod.z.record(import_zod.z.any()).optional()
  }).optional()
});
async function commandRoutes(fastify2) {
  fastify2.post("/execute", async (request, reply) => {
    try {
      const { command, agentId, userId, context } = executeCommandSchema.parse(request.body);
      const { data: agent, error: agentError } = await fastify2.supabase.from("agents").select("name, type, status").eq("id", agentId).single();
      if (agentError || !agent) {
        return reply.code(404).send({
          success: false,
          error: "Agente n\xE3o encontrado",
          code: "AGENT_NOT_FOUND"
        });
      }
      if (agent.status !== "active") {
        return reply.code(400).send({
          success: false,
          error: "Agente n\xE3o est\xE1 ativo",
          code: "AGENT_INACTIVE"
        });
      }
      const { data: execution, error: insertError } = await fastify2.supabase.from("command_executions").insert({
        command,
        agent_id: agentId,
        user_id: userId,
        status: "pending",
        context: context || { source: "backend", timestamp: (/* @__PURE__ */ new Date()).toISOString() },
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }).select().single();
      if (insertError) {
        fastify2.log.error("Erro ao gravar comando:", insertError);
        return reply.code(500).send({
          success: false,
          error: "Erro interno ao gravar comando",
          code: "DATABASE_ERROR"
        });
      }
      fastify2.log.info(`\u2705 Comando executado: ${command} (Agent: ${agent.name})`);
      return reply.send({
        success: true,
        data: {
          executionId: execution.id,
          command,
          agent: {
            id: agentId,
            name: agent.name,
            type: agent.type
          },
          status: "pending",
          timestamp: execution.created_at
        }
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /command/execute:", error);
      if (error instanceof import_zod.z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: "Dados inv\xE1lidos",
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      return reply.code(500).send({
        success: false,
        error: "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });
  fastify2.get("/history/:agentId", async (request, reply) => {
    try {
      const { agentId } = request.params;
      const { limit = 50, status } = request.query;
      let query = fastify2.supabase.from("command_executions").select("id, command, status, context, created_at, updated_at").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(limit);
      if (status) {
        query = query.eq("status", status);
      }
      const { data: history, error } = await query;
      if (error) {
        return reply.code(500).send({
          success: false,
          error: "Erro ao buscar hist\xF3rico",
          code: "DATABASE_ERROR"
        });
      }
      return reply.send({
        success: true,
        data: {
          agentId,
          history,
          total: history?.length || 0
        }
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /command/history:", error);
      return reply.code(500).send({
        success: false,
        error: "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });
}

// src/routes/llm.ts
var import_zod2 = require("zod");

// src/utils/openRouter.ts
var import_axios = __toESM(require("axios"), 1);
var OpenRouterService = class {
  models = [
    {
      name: "LLaMA 3.3 8B",
      model: "meta-llama/llama-3.3-8b-instruct:free",
      apiKey: process.env.LLM_LLAMA3_8B_KEY || ""
    },
    {
      name: "DeepSeek R1",
      model: "deepseek/deepseek-r1-0528:free",
      apiKey: process.env.LLM_DEEPSEEK_R1_KEY || ""
    },
    {
      name: "DeepSeek Prover",
      model: "deepseek/deepseek-prover-v2:free",
      apiKey: process.env.LLM_DEEPSEEK_PROVER_KEY || ""
    },
    {
      name: "DevStral",
      model: "mistralai/devstral-small:free",
      apiKey: process.env.LLM_DEVSTRAL_KEY || ""
    },
    {
      name: "Qwen 3",
      model: "qwen/qwen3-30b-a3b:free",
      apiKey: process.env.LLM_QWEN3_KEY || ""
    },
    {
      name: "LLaMA 4",
      model: "meta-llama/llama-4-maverick:free",
      apiKey: process.env.LLM_LLAMA4_KEY || ""
    }
  ];
  /**
   * 🧠 SISTEMA DE FALLBACK ROBUSTO
   * Tenta todos os modelos em sequência até obter resposta
   */
  async askWithFallback(prompt, systemPrompt) {
    let attemptCount = 0;
    const errors = [];
    for (const model of this.models) {
      attemptCount++;
      if (!model.apiKey || model.apiKey === "CONFIGURE_SUA_CHAVE_OPENROUTER_AQUI") {
        errors.push(`${model.name}: Chave n\xE3o configurada`);
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
      } catch (error) {
        errors.push(`${model.name}: ${error.message}`);
        console.log(`\u26A0\uFE0F Tentativa ${attemptCount} falhou (${model.name}):`, error.message);
      }
    }
    return {
      response: `\u{1F527} Sistema em modo de emerg\xEAncia. Configure as chaves OpenRouter para ativar a IA completa.

Erros encontrados:
${errors.join("\n")}`,
      modelUsed: "Sistema de Emerg\xEAncia",
      attemptCount,
      tokensUsed: 0
    };
  }
  /**
   * 📡 Chama a API OpenRouter para um modelo específico
   */
  async callOpenRouter(model, prompt, systemPrompt) {
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });
    const response = await import_axios.default.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: model.model,
        messages,
        max_tokens: 1e3,
        temperature: 0.7
      },
      {
        headers: {
          "Authorization": `Bearer ${model.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://autvision.ai",
          "X-Title": "AUTVISION Backend"
        },
        timeout: 3e4
      }
    );
    return response.data;
  }
  /**
   * 📋 Retorna lista de modelos disponíveis
   */
  getAvailableModels() {
    return this.models.map((model) => ({
      name: model.name,
      model: model.model,
      configured: !!(model.apiKey && model.apiKey !== "CONFIGURE_SUA_CHAVE_OPENROUTER_AQUI")
    }));
  }
};

// src/routes/llm.ts
var askLLMSchema = import_zod2.z.object({
  prompt: import_zod2.z.string().min(1, "Prompt n\xE3o pode estar vazio"),
  systemPrompt: import_zod2.z.string().optional(),
  agentId: import_zod2.z.string().uuid("ID do agente deve ser um UUID v\xE1lido").optional(),
  context: import_zod2.z.object({
    conversationId: import_zod2.z.string().optional(),
    userId: import_zod2.z.string().optional(),
    metadata: import_zod2.z.record(import_zod2.z.any()).optional()
  }).optional()
});
async function llmRoutes(fastify2) {
  const openRouter = new OpenRouterService();
  fastify2.post("/ask", async (request, reply) => {
    try {
      const { prompt, systemPrompt, agentId, context } = askLLMSchema.parse(request.body);
      fastify2.log.info(`\u{1F9E0} Nova consulta LLM: "${prompt.substring(0, 100)}..."`);
      let agentConfig = null;
      if (agentId) {
        const { data: agent } = await fastify2.supabase.from("agents").select("name, config").eq("id", agentId).single();
        agentConfig = agent;
      }
      const finalSystemPrompt = agentConfig?.config?.systemPrompt || systemPrompt || "Voc\xEA \xE9 o AUTVISION, um assistente de IA avan\xE7ado. Responda de forma \xFAtil e precisa.";
      const result = await openRouter.askWithFallback(prompt, finalSystemPrompt);
      await fastify2.supabase.from("llm_interactions").insert({
        prompt: prompt.substring(0, 1e3),
        // Limita o tamanho
        response: result.response.substring(0, 2e3),
        model_used: result.modelUsed,
        agent_id: agentId,
        tokens_used: result.tokensUsed,
        attempt_count: result.attemptCount,
        context,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      fastify2.log.info(`\u2705 LLM respondeu via ${result.modelUsed} (${result.attemptCount} tentativas)`);
      return reply.send({
        success: true,
        data: {
          response: result.response,
          modelUsed: result.modelUsed,
          attemptCount: result.attemptCount,
          tokensUsed: result.tokensUsed,
          agent: agentConfig?.name || "Sistema",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /llm/ask:", error);
      if (error instanceof import_zod2.z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: "Dados inv\xE1lidos",
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      return reply.code(500).send({
        success: false,
        error: "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });
  fastify2.post("/ask-specific", async (request, reply) => {
    try {
      const { prompt, systemPrompt, modelName } = request.body;
      if (!modelName) {
        return reply.code(400).send({
          success: false,
          error: "Nome do modelo \xE9 obrigat\xF3rio",
          code: "MODEL_NAME_REQUIRED"
        });
      }
      const result = await openRouter.askWithFallback(prompt, systemPrompt);
      return reply.send({
        success: true,
        data: result
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /llm/ask-specific:", error);
      return reply.code(500).send({
        success: false,
        error: "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });
  fastify2.get("/stats", async (request, reply) => {
    try {
      const { data: stats, error } = await fastify2.supabase.from("llm_interactions").select("model_used, tokens_used, attempt_count, created_at").gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3).toISOString());
      if (error) {
        return reply.code(500).send({
          success: false,
          error: "Erro ao buscar estat\xEDsticas",
          code: "DATABASE_ERROR"
        });
      }
      const modelStats = stats?.reduce((acc, item) => {
        if (!acc[item.model_used]) {
          acc[item.model_used] = { count: 0, totalTokens: 0, totalAttempts: 0 };
        }
        acc[item.model_used].count++;
        acc[item.model_used].totalTokens += item.tokens_used || 0;
        acc[item.model_used].totalAttempts += item.attempt_count || 1;
        return acc;
      }, {});
      return reply.send({
        success: true,
        data: {
          period: "7 dias",
          totalInteractions: stats?.length || 0,
          modelStats: modelStats || {},
          availableModels: openRouter.getAvailableModels()
        }
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /llm/stats:", error);
      return reply.code(500).send({
        success: false,
        error: "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });
}

// src/routes/n8n.ts
var import_zod3 = require("zod");
var import_axios2 = __toESM(require("axios"), 1);
var triggerWorkflowSchema = import_zod3.z.object({
  workflowId: import_zod3.z.string().min(1, "ID do workflow \xE9 obrigat\xF3rio"),
  data: import_zod3.z.record(import_zod3.z.any()).optional(),
  context: import_zod3.z.object({
    agentId: import_zod3.z.string().optional(),
    userId: import_zod3.z.string().optional(),
    source: import_zod3.z.string().default("autvision-backend")
  }).optional()
});
async function n8nRoutes(fastify2) {
  const N8N_API_URL = process.env.N8N_API_URL || "http://localhost:5678";
  const N8N_API_KEY = process.env.N8N_API_KEY;
  fastify2.post("/trigger", async (request, reply) => {
    try {
      const { workflowId, data, context } = triggerWorkflowSchema.parse(request.body);
      fastify2.log.info(`\u{1F504} Disparando workflow N8N: ${workflowId}`);
      const payload = {
        workflowId,
        data: data || {},
        context: {
          ...context,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          source: "autvision-backend"
        }
      };
      const headers = {
        "Content-Type": "application/json"
      };
      if (N8N_API_KEY) {
        headers["Authorization"] = `Bearer ${N8N_API_KEY}`;
      }
      const n8nResponse = await import_axios2.default.post(
        `${N8N_API_URL}/webhook/${workflowId}`,
        payload,
        {
          headers,
          timeout: 3e4
        }
      );
      await fastify2.supabase.from("n8n_executions").insert({
        workflow_id: workflowId,
        payload,
        response: n8nResponse.data,
        status: "success",
        agent_id: context?.agentId,
        user_id: context?.userId,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      fastify2.log.info(`\u2705 Workflow N8N executado com sucesso: ${workflowId}`);
      return reply.send({
        success: true,
        data: {
          workflowId,
          executionId: n8nResponse.data?.executionId,
          response: n8nResponse.data,
          status: "executed",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /n8n/trigger:", error);
      const { workflowId, context } = request.body || {};
      if (workflowId) {
        await fastify2.supabase.from("n8n_executions").insert({
          workflow_id: workflowId,
          payload: request.body,
          response: { error: error.message },
          status: "error",
          agent_id: context?.agentId,
          user_id: context?.userId,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      if (error instanceof import_zod3.z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: "Dados inv\xE1lidos",
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      if (error.code === "ECONNREFUSED") {
        return reply.code(503).send({
          success: false,
          error: "N8N n\xE3o est\xE1 acess\xEDvel",
          code: "N8N_UNAVAILABLE"
        });
      }
      return reply.code(500).send({
        success: false,
        error: "Erro ao executar workflow",
        details: error.message,
        code: "EXECUTION_ERROR"
      });
    }
  });
  fastify2.get("/workflows", async (request, reply) => {
    try {
      const headers = {
        "Content-Type": "application/json"
      };
      if (N8N_API_KEY) {
        headers["Authorization"] = `Bearer ${N8N_API_KEY}`;
      }
      const response = await import_axios2.default.get(`${N8N_API_URL}/api/v1/workflows`, {
        headers,
        timeout: 1e4
      });
      return reply.send({
        success: true,
        data: {
          workflows: response.data,
          total: response.data?.length || 0,
          n8nUrl: N8N_API_URL
        }
      });
    } catch (error) {
      fastify2.log.error("Erro ao buscar workflows N8N:", error);
      if (error.code === "ECONNREFUSED") {
        return reply.code(503).send({
          success: false,
          error: "N8N n\xE3o est\xE1 acess\xEDvel",
          code: "N8N_UNAVAILABLE"
        });
      }
      return reply.code(500).send({
        success: false,
        error: "Erro ao buscar workflows",
        code: "API_ERROR"
      });
    }
  });
  fastify2.get("/executions/:workflowId", async (request, reply) => {
    try {
      const { workflowId } = request.params;
      const { limit = 50, status } = request.query;
      let query = fastify2.supabase.from("n8n_executions").select("id, payload, response, status, created_at, agent_id, user_id").eq("workflow_id", workflowId).order("created_at", { ascending: false }).limit(limit);
      if (status) {
        query = query.eq("status", status);
      }
      const { data: executions, error } = await query;
      if (error) {
        return reply.code(500).send({
          success: false,
          error: "Erro ao buscar execu\xE7\xF5es",
          code: "DATABASE_ERROR"
        });
      }
      return reply.send({
        success: true,
        data: {
          workflowId,
          executions,
          total: executions?.length || 0
        }
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /n8n/executions:", error);
      return reply.code(500).send({
        success: false,
        error: "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });
}

// src/routes/ovos.ts
var import_zod4 = require("zod");
var import_axios3 = __toESM(require("axios"), 1);
var speakSchema = import_zod4.z.object({
  text: import_zod4.z.string().min(1, "Texto para fala n\xE3o pode estar vazio"),
  voice: import_zod4.z.string().optional(),
  settings: import_zod4.z.object({
    speed: import_zod4.z.number().min(0.1).max(3).optional(),
    pitch: import_zod4.z.number().min(-20).max(20).optional(),
    volume: import_zod4.z.number().min(0).max(1).optional()
  }).optional(),
  context: import_zod4.z.object({
    agentId: import_zod4.z.string().optional(),
    userId: import_zod4.z.string().optional(),
    source: import_zod4.z.string().default("autvision-backend")
  }).optional()
});
var listenSchema = import_zod4.z.object({
  timeout: import_zod4.z.number().min(1e3).max(3e4).default(5e3),
  language: import_zod4.z.string().default("pt-BR"),
  context: import_zod4.z.object({
    agentId: import_zod4.z.string().optional(),
    userId: import_zod4.z.string().optional()
  }).optional()
});
async function ovosRoutes(fastify2) {
  const OVOS_API_URL = process.env.OVOS_API_URL || "http://localhost:8181";
  const OVOS_TIMEOUT = parseInt(process.env.OVOS_TIMEOUT || "30000");
  fastify2.post("/speak", async (request, reply) => {
    try {
      const { text, voice, settings, context } = speakSchema.parse(request.body);
      fastify2.log.info(`\u{1F399}\uFE0F OVOS TTS: "${text.substring(0, 100)}..."`);
      const payload = {
        text,
        voice: voice || "default",
        settings: {
          speed: settings?.speed || 1,
          pitch: settings?.pitch || 0,
          volume: settings?.volume || 0.8
        },
        context: {
          ...context,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          source: "autvision-backend"
        }
      };
      const ovosResponse = await import_axios3.default.post(
        `${OVOS_API_URL}/api/v1/tts/speak`,
        payload,
        {
          headers: {
            "Content-Type": "application/json"
          },
          timeout: OVOS_TIMEOUT
        }
      );
      await fastify2.supabase.from("ovos_interactions").insert({
        type: "tts",
        input: text,
        output: ovosResponse.data,
        status: "success",
        agent_id: context?.agentId,
        user_id: context?.userId,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      fastify2.log.info(`\u2705 OVOS TTS executado com sucesso`);
      return reply.send({
        success: true,
        data: {
          text,
          voice: voice || "default",
          audioUrl: ovosResponse.data?.audioUrl,
          duration: ovosResponse.data?.duration,
          status: "completed",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /ovos/speak:", error);
      const { text, context } = request.body || {};
      if (text) {
        await fastify2.supabase.from("ovos_interactions").insert({
          type: "tts",
          input: text,
          output: { error: error.message },
          status: "error",
          agent_id: context?.agentId,
          user_id: context?.userId,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
      if (error instanceof import_zod4.z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: "Dados inv\xE1lidos",
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      if (error.code === "ECONNREFUSED") {
        return reply.code(503).send({
          success: false,
          error: "OVOS n\xE3o est\xE1 acess\xEDvel",
          code: "OVOS_UNAVAILABLE"
        });
      }
      return reply.code(500).send({
        success: false,
        error: "Erro ao executar TTS",
        details: error.message,
        code: "TTS_ERROR"
      });
    }
  });
  fastify2.post("/listen", async (request, reply) => {
    try {
      const { timeout, language, context } = listenSchema.parse(request.body);
      fastify2.log.info(`\u{1F442} OVOS STT iniciado (${language}, timeout: ${timeout}ms)`);
      const payload = {
        timeout,
        language,
        context: {
          ...context,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          source: "autvision-backend"
        }
      };
      const ovosResponse = await import_axios3.default.post(
        `${OVOS_API_URL}/api/v1/stt/listen`,
        payload,
        {
          headers: {
            "Content-Type": "application/json"
          },
          timeout: timeout + 5e3
          // Timeout um pouco maior que o do OVOS
        }
      );
      const transcription = ovosResponse.data?.transcription || "";
      const confidence = ovosResponse.data?.confidence || 0;
      await fastify2.supabase.from("ovos_interactions").insert({
        type: "stt",
        input: `Escuta de ${timeout}ms em ${language}`,
        output: { transcription, confidence },
        status: "success",
        agent_id: context?.agentId,
        user_id: context?.userId,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      fastify2.log.info(`\u2705 OVOS STT conclu\xEDdo: "${transcription}"`);
      return reply.send({
        success: true,
        data: {
          transcription,
          confidence,
          language,
          duration: ovosResponse.data?.duration,
          status: "completed",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /ovos/listen:", error);
      const { language, context } = request.body || {};
      await fastify2.supabase.from("ovos_interactions").insert({
        type: "stt",
        input: `Tentativa de escuta em ${language}`,
        output: { error: error.message },
        status: "error",
        agent_id: context?.agentId,
        user_id: context?.userId,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (error instanceof import_zod4.z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: "Dados inv\xE1lidos",
          details: error.errors,
          code: "VALIDATION_ERROR"
        });
      }
      if (error.code === "ECONNREFUSED") {
        return reply.code(503).send({
          success: false,
          error: "OVOS n\xE3o est\xE1 acess\xEDvel",
          code: "OVOS_UNAVAILABLE"
        });
      }
      return reply.code(500).send({
        success: false,
        error: "Erro ao executar STT",
        details: error.message,
        code: "STT_ERROR"
      });
    }
  });
  fastify2.get("/status", async (request, reply) => {
    try {
      const response = await import_axios3.default.get(`${OVOS_API_URL}/api/v1/status`, {
        timeout: 5e3
      });
      return reply.send({
        success: true,
        data: {
          ovos: response.data,
          connection: "active",
          url: OVOS_API_URL,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    } catch (error) {
      fastify2.log.error("Erro ao verificar status OVOS:", error);
      if (error.code === "ECONNREFUSED") {
        return reply.code(503).send({
          success: false,
          error: "OVOS n\xE3o est\xE1 acess\xEDvel",
          code: "OVOS_UNAVAILABLE",
          data: {
            connection: "inactive",
            url: OVOS_API_URL
          }
        });
      }
      return reply.code(500).send({
        success: false,
        error: "Erro ao verificar status",
        code: "STATUS_ERROR"
      });
    }
  });
  fastify2.get("/interactions", async (request, reply) => {
    try {
      const { type, limit = 50, agentId } = request.query;
      let query = fastify2.supabase.from("ovos_interactions").select("id, type, input, output, status, created_at, agent_id, user_id").order("created_at", { ascending: false }).limit(limit);
      if (type) {
        query = query.eq("type", type);
      }
      if (agentId) {
        query = query.eq("agent_id", agentId);
      }
      const { data: interactions, error } = await query;
      if (error) {
        return reply.code(500).send({
          success: false,
          error: "Erro ao buscar intera\xE7\xF5es",
          code: "DATABASE_ERROR"
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
      fastify2.log.error("Erro na rota /ovos/interactions:", error);
      return reply.code(500).send({
        success: false,
        error: "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });
}

// src/routes/logs.ts
async function logsRoutes(fastify2) {
  fastify2.get("/mcp", async (request, reply) => {
    try {
      const {
        status,
        limit = 100,
        agentId,
        startDate,
        endDate
      } = request.query;
      let query = fastify2.supabase.from("command_executions").select(`
          id,
          command,
          status,
          context,
          created_at,
          updated_at,
          agent_id,
          user_id,
          agents(name, type)
        `).order("created_at", { ascending: false }).limit(limit);
      if (status) {
        query = query.eq("status", status);
      }
      if (agentId) {
        query = query.eq("agent_id", agentId);
      }
      if (startDate) {
        query = query.gte("created_at", startDate);
      }
      if (endDate) {
        query = query.lte("created_at", endDate);
      }
      const { data: mcpLogs, error } = await query;
      if (error) {
        fastify2.log.error("Erro ao buscar logs MCP:", error);
        return reply.code(500).send({
          success: false,
          error: "Erro ao buscar logs MCP",
          code: "DATABASE_ERROR"
        });
      }
      const stats = {
        total: mcpLogs?.length || 0,
        byStatus: mcpLogs?.reduce((acc, log) => {
          acc[log.status] = (acc[log.status] || 0) + 1;
          return acc;
        }, {}),
        byAgent: mcpLogs?.reduce((acc, log) => {
          const agentName = log.agents?.name || "Unknown";
          acc[agentName] = (acc[agentName] || 0) + 1;
          return acc;
        }, {})
      };
      return reply.send({
        success: true,
        data: {
          logs: mcpLogs,
          stats,
          filters: {
            status,
            agentId,
            startDate,
            endDate,
            limit
          },
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /logs/mcp:", error);
      return reply.code(500).send({
        success: false,
        error: "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });
  fastify2.get("/llm", async (request, reply) => {
    try {
      const { modelUsed, limit = 100, agentId, minTokens } = request.query;
      let query = fastify2.supabase.from("llm_interactions").select(`
          id,
          prompt,
          response,
          model_used,
          tokens_used,
          attempt_count,
          created_at,
          agent_id,
          user_id,
          context
        `).order("created_at", { ascending: false }).limit(limit);
      if (modelUsed) {
        query = query.eq("model_used", modelUsed);
      }
      if (agentId) {
        query = query.eq("agent_id", agentId);
      }
      if (minTokens) {
        query = query.gte("tokens_used", minTokens);
      }
      const { data: llmLogs, error } = await query;
      if (error) {
        return reply.code(500).send({
          success: false,
          error: "Erro ao buscar logs LLM",
          code: "DATABASE_ERROR"
        });
      }
      const stats = {
        total: llmLogs?.length || 0,
        totalTokens: llmLogs?.reduce((sum, log) => sum + (log.tokens_used || 0), 0),
        avgTokensPerInteraction: llmLogs?.length ? Math.round(llmLogs.reduce((sum, log) => sum + (log.tokens_used || 0), 0) / llmLogs.length) : 0,
        byModel: llmLogs?.reduce((acc, log) => {
          acc[log.model_used] = (acc[log.model_used] || 0) + 1;
          return acc;
        }, {}),
        avgAttempts: llmLogs?.length ? Math.round(llmLogs.reduce((sum, log) => sum + (log.attempt_count || 1), 0) / llmLogs.length * 10) / 10 : 0
      };
      return reply.send({
        success: true,
        data: {
          logs: llmLogs,
          stats,
          filters: {
            modelUsed,
            agentId,
            minTokens,
            limit
          }
        }
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /logs/llm:", error);
      return reply.code(500).send({
        success: false,
        error: "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });
  fastify2.get("/n8n", async (request, reply) => {
    try {
      const { workflowId, status, limit = 100 } = request.query;
      let query = fastify2.supabase.from("n8n_executions").select(`
          id,
          workflow_id,
          payload,
          response,
          status,
          created_at,
          agent_id,
          user_id
        `).order("created_at", { ascending: false }).limit(limit);
      if (workflowId) {
        query = query.eq("workflow_id", workflowId);
      }
      if (status) {
        query = query.eq("status", status);
      }
      const { data: n8nLogs, error } = await query;
      if (error) {
        return reply.code(500).send({
          success: false,
          error: "Erro ao buscar logs N8N",
          code: "DATABASE_ERROR"
        });
      }
      const stats = {
        total: n8nLogs?.length || 0,
        byStatus: n8nLogs?.reduce((acc, log) => {
          acc[log.status] = (acc[log.status] || 0) + 1;
          return acc;
        }, {}),
        byWorkflow: n8nLogs?.reduce((acc, log) => {
          acc[log.workflow_id] = (acc[log.workflow_id] || 0) + 1;
          return acc;
        }, {}),
        successRate: n8nLogs?.length ? Math.round(n8nLogs.filter((log) => log.status === "success").length / n8nLogs.length * 100) : 0
      };
      return reply.send({
        success: true,
        data: {
          logs: n8nLogs,
          stats,
          filters: {
            workflowId,
            status,
            limit
          }
        }
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /logs/n8n:", error);
      return reply.code(500).send({
        success: false,
        error: "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });
  fastify2.get("/ovos", async (request, reply) => {
    try {
      const { type, status, limit = 100 } = request.query;
      let query = fastify2.supabase.from("ovos_interactions").select(`
          id,
          type,
          input,
          output,
          status,
          created_at,
          agent_id,
          user_id
        `).order("created_at", { ascending: false }).limit(limit);
      if (type) {
        query = query.eq("type", type);
      }
      if (status) {
        query = query.eq("status", status);
      }
      const { data: ovosLogs, error } = await query;
      if (error) {
        return reply.code(500).send({
          success: false,
          error: "Erro ao buscar logs OVOS",
          code: "DATABASE_ERROR"
        });
      }
      const stats = {
        total: ovosLogs?.length || 0,
        byType: ovosLogs?.reduce((acc, log) => {
          acc[log.type] = (acc[log.type] || 0) + 1;
          return acc;
        }, {}),
        byStatus: ovosLogs?.reduce((acc, log) => {
          acc[log.status] = (acc[log.status] || 0) + 1;
          return acc;
        }, {}),
        successRate: ovosLogs?.length ? Math.round(ovosLogs.filter((log) => log.status === "success").length / ovosLogs.length * 100) : 0
      };
      return reply.send({
        success: true,
        data: {
          logs: ovosLogs,
          stats,
          filters: {
            type,
            status,
            limit
          }
        }
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /logs/ovos:", error);
      return reply.code(500).send({
        success: false,
        error: "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });
  fastify2.get("/dashboard", async (request, reply) => {
    try {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
      const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3).toISOString();
      const [mcpLogs, llmLogs, n8nLogs, ovosLogs] = await Promise.all([
        fastify2.supabase.from("command_executions").select("status, created_at").gte("created_at", last7d),
        fastify2.supabase.from("llm_interactions").select("model_used, tokens_used, created_at").gte("created_at", last7d),
        fastify2.supabase.from("n8n_executions").select("status, created_at").gte("created_at", last7d),
        fastify2.supabase.from("ovos_interactions").select("type, status, created_at").gte("created_at", last7d)
      ]);
      const dashboard = {
        period: "7 dias",
        mcp: {
          total: mcpLogs.data?.length || 0,
          last24h: mcpLogs.data?.filter((log) => log.created_at >= last24h).length || 0,
          successRate: mcpLogs.data?.length ? Math.round(mcpLogs.data.filter((log) => log.status === "success").length / mcpLogs.data.length * 100) : 0
        },
        llm: {
          total: llmLogs.data?.length || 0,
          last24h: llmLogs.data?.filter((log) => log.created_at >= last24h).length || 0,
          totalTokens: llmLogs.data?.reduce((sum, log) => sum + (log.tokens_used || 0), 0) || 0,
          topModel: llmLogs.data?.reduce((acc, log) => {
            acc[log.model_used] = (acc[log.model_used] || 0) + 1;
            return acc;
          }, {})
        },
        n8n: {
          total: n8nLogs.data?.length || 0,
          last24h: n8nLogs.data?.filter((log) => log.created_at >= last24h).length || 0,
          successRate: n8nLogs.data?.length ? Math.round(n8nLogs.data.filter((log) => log.status === "success").length / n8nLogs.data.length * 100) : 0
        },
        ovos: {
          total: ovosLogs.data?.length || 0,
          last24h: ovosLogs.data?.filter((log) => log.created_at >= last24h).length || 0,
          tts: ovosLogs.data?.filter((log) => log.type === "tts").length || 0,
          stt: ovosLogs.data?.filter((log) => log.type === "stt").length || 0
        },
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      return reply.send({
        success: true,
        data: dashboard
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /logs/dashboard:", error);
      return reply.code(500).send({
        success: false,
        error: "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });
}

// src/routes/config.ts
async function configRoutes(fastify2) {
  const openRouter = new OpenRouterService();
  fastify2.get("/llms", async (request, reply) => {
    try {
      const { data: llmConfigs, error } = await fastify2.supabase.from("llm_configs").select("*").eq("active", true).order("priority", { ascending: true });
      if (error) {
        fastify2.log.error("Erro ao buscar LLMs do Supabase:", error);
      }
      const availableModels = openRouter.getAvailableModels();
      const llms = availableModels.map((model) => {
        const dbConfig = llmConfigs?.find((config2) => config2.model_name === model.model);
        return {
          ...model,
          id: dbConfig?.id,
          priority: dbConfig?.priority || 999,
          systemPrompt: dbConfig?.system_prompt,
          maxTokens: dbConfig?.max_tokens || 1e3,
          temperature: dbConfig?.temperature || 0.7,
          active: dbConfig?.active || model.configured,
          lastUsed: dbConfig?.last_used,
          totalUsage: dbConfig?.total_usage || 0,
          successRate: dbConfig?.success_rate || 0
        };
      });
      llms.sort((a, b) => a.priority - b.priority);
      return reply.send({
        success: true,
        data: {
          llms,
          total: llms.length,
          configured: llms.filter((llm) => llm.configured).length,
          active: llms.filter((llm) => llm.active).length,
          fallbackOrder: llms.filter((llm) => llm.configured).map((llm) => llm.name)
        }
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /config/llms:", error);
      return reply.code(500).send({
        success: false,
        error: "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });
  fastify2.put("/llms/:id", async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;
      if (updates.temperature && (updates.temperature < 0 || updates.temperature > 2)) {
        return reply.code(400).send({
          success: false,
          error: "Temperature deve estar entre 0 e 2",
          code: "INVALID_TEMPERATURE"
        });
      }
      if (updates.maxTokens && (updates.maxTokens < 1 || updates.maxTokens > 4e3)) {
        return reply.code(400).send({
          success: false,
          error: "Max tokens deve estar entre 1 e 4000",
          code: "INVALID_MAX_TOKENS"
        });
      }
      const { data, error } = await fastify2.supabase.from("llm_configs").update({
        ...updates,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", id).select().single();
      if (error) {
        fastify2.log.error("Erro ao atualizar LLM config:", error);
        return reply.code(500).send({
          success: false,
          error: "Erro ao atualizar configura\xE7\xE3o",
          code: "DATABASE_ERROR"
        });
      }
      if (!data) {
        return reply.code(404).send({
          success: false,
          error: "Configura\xE7\xE3o LLM n\xE3o encontrada",
          code: "LLM_CONFIG_NOT_FOUND"
        });
      }
      fastify2.log.info(`\u2705 LLM config atualizada: ${id}`);
      return reply.send({
        success: true,
        data
      });
    } catch (error) {
      fastify2.log.error("Erro na rota PUT /config/llms:", error);
      return reply.code(500).send({
        success: false,
        error: "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });
  fastify2.get("/agents", async (request, reply) => {
    try {
      const { data: agents, error } = await fastify2.supabase.from("agents").select(`
          id,
          name,
          type,
          status,
          config,
          created_at,
          updated_at
        `).order("name", { ascending: true });
      if (error) {
        return reply.code(500).send({
          success: false,
          error: "Erro ao buscar agentes",
          code: "DATABASE_ERROR"
        });
      }
      const stats = {
        total: agents?.length || 0,
        active: agents?.filter((agent) => agent.status === "active").length || 0,
        byType: agents?.reduce((acc, agent) => {
          acc[agent.type] = (acc[agent.type] || 0) + 1;
          return acc;
        }, {})
      };
      return reply.send({
        success: true,
        data: {
          agents,
          stats
        }
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /config/agents:", error);
      return reply.code(500).send({
        success: false,
        error: "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });
  fastify2.get("/system", async (request, reply) => {
    try {
      const { data: systemConfigs, error } = await fastify2.supabase.from("system_configs").select("*").eq("active", true);
      if (error) {
        fastify2.log.error("Erro ao buscar configs do sistema:", error);
      }
      const configs = {
        version: "1.0.0",
        environment: process.env.NODE_ENV || "development",
        services: {
          supabase: {
            url: process.env.SUPABASE_URL,
            connected: true
            // TODO: implementar check real
          },
          openrouter: {
            modelsConfigured: openRouter.getAvailableModels().filter((m) => m.configured).length,
            totalModels: openRouter.getAvailableModels().length
          },
          n8n: {
            url: process.env.N8N_API_URL,
            connected: false
            // TODO: implementar check real
          },
          ovos: {
            url: process.env.OVOS_API_URL,
            connected: false
            // TODO: implementar check real
          }
        },
        features: {
          llmFallback: true,
          voiceCommands: true,
          automation: true,
          logging: true
        },
        customConfigs: systemConfigs || [],
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      };
      return reply.send({
        success: true,
        data: configs
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /config/system:", error);
      return reply.code(500).send({
        success: false,
        error: "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });
  fastify2.get("/health", async (request, reply) => {
    try {
      const healthChecks = {
        backend: {
          status: "healthy",
          uptime: process.uptime(),
          version: "1.0.0"
        },
        supabase: {
          status: "unknown",
          connected: false,
          latency: 0
        },
        openrouter: {
          status: "unknown",
          modelsAvailable: 0,
          modelsConfigured: 0
        },
        n8n: {
          status: "unknown",
          connected: false
        },
        ovos: {
          status: "unknown",
          connected: false
        }
      };
      try {
        const start2 = Date.now();
        const { error } = await fastify2.supabase.from("agents").select("count").limit(1);
        const latency = Date.now() - start2;
        healthChecks.supabase = {
          status: error ? "error" : "healthy",
          connected: !error,
          latency
        };
      } catch (error) {
        healthChecks.supabase.status = "error";
      }
      const models = openRouter.getAvailableModels();
      healthChecks.openrouter = {
        status: models.some((m) => m.configured) ? "healthy" : "warning",
        modelsAvailable: models.length,
        modelsConfigured: models.filter((m) => m.configured).length
      };
      const overallStatus = Object.values(healthChecks).every(
        (service) => service.status === "healthy"
      ) ? "healthy" : "degraded";
      return reply.send({
        success: true,
        status: overallStatus,
        data: healthChecks,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      fastify2.log.error("Erro na rota /config/health:", error);
      return reply.code(500).send({
        success: false,
        status: "error",
        error: "Erro interno do servidor",
        code: "INTERNAL_ERROR"
      });
    }
  });
}

// src/index.ts
var __dirname = process.cwd();
(0, import_dotenv.config)({ path: (0, import_path.join)(__dirname, ".env.server") });
console.log("\u{1F50D} DEBUG - Vari\xE1veis de ambiente:");
console.log("- SUPABASE_URL:", process.env.SUPABASE_URL ? "\u2705 Definida" : "\u274C N\xE3o encontrada");
console.log("- SUPABASE_SERVICE_ROLE_KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "\u2705 Definida" : "\u274C N\xE3o encontrada");
console.log("- PORT:", process.env.PORT || "Usando padr\xE3o");
console.log("- Arquivo .env.server path:", (0, import_path.join)(__dirname, ".env.server"));
var fastify = (0, import_fastify.default)({
  logger: {
    level: process.env.NODE_ENV === "production" ? "info" : "debug"
  }
});
fastify.addHook("preHandler", async (request, reply) => {
  if (request.url === "/health" || request.url === "/config/health") {
    return;
  }
  const apiKey = request.headers["x-api-key"];
  const expectedApiKey = process.env.API_KEY;
  if (!expectedApiKey) {
    fastify.log.warn("\u26A0\uFE0F API_KEY n\xE3o configurada no ambiente");
    return;
  }
  if (!apiKey || apiKey !== expectedApiKey) {
    return reply.code(401).send({
      success: false,
      error: "API key inv\xE1lida ou ausente",
      code: "UNAUTHORIZED"
    });
  }
});
async function setupSecurity() {
  await fastify.register(import_cors.default, {
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:5175",
      "https://autvision.ai",
      "https://autvisionai.com",
      "https://www.autvisionai.com",
      "https://autvisionai-real.vercel.app",
      /\.autvision\.ai$/,
      /\.autvisionai\.com$/,
      /\.vercel\.app$/
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "Origin"]
  });
  await fastify.register(import_helmet.default, {
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  });
  await fastify.register(import_rate_limit.default, {
    max: 100,
    timeWindow: "1 minute",
    errorResponseBuilder: (request, context) => ({
      success: false,
      error: "Muitas requisi\xE7\xF5es. Tente novamente em 1 minuto.",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: context.after
    })
  });
}
async function setupPlugins() {
  await fastify.register(supabaseClient_default);
}
async function setupRoutes() {
  fastify.get("/", async (request, reply) => {
    return {
      success: true,
      service: "AUTVISION Backend",
      version: "1.0.0",
      status: "running",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      endpoints: {
        commands: "/command/*",
        llm: "/llm/*",
        n8n: "/n8n/*",
        ovos: "/ovos/*",
        logs: "/logs/*",
        config: "/config/*"
      }
    };
  });
  fastify.get("/health", async (request, reply) => {
    return {
      success: true,
      status: "healthy",
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  });
  await fastify.register(commandRoutes, { prefix: "/command" });
  await fastify.register(llmRoutes, { prefix: "/llm" });
  await fastify.register(n8nRoutes, { prefix: "/n8n" });
  await fastify.register(ovosRoutes, { prefix: "/ovos" });
  await fastify.register(logsRoutes, { prefix: "/logs" });
  await fastify.register(configRoutes, { prefix: "/config" });
}
async function start() {
  try {
    console.log("\u{1F527} Iniciando configura\xE7\xE3o...");
    console.log("\u{1F6E1}\uFE0F Configurando seguran\xE7a...");
    await setupSecurity();
    console.log("\u{1F50C} Configurando plugins...");
    await setupPlugins();
    console.log("\u{1F6E3}\uFE0F Configurando rotas...");
    await setupRoutes();
    const port = parseInt(process.env.PORT || "3001");
    const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "localhost";
    console.log(`\u{1F680} Iniciando servidor em ${host}:${port}...`);
    await fastify.listen({ port, host });
    fastify.log.info(`
\u{1F680} AUTVISION Backend iniciado com sucesso!

\u{1F4CD} Servidor: http://${host}:${port}
\u{1F510} API Key: ${process.env.API_KEY ? "\u2705 Configurada" : "\u274C N\xE3o configurada"}
\u{1F5C4}\uFE0F Supabase: ${process.env.SUPABASE_URL ? "\u2705 Conectado" : "\u274C N\xE3o configurado"}
\u{1F9E0} OpenRouter: ${process.env.LLM_LLAMA3_8B_KEY !== "CONFIGURE_SUA_CHAVE_OPENROUTER_AQUI" ? "\u2705 Configurado" : "\u274C Chaves n\xE3o configuradas"}
\u{1F504} N8N: ${process.env.N8N_API_URL}
\u{1F399}\uFE0F OVOS: ${process.env.OVOS_API_URL}

\u{1F4DA} Documenta\xE7\xE3o: http://${host}:${port}/
\u{1F3E5} Health Check: http://${host}:${port}/health
    `);
  } catch (error) {
    console.error("\u274C Erro ao iniciar servidor:", error);
    fastify.log.error("\u274C Erro ao iniciar servidor:", error);
    process.exit(1);
  }
}
var gracefulShutdown = async (signal) => {
  fastify.log.info(`\u{1F4F4} Recebido sinal ${signal}, encerrando servidor...`);
  try {
    await fastify.close();
    fastify.log.info("\u2705 Servidor encerrado com sucesso");
    process.exit(0);
  } catch (error) {
    fastify.log.error("\u274C Erro ao encerrar servidor:", error);
    process.exit(1);
  }
};
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
start();
