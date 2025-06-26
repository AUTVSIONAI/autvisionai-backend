# 🚀 SCRIPT PARA CORRIGIR DEPLOY DO BACKEND NA VERCEL
# Este script força um novo deploy do backend na Vercel

Write-Host "🧹 LIMPANDO AMBIENTE BACKEND PARA NOVO DEPLOY..." -ForegroundColor Yellow

# 1. Limpar cache de build
Write-Host "🗑️ Removendo arquivos de cache do backend..." -ForegroundColor Cyan
if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
if (Test-Path "node_modules/.cache") { Remove-Item -Recurse -Force "node_modules/.cache" }

# 2. Fazer um novo build limpo
Write-Host "🔨 Fazendo build limpo do backend..." -ForegroundColor Cyan
npm run build

# 3. Verificar se build foi bem-sucedido
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build do backend realizado com sucesso!" -ForegroundColor Green
    
    # 4. Criar um commit vazio para forçar novo deploy
    Write-Host "📝 Criando commit para forçar deploy do backend..." -ForegroundColor Cyan
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    git add .
    git commit -m "🚀 Backend force redeploy - $timestamp" --allow-empty
    
    # 5. Push para o GitHub
    Write-Host "📤 Fazendo push para GitHub..." -ForegroundColor Cyan
    git push origin main
    
    Write-Host "🎉 BACKEND DEPLOY FORÇADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "⏰ A Vercel deve detectar as mudanças em alguns minutos." -ForegroundColor Yellow
    Write-Host "🔗 Verifique o deploy em: https://vercel.com/dashboard" -ForegroundColor Blue
    
} else {
    Write-Host "❌ ERRO NO BUILD DO BACKEND! Verifique os erros acima." -ForegroundColor Red
    exit 1
}
