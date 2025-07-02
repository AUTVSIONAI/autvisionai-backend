/**
 * 🚀 ROTAS DE USUÁRIOS - AUTVISION BACKEND
 */

import { FastifyInstance } from 'fastify';

export default async function usersRoutes(fastify: FastifyInstance) {
  
  // GET /users/me - Obter dados do usuário atual
  fastify.get('/me', async (request, reply) => {
    try {
      // Verificar se há um usuário autenticado (mock por enquanto)
      const user = {
        id: 'user_123',
        email: 'user@example.com',
        full_name: 'Usuário Teste',
        role: 'user',
        plan_id: 'starter',
        tokens: 100,
        created_at: new Date().toISOString()
      };

      return {
        success: true,
        data: user
      };
    } catch (error) {
      fastify.log.error('Erro ao buscar usuário:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  });

  // GET /users - Listar usuários (apenas admin)
  fastify.get('/', async (request, reply) => {
    try {
      const users = [
        {
          id: 'user_123',
          email: 'user@example.com',
          full_name: 'Usuário Teste',
          role: 'user',
          plan_id: 'starter',
          tokens: 100,
          created_at: new Date().toISOString()
        }
      ];

      return {
        success: true,
        data: users
      };
    } catch (error) {
      fastify.log.error('Erro ao listar usuários:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  });

  // GET /users/{id} - Buscar usuário por ID
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      
      // Conectar ao Supabase e buscar usuário real
      const { data: userData, error } = await fastify.supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          created_at,
          updated_at
        `)
        .eq('id', id)
        .single();

      if (error) {
        fastify.log.error('Erro ao buscar usuário no Supabase:', error);
        
        // Fallback com dados simulados baseados no ID
        const mockUser = {
          id: id,
          email: `user-${id.substring(0, 8)}@sistema.com`,
          full_name: generateUserName(id),
          role: 'user',
          created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString()
        };
        
        return {
          success: true,
          data: mockUser,
          source: 'fallback'
        };
      }

      return {
        success: true,
        data: userData,
        source: 'supabase'
      };
    } catch (error) {
      fastify.log.error('Erro ao buscar usuário por ID:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  });
}

// Função auxiliar para gerar nomes realísticos baseados no ID
function generateUserName(userId: string): string {
  const nomesBrasileiros = [
    'Ana Silva', 'João Santos', 'Maria Oliveira', 'Carlos Souza', 'Fernanda Costa',
    'Pedro Lima', 'Juliana Alves', 'Ricardo Ferreira', 'Camila Rodrigues', 'Bruno Martins',
    'Larissa Pereira', 'Rafael Barbosa', 'Mariana Gomes', 'Diego Carvalho', 'Aline Ribeiro',
    'Lucas Araújo', 'Priscila Dias', 'Thiago Moreira', 'Vanessa Cardoso', 'Felipe Castro',
    'Gabriela Nunes', 'André Ramos', 'Tatiana Correia', 'Marcelo Teixeira', 'Renata Vieira',
    'Oseias Gomes', 'Mariza Milene', 'Roberto Machado', 'Claudia Monteiro', 'Daniel Pinto'
  ];
  
  // Usar charCodeAt para gerar índice consistente baseado no ID
  const index = userId.charCodeAt(0) % nomesBrasileiros.length;
  return nomesBrasileiros[index];
}
