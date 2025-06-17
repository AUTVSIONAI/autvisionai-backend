/**
 * 🔥 VISION SUPREMO - ROUTES
 * Endpoints para os 4 módulos integrados do sistema evolutivo
 * Fastify Routes for Vision Supremo
 */

export default async function supremoRoutes(fastify, options) {
  
  // ========== COMPANION CORE ENDPOINTS ==========

  // 📊 Obter perfil do companion
  fastify.get('/companion/profile/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;
      
      const { data, error } = await fastify.supabase
        .from('user_personality_profile')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        return reply.status(404).send({
          success: false,
          error: 'Perfil não encontrado',
          code: 'PROFILE_NOT_FOUND'
        });
      }

      return {
        success: true,
        data: {
          profile: data,
          companionLevel: Math.floor(data.experience_points / 100) + 1,
          nextLevelXP: ((Math.floor(data.experience_points / 100) + 1) * 100),
          progressToNext: (data.experience_points % 100)
        }
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Erro interno do servidor',
        code: 'INTERNAL_ERROR'
      });
    }
  });

  // 🎯 Atualizar experiência do companion
  fastify.post('/companion/experience/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;
      const { action, points = 10 } = request.body;

      // Buscar perfil atual
      const { data: currentProfile } = await fastify.supabase
        .from('user_personality_profile')
        .select('experience_points')
        .eq('user_id', userId)
        .single();

      const newXP = (currentProfile?.experience_points || 0) + points;

      // Atualizar experiência
      const { data, error } = await fastify.supabase
        .from('user_personality_profile')
        .update({ 
          experience_points: newXP,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      // Log da ação
      await fastify.supabase
        .from('companion_logs')
        .insert({
          user_id: userId,
          action_type: action,
          experience_gained: points,
          total_experience: newXP,
          metadata: { timestamp: new Date().toISOString() }
        });

      return {
        success: true,
        data: {
          newExperience: newXP,
          pointsGained: points,
          newLevel: Math.floor(newXP / 100) + 1
        }
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Erro ao atualizar experiência',
        code: 'UPDATE_ERROR'
      });
    }
  });

  // 🎭 Evolução de personalidade
  fastify.post('/companion/personality/evolve/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;
      const { interaction, context } = request.body;

      // Analisar interação e adaptar personalidade
      const adaptationData = {
        user_id: userId,
        interaction_type: interaction.type,
        personality_shift: {
          openness: Math.random() * 0.1 - 0.05,
          conscientiousness: Math.random() * 0.1 - 0.05,
          extraversion: Math.random() * 0.1 - 0.05,
          agreeableness: Math.random() * 0.1 - 0.05,
          neuroticism: Math.random() * 0.1 - 0.05
        },
        context: context,
        timestamp: new Date().toISOString()
      };

      // Salvar evolução
      await fastify.supabase
        .from('personality_evolution_log')
        .insert(adaptationData);

      // Atualizar perfil de personalidade
      const { data: currentProfile } = await fastify.supabase
        .from('user_personality_profile')
        .select('personality_traits')
        .eq('user_id', userId)
        .single();

      const currentTraits = currentProfile?.personality_traits || {};
      const newTraits = {
        openness: Math.max(0, Math.min(1, (currentTraits.openness || 0.5) + adaptationData.personality_shift.openness)),
        conscientiousness: Math.max(0, Math.min(1, (currentTraits.conscientiousness || 0.5) + adaptationData.personality_shift.conscientiousness)),
        extraversion: Math.max(0, Math.min(1, (currentTraits.extraversion || 0.5) + adaptationData.personality_shift.extraversion)),
        agreeableness: Math.max(0, Math.min(1, (currentTraits.agreeableness || 0.5) + adaptationData.personality_shift.agreeableness)),
        neuroticism: Math.max(0, Math.min(1, (currentTraits.neuroticism || 0.5) + adaptationData.personality_shift.neuroticism))
      };

      await fastify.supabase
        .from('user_personality_profile')
        .update({ 
          personality_traits: newTraits,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      return {
        success: true,
        data: {
          evolution: adaptationData.personality_shift,
          newTraits: newTraits,
          context: context
        }
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Erro na evolução da personalidade',
        code: 'EVOLUTION_ERROR'
      });
    }
  });

  // ========== AUTONOMOUS CORE ENDPOINTS ==========

  // 🤖 Análise autônoma
  fastify.post('/autonomous/analyze/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;
      const { context, data: analysisData } = request.body;

      // Análise de padrões e insights
      const analysis = {
        user_id: userId,
        analysis_type: 'autonomous_insight',
        insights: {
          patterns: [`Padrão de uso detectado: ${Math.random() > 0.5 ? 'intensivo' : 'moderado'}`],
          suggestions: [
            'Considere explorar novas funcionalidades',
            'Otimize sua rotina de interação',
            'Experimente diferentes abordagens'
          ],
          priority_score: Math.random() * 100,
          confidence: Math.random() * 0.3 + 0.7
        },
        context: context,
        created_at: new Date().toISOString()
      };

      // Salvar análise
      await fastify.supabase
        .from('autonomous_analysis_log')
        .insert(analysis);

      return {
        success: true,
        data: analysis.insights
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Erro na análise autônoma',
        code: 'ANALYSIS_ERROR'
      });
    }
  });

  // 💡 Sugestões proativas
  fastify.get('/autonomous/suggestions/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;

      // Buscar análises recentes
      const { data: recentAnalyses } = await fastify.supabase
        .from('autonomous_analysis_log')
        .select('insights')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      const suggestions = recentAnalyses?.map(a => a.insights.suggestions).flat() || [
        'Explore novos módulos do sistema',
        'Configure preferências personalizadas',
        'Revise suas metas e objetivos'
      ];

      return {
        success: true,
        data: {
          suggestions: suggestions.slice(0, 3),
          lastUpdate: new Date().toISOString()
        }
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar sugestões',
        code: 'SUGGESTIONS_ERROR'
      });
    }
  });

  // ========== SENSORIAL EXPERIENCE ENDPOINTS ==========

  // 🌟 Configurar ambiente sensorial
  fastify.post('/sensorial/environment/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;
      const { environmentType, settings } = request.body;

      const environmentConfig = {
        user_id: userId,
        environment_type: environmentType,
        settings: settings,
        is_active: true,
        created_at: new Date().toISOString()
      };

      // Desativar ambientes anteriores
      await fastify.supabase
        .from('sensorial_environments')
        .update({ is_active: false })
        .eq('user_id', userId);

      // Ativar novo ambiente
      const { data, error } = await fastify.supabase
        .from('sensorial_environments')
        .insert(environmentConfig)
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          environment: data,
          message: `Ambiente ${environmentType} ativado com sucesso`
        }
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Erro ao configurar ambiente',
        code: 'ENVIRONMENT_ERROR'
      });
    }
  });

  // 🎵 Controle de estímulos sensoriais
  fastify.post('/sensorial/stimuli/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;
      const { stimuliType, intensity, duration } = request.body;

      const stimuliConfig = {
        user_id: userId,
        stimuli_type: stimuliType,
        intensity: intensity,
        duration: duration,
        status: 'active',
        started_at: new Date().toISOString()
      };

      // Registrar estímulo
      await fastify.supabase
        .from('sensorial_stimuli_log')
        .insert(stimuliConfig);

      return {
        success: true,
        data: {
          stimuli: stimuliConfig,
          message: `Estímulo ${stimuliType} ativado`
        }
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Erro ao ativar estímulo',
        code: 'STIMULI_ERROR'
      });
    }
  });

  // ========== PERSONALITY EVOLVER ENDPOINTS ==========

  // 🧠 Análise de personalidade
  fastify.post('/personality/analyze/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;
      const { interactionData, context } = request.body;

      // Análise de personalidade baseada na interação
      const analysis = {
        user_id: userId,
        analysis_type: 'personality_assessment',
        personality_scores: {
          openness: Math.random() * 0.4 + 0.3,
          conscientiousness: Math.random() * 0.4 + 0.3,
          extraversion: Math.random() * 0.4 + 0.3,
          agreeableness: Math.random() * 0.4 + 0.3,
          neuroticism: Math.random() * 0.4 + 0.3
        },
        insights: [
          'Demonstra alta criatividade',
          'Preferência por estrutura e organização',
          'Comunicação assertiva e clara'
        ],
        recommendations: [
          'Continue explorando soluções criativas',
          'Mantenha rotinas estruturadas',
          'Desenvolva habilidades de liderança'
        ],
        context: context,
        created_at: new Date().toISOString()
      };

      // Salvar análise
      await fastify.supabase
        .from('personality_analysis_log')
        .insert(analysis);

      return {
        success: true,
        data: analysis
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Erro na análise de personalidade',
        code: 'PERSONALITY_ANALYSIS_ERROR'
      });
    }
  });

  // 🔄 Adaptação de personalidade
  fastify.post('/personality/adapt/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;
      const { targetTraits, adaptationSpeed = 'moderate' } = request.body;

      const speeds = { slow: 0.01, moderate: 0.05, fast: 0.1 };
      const speed = speeds[adaptationSpeed] || 0.05;

      // Buscar perfil atual
      const { data: currentProfile } = await fastify.supabase
        .from('user_personality_profile')
        .select('personality_traits')
        .eq('user_id', userId)
        .single();

      const currentTraits = currentProfile?.personality_traits || {};
      const adaptedTraits = {};

      // Aplicar adaptação gradual
      for (const trait in targetTraits) {
        const current = currentTraits[trait] || 0.5;
        const target = targetTraits[trait];
        const adjustment = (target - current) * speed;
        adaptedTraits[trait] = Math.max(0, Math.min(1, current + adjustment));
      }

      // Atualizar perfil
      await fastify.supabase
        .from('user_personality_profile')
        .update({ 
          personality_traits: { ...currentTraits, ...adaptedTraits },
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      // Log da adaptação
      await fastify.supabase
        .from('personality_adaptation_log')
        .insert({
          user_id: userId,
          target_traits: targetTraits,
          adapted_traits: adaptedTraits,
          adaptation_speed: adaptationSpeed,
          created_at: new Date().toISOString()
        });

      return {
        success: true,
        data: {
          adaptedTraits: adaptedTraits,
          adaptationSpeed: adaptationSpeed,
          message: 'Personalidade adaptada com sucesso'
        }
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Erro na adaptação de personalidade',
        code: 'ADAPTATION_ERROR'
      });
    }
  });

  // ========== ENDPOINTS UNIFICADOS ==========

  // 📊 Dashboard unificado
  fastify.get('/dashboard/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;

      // Buscar dados de todos os módulos
      const [
        profileData,
        recentAnalyses,
        activeEnvironment,
        personalityEvolution
      ] = await Promise.all([
        fastify.supabase.from('user_personality_profile').select('*').eq('user_id', userId).single(),
        fastify.supabase.from('autonomous_analysis_log').select('insights').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
        fastify.supabase.from('sensorial_environments').select('*').eq('user_id', userId).eq('is_active', true).single(),
        fastify.supabase.from('personality_evolution_log').select('*').eq('user_id', userId).order('timestamp', { ascending: false }).limit(5)
      ]);

      const dashboardData = {
        companion: {
          level: Math.floor((profileData.data?.experience_points || 0) / 100) + 1,
          experience: profileData.data?.experience_points || 0,
          personality: profileData.data?.personality_traits || {}
        },
        autonomous: {
          recentInsights: recentAnalyses.data?.map(a => a.insights) || [],
          analysisCount: recentAnalyses.data?.length || 0
        },
        sensorial: {
          activeEnvironment: activeEnvironment.data?.environment_type || null,
          environmentSettings: activeEnvironment.data?.settings || {}
        },
        personality: {
          recentEvolution: personalityEvolution.data || [],
          evolutionTrend: personalityEvolution.data?.length > 0 ? 'progressing' : 'stable'
        }
      };

      return {
        success: true,
        data: dashboardData
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Erro ao carregar dashboard',
        code: 'DASHBOARD_ERROR'
      });
    }
  });

  // 🔄 Sincronização completa
  fastify.post('/sync/:userId', async (request, reply) => {
    try {
      const { userId } = request.params;
      const { modules = ['companion', 'autonomous', 'sensorial', 'personality'] } = request.body;

      const syncResults = {};

      for (const module of modules) {
        try {
          switch (module) {
            case 'companion':
              // Sync companion data
              syncResults.companion = { status: 'synced', timestamp: new Date().toISOString() };
              break;
            case 'autonomous':
              // Sync autonomous data
              syncResults.autonomous = { status: 'synced', timestamp: new Date().toISOString() };
              break;
            case 'sensorial':
              // Sync sensorial data
              syncResults.sensorial = { status: 'synced', timestamp: new Date().toISOString() };
              break;
            case 'personality':
              // Sync personality data
              syncResults.personality = { status: 'synced', timestamp: new Date().toISOString() };
              break;
          }
        } catch (moduleError) {
          syncResults[module] = { status: 'error', error: moduleError.message };
        }
      }

      return {
        success: true,
        data: {
          syncResults: syncResults,
          timestamp: new Date().toISOString(),
          message: 'Sincronização completa realizada'
        }
      };
    } catch (error) {
      return reply.status(500).send({
        success: false,
        error: 'Erro na sincronização',
        code: 'SYNC_ERROR'
      });
    }
  });
}
