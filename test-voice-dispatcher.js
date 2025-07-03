import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

console.log('🔍 Testando conexão com Supabase...');
console.log('URL:', process.env.SUPABASE_URL);
console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Definida' : 'Não encontrada');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testVoiceDispatcher() {
  try {
    console.log('\n📋 1. Listando engines de voz:');
    const { data: engines, error: enginesError } = await supabase
      .from('voice_engines')
      .select('*');
    
    if (enginesError) {
      console.error('Erro ao listar engines:', enginesError);
    } else {
      console.log('Engines encontradas:', engines?.length || 0);
      engines?.forEach(engine => {
        console.log(`- ${engine.name}: ${engine.status} (prioridade: ${engine.fallback_priority})`);
      });
    }
    
    console.log('\n🔄 2. Ativando engine OpenVoice:');
    const { data: updateResult, error: updateError } = await supabase
      .from('voice_engines')
      .update({ status: 'online' })
      .eq('name', 'openvoice')
      .select();
    
    if (updateError) {
      console.error('Erro ao atualizar engine:', updateError);
    } else {
      console.log('✅ Engine OpenVoice ativada:', updateResult);
    }
    
    console.log('\n📋 3. Verificando status após atualização:');
    const { data: enginesAfter, error: enginesAfterError } = await supabase
      .from('voice_engines')
      .select('*')
      .eq('name', 'openvoice');
    
    if (enginesAfterError) {
      console.error('Erro ao verificar engines:', enginesAfterError);
    } else {
      console.log('OpenVoice status:', enginesAfter?.[0]?.status || 'não encontrado');
    }
    
    console.log('\n📋 4. Listando vozes disponíveis:');
    const { data: voices, error: voicesError } = await supabase
      .from('available_voices')
      .select('*')
      .eq('engine_name', 'openvoice');
    
    if (voicesError) {
      console.error('Erro ao listar vozes:', voicesError);
    } else {
      console.log('Vozes OpenVoice encontradas:', voices?.length || 0);
      voices?.forEach(voice => {
        console.log(`- ${voice.voice_id}: ${voice.voice_name} (disponível: ${voice.is_available})`);
      });
    }
    
  } catch (error) {
    console.error('Erro geral:', error);
  }
}

testVoiceDispatcher();
