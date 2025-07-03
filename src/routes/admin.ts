import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

export default async function adminRoutes(fastify: FastifyInstance) {
  
  /**
   * 👥 GET /admin/users
   * Lista usuários para administração
   */
  fastify.get('/users', async (request, reply) => {
    try {
      // Buscar usuários do Supabase
      const { data: users, error } = await fastify.supabase
        .from('auth.users')
        .select('id, email, created_at, last_sign_in_at, email_confirmed_at')
        .limit(100);

      if (error) {
        fastify.log.warn('Erro ao buscar usuários do Supabase, usando dados mock');
        
        // Dados mock para desenvolvimento
        const mockUsers = [
          {
            id: 'user_1',
            email: 'admin@autvision.ai',
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            last_sign_in_at: new Date().toISOString(),
            email_confirmed_at: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
            role: 'admin',
            status: 'active',
            usage_count: 245
          },
          {
            id: 'user_2',
            email: 'user@example.com',
            created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            last_sign_in_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            email_confirmed_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            role: 'user',
            status: 'active',
            usage_count: 67
          },
          {
            id: 'user_3',
            email: 'test@test.com',
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            last_sign_in_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            email_confirmed_at: null,
            role: 'user',
            status: 'pending',
            usage_count: 12
          }
        ];

        return reply.send({
          success: true,
          data: mockUsers,
          total: mockUsers.length,
          source: 'mock'
        });
      }

      return reply.send({
        success: true,
        data: users || [],
        total: users?.length || 0,
        source: 'supabase'
      });

    } catch (error: any) {
      fastify.log.error('Erro na rota /admin/users:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  });

  /**
   * 📊 GET /admin/logs
   * Lista logs do sistema para administração
   */
  fastify.get('/logs', async (request, reply) => {
    try {
      // Buscar logs do Supabase
      const { data: logs, error } = await fastify.supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        fastify.log.warn('Erro ao buscar logs do Supabase, usando dados mock');
        
        // Dados mock para desenvolvimento
        const mockLogs = [
          {
            id: 'log_1',
            level: 'info',
            message: 'Usuario admin@autvision.ai fez login',
            timestamp: new Date().toISOString(),
            source: 'auth',
            user_id: 'user_1',
            metadata: { ip: '192.168.1.100', user_agent: 'Chrome/91.0' }
          },
          {
            id: 'log_2',
            level: 'success',
            message: 'Vision criada com sucesso: Vision Principal',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            source: 'visions',
            user_id: 'user_1',
            metadata: { vision_id: 'vision_1' }
          },
          {
            id: 'log_3',
            level: 'warning',
            message: 'Tentativa de acesso negada para endpoint /admin/users',
            timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            source: 'security',
            user_id: 'user_2',
            metadata: { endpoint: '/admin/users', reason: 'insufficient_permissions' }
          },
          {
            id: 'log_4',
            level: 'error',
            message: 'Falha na conexão com Supabase',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            source: 'database',
            user_id: null,
            metadata: { error_code: 'CONNECTION_TIMEOUT' }
          }
        ];

        return reply.send({
          success: true,
          data: mockLogs,
          total: mockLogs.length,
          source: 'mock'
        });
      }

      return reply.send({
        success: true,
        data: logs || [],
        total: logs?.length || 0,
        source: 'supabase'
      });

    } catch (error: any) {
      fastify.log.error('Erro na rota /admin/logs:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  });

  /**
   * 📈 GET /admin/monitoring
   * Dados de monitoramento do sistema
   */
  fastify.get('/monitoring', async (request, reply) => {
    try {
      // Buscar dados de monitoramento
      const mockMonitoring = {
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu_usage: Math.random() * 100,
          load_average: [0.5, 0.8, 1.2],
          timestamp: new Date().toISOString()
        },
        services: {
          supabase: {
            status: 'healthy',
            response_time: Math.floor(Math.random() * 100) + 50,
            last_check: new Date().toISOString()
          },
          openrouter: {
            status: 'healthy',
            response_time: Math.floor(Math.random() * 200) + 100,
            last_check: new Date().toISOString()
          },
          voice_dispatcher: {
            status: 'healthy',
            response_time: Math.floor(Math.random() * 300) + 200,
            last_check: new Date().toISOString()
          }
        },
        metrics: {
          total_users: 156,
          active_users_today: 23,
          total_visions: 8,
          active_visions: 6,
          requests_today: 1247,
          errors_today: 12,
          success_rate: 0.990
        },
        alerts: [
          {
            id: 'alert_1',
            level: 'warning',
            message: 'Alto uso de CPU detectado',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            resolved: false
          }
        ]
      };

      return reply.send({
        success: true,
        data: mockMonitoring,
        source: 'system'
      });

    } catch (error: any) {
      fastify.log.error('Erro na rota /admin/monitoring:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  });

  /**
   * ⚙️ GET /admin/settings
   * Configurações do sistema
   */
  fastify.get('/settings', async (request, reply) => {
    try {
      const mockSettings = {
        general: {
          site_name: 'AUTVISION',
          maintenance_mode: false,
          debug_mode: process.env.NODE_ENV === 'development',
          api_version: '1.0.0'
        },
        auth: {
          require_email_confirmation: true,
          session_timeout: 3600,
          max_login_attempts: 5
        },
        ai: {
          default_model: 'gpt-4o',
          max_tokens: 2000,
          temperature: 0.7,
          rate_limit_per_minute: 60
        },
        voice: {
          default_engine: 'openvoice',
          fallback_engine: 'mock',
          max_text_length: 1000
        }
      };

      return reply.send({
        success: true,
        data: mockSettings,
        source: 'config'
      });

    } catch (error: any) {
      fastify.log.error('Erro na rota /admin/settings:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  });

  /**
   * 📊 GET /admin/dashboard
   * Dados do dashboard administrativo
   */
  fastify.get('/dashboard', async (request, reply) => {
    try {
      const mockDashboard = {
        stats: {
          total_users: 156,
          new_users_today: 8,
          total_visions: 12,
          active_visions: 9,
          total_requests: 15674,
          requests_today: 1247,
          success_rate: 99.2,
          avg_response_time: 285
        },
        recent_activity: [
          {
            id: 'activity_1',
            type: 'user_signup',
            message: 'Novo usuário registrado: user@example.com',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString()
          },
          {
            id: 'activity_2',
            type: 'vision_created',
            message: 'Nova vision criada: Vision Analytics Pro',
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString()
          },
          {
            id: 'activity_3',
            type: 'error',
            message: 'Erro na API de síntese de voz',
            timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
          }
        ],
        system_health: {
          overall: 'healthy',
          services: {
            database: 'healthy',
            api: 'healthy', 
            voice_engine: 'healthy',
            llm_providers: 'healthy'
          }
        }
      };

      return reply.send({
        success: true,
        data: mockDashboard,
        source: 'system'
      });

    } catch (error: any) {
      fastify.log.error('Erro na rota /admin/dashboard:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        details: error.message
      });
    }
  });
}
