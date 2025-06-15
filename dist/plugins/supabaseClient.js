import { createClient } from '@supabase/supabase-js';
import fp from 'fastify-plugin';
const supabasePlugin = async (fastify) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('🔴 Supabase credentials não configuradas');
    }
    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
    try {
        const { data, error } = await supabase.from('agents').select('count').limit(1);
        if (error)
            throw error;
        fastify.log.info('✅ Supabase conectado com sucesso');
    }
    catch (error) {
        fastify.log.error('🔴 Erro ao conectar com Supabase:', error);
    }
    fastify.decorate('supabase', supabase);
};
export default fp(supabasePlugin, {
    name: 'supabase'
});
