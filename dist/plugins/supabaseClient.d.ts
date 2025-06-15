import { SupabaseClient } from '@supabase/supabase-js';
import { FastifyPluginAsync } from 'fastify';
declare module 'fastify' {
    interface FastifyInstance {
        supabase: SupabaseClient;
    }
}
declare const _default: FastifyPluginAsync;
export default _default;
