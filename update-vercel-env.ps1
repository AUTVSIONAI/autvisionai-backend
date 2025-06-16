# Script para atualizar variáveis de ambiente na Vercel
# Execute este script do diretório backend-autvision

Write-Host "🔧 Atualizando variáveis de ambiente na Vercel..." -ForegroundColor Green

# Chaves LLMs OpenRouter funcionais
Write-Host "📡 Configurando chaves OpenRouter..." -ForegroundColor Yellow
echo "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" | vercel env add LLM_LLAMA3_8B_KEY production
echo "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" | vercel env add LLM_DEEPSEEK_R1_KEY production  
echo "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" | vercel env add LLM_DEEPSEEK_PROVER_KEY production
echo "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" | vercel env add LLM_DEVSTRAL_KEY production
echo "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" | vercel env add LLM_QWEN3_KEY production
echo "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" | vercel env add LLM_LLAMA4_KEY production

# Chave principal OpenRouter
Write-Host "🔑 Configurando chave principal OpenRouter..." -ForegroundColor Yellow
echo "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" | vercel env add OPENROUTER_API_KEY production

Write-Host "✅ Variáveis de ambiente atualizadas com sucesso!" -ForegroundColor Green
Write-Host "🚀 Fazendo redeploy..." -ForegroundColor Cyan

# Redeploy do backend
vercel --prod

Write-Host "🎉 Backend atualizado e deployado!" -ForegroundColor Green
