import { FastifyInstance } from 'fastify';
import { readFileSync } from 'fs';
import { join } from 'path';

export default async function sqlExecutorRoutes(fastify: FastifyInstance) {
  
  // Endpoint para executar o SQL do VoiceDispatcher
  fastify.post('/execute-voice-setup', async (request, reply) => {
    try {
      const sqlPath = join(__dirname, '../../_sql/voice_dispatcher_setup.sql');
      const sql = readFileSync(sqlPath, 'utf8');
      
      // Dividir o SQL em statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--') && s !== '');
      
      const results = [];
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            console.log('Executando:', statement.substring(0, 50) + '...');
            
            // Executar usando o cliente Supabase do fastify
            const { data, error } = await fastify.supabase
              .rpc('exec_sql', { sql_query: statement });
            
            if (error) {
              console.error('Erro SQL:', error);
              results.push({ 
                sql: statement.substring(0, 100) + '...', 
                error: error.message 
              });
            } else {
              console.log('✅ OK');
              results.push({ 
                sql: statement.substring(0, 100) + '...', 
                success: true 
              });
            }
          } catch (err) {
            console.error('Erro ao executar:', err);
            results.push({ 
              sql: statement.substring(0, 100) + '...', 
              error: err.message 
            });
          }
        }
      }
      
      reply.send({ 
        success: true, 
        message: 'SQL executado',
        results: results 
      });
      
    } catch (error) {
      console.error('Erro ao executar SQL:', error);
      reply.code(500).send({ 
        success: false, 
        error: 'Erro ao executar SQL setup',
        details: error.message 
      });
    }
  });
  
  // Endpoint para executar SQL direto
  fastify.post('/execute-sql', async (request, reply) => {
    try {
      const { sql } = request.body as { sql: string };
      
      // Executar SQL direto no Supabase
      const { data, error } = await fastify.supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        // Se não existir exec_sql, tentar executar diretamente
        console.log('Tentando executar SQL direto...');
        
        // Para DDL (CREATE TABLE, etc.), usar from() pode não funcionar
        // Vamos tentar usar uma abordagem alternativa
        const { data: result, error: directError } = await fastify.supabase
          .from('information_schema.tables')
          .select('table_name')
          .limit(1);
        
        if (directError) {
          reply.code(500).send({ 
            success: false, 
            error: 'Erro ao executar SQL',
            details: directError.message 
          });
          return;
        }
        
        // Se chegou aqui, conexão OK, mas exec_sql não existe
        reply.send({ 
          success: false,
          error: 'Função exec_sql não disponível no Supabase',
          suggestion: 'Execute o SQL diretamente no painel do Supabase' 
        });
      } else {
        reply.send({ 
          success: true, 
          data: data 
        });
      }
      
    } catch (error) {
      console.error('Erro ao executar SQL:', error);
      reply.code(500).send({ 
        success: false, 
        error: 'Erro ao executar SQL',
        details: error.message 
      });
    }
  });
}
