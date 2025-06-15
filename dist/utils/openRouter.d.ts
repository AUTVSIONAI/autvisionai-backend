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
export declare class OpenRouterService {
    private models;
    askWithFallback(prompt: string, systemPrompt?: string): Promise<{
        response: string;
        modelUsed: string;
        attemptCount: number;
        tokensUsed?: number;
    }>;
    private callOpenRouter;
    getAvailableModels(): Array<{
        name: string;
        model: string;
        configured: boolean;
    }>;
}
