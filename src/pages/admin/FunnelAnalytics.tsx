import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Users, CheckCircle, XCircle, Clock, BarChart3, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Funnel, FunnelBlock, Conversation } from '../../lib/database.types';

interface BlockStats {
  block_id: string;
  block_name: string;
  block_order: number;
  responses_count: number;
  completion_rate: number;
}

interface FunnelMetrics {
  total_conversations: number;
  completed: number;
  active: number;
  abandoned: number;
  completion_rate: number;
  avg_completion_time: number;
  block_stats: BlockStats[];
}

export default function FunnelAnalytics() {
  const { funnelId } = useParams<{ funnelId: string }>();
  const navigate = useNavigate();
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [metrics, setMetrics] = useState<FunnelMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (funnelId) {
      loadFunnelAndMetrics();
    }
  }, [funnelId]);

  const loadFunnelAndMetrics = async () => {
    setLoading(true);
    try {
      const { data: funnelData } = await supabase
        .from('funnels')
        .select('*')
        .eq('id', funnelId)
        .maybeSingle();

      if (funnelData) {
        setFunnel(funnelData);
        await calculateMetrics(funnelId);
      }
    } catch (error) {
      console.error('Error loading funnel:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = async (funnelId: string) => {
    try {
      const { data: conversations } = await supabase
        .from('conversations')
        .select('*')
        .eq('funnel_id', funnelId);

      const { data: blocks } = await supabase
        .from('funnel_blocks')
        .select('*')
        .eq('funnel_id', funnelId)
        .order('order_index');

      if (!conversations || !blocks) return;

      const total = conversations.length;
      const completed = conversations.filter(c => c.status === 'completed').length;
      const active = conversations.filter(c => c.status === 'active').length;
      const abandoned = conversations.filter(c => c.status === 'abandoned').length;

      const completedConversations = conversations.filter(c => c.completed_at);
      let avgTime = 0;
      if (completedConversations.length > 0) {
        const totalTime = completedConversations.reduce((sum, conv) => {
          const start = new Date(conv.started_at).getTime();
          const end = new Date(conv.completed_at!).getTime();
          return sum + (end - start);
        }, 0);
        avgTime = totalTime / completedConversations.length;
      }

      const { data: allResponses } = await supabase
        .from('lead_responses')
        .select('block_id, conversation_id')
        .in('conversation_id', conversations.map(c => c.id));

      const blockStats: BlockStats[] = blocks
        .filter(b => b.type === 'question')
        .map((block, index, questionBlocks) => {
          const responsesForBlock = allResponses?.filter(r => r.block_id === block.id) || [];
          const uniqueConversations = new Set(responsesForBlock.map(r => r.conversation_id)).size;

          let completionRate = 0;
          if (index === 0) {
            completionRate = total > 0 ? (uniqueConversations / total) * 100 : 0;
          } else {
            const prevBlock = questionBlocks[index - 1];
            const prevResponses = allResponses?.filter(r => r.block_id === prevBlock.id) || [];
            const prevUniqueConversations = new Set(prevResponses.map(r => r.conversation_id)).size;
            completionRate = prevUniqueConversations > 0 ? (uniqueConversations / prevUniqueConversations) * 100 : 0;
          }

          return {
            block_id: block.id,
            block_name: block.content.text || `Pergunta ${index + 1}`,
            block_order: block.order_index,
            responses_count: uniqueConversations,
            completion_rate: completionRate,
          };
        });

      setMetrics({
        total_conversations: total,
        completed,
        active,
        abandoned,
        completion_rate: total > 0 ? (completed / total) * 100 : 0,
        avg_completion_time: avgTime,
        block_stats: blockStats,
      });
    } catch (error) {
      console.error('Error calculating metrics:', error);
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}min`;
    }
    return `${minutes} minutos`;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!funnel || !metrics) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-600">Funil não encontrado</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Métricas do Funil</h1>
              <p className="text-sm text-gray-600">{funnel.name}</p>
            </div>
          </div>
          <BarChart3 className="w-6 h-6 text-emerald-600" />
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Total de Conversas</p>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.total_conversations}</p>
            <p className="text-xs text-gray-500 mt-1">Conversas iniciadas</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Concluídas</p>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.completed}</p>
            <p className="text-xs text-green-600 mt-1 font-medium">
              {metrics.completion_rate.toFixed(1)}% taxa de conclusão
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Ativas</p>
              <MessageSquare className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.active}</p>
            <p className="text-xs text-gray-500 mt-1">Em andamento</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Abandonadas</p>
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900">{metrics.abandoned}</p>
            <p className="text-xs text-red-600 mt-1">
              {metrics.total_conversations > 0
                ? ((metrics.abandoned / metrics.total_conversations) * 100).toFixed(1)
                : 0}% dos leads
            </p>
          </div>
        </div>

        {metrics.avg_completion_time > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">Tempo Médio de Conclusão</h3>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatTime(metrics.avg_completion_time)}</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-900">Funil de Conversão por Etapa</h3>
          </div>

          {metrics.block_stats.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhuma pergunta configurada no funil
            </p>
          ) : (
            <div className="space-y-4">
              {metrics.block_stats.map((stat, index) => {
                const widthPercentage = metrics.total_conversations > 0
                  ? (stat.responses_count / metrics.total_conversations) * 100
                  : 0;

                return (
                  <div key={stat.block_id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-emerald-700">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm line-clamp-1">
                            {stat.block_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {stat.responses_count} respostas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {stat.completion_rate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500">
                          {index === 0 ? 'do total' : 'da etapa anterior'}
                        </p>
                      </div>
                    </div>

                    <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                        style={{ width: `${Math.max(widthPercentage, 5)}%` }}
                      >
                        <span className="text-xs font-medium text-white">
                          {widthPercentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {index < metrics.block_stats.length - 1 && (
                      <div className="flex items-center gap-2 ml-4 mt-2">
                        <div className="w-px h-4 bg-gray-300"></div>
                        <p className="text-xs text-gray-500">
                          {stat.responses_count > 0 && metrics.block_stats[index + 1].responses_count > 0 && (
                            <>
                              {((metrics.block_stats[index + 1].responses_count / stat.responses_count) * 100).toFixed(1)}%
                              {' '}avançaram para próxima etapa
                            </>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-lg border border-emerald-200 p-6">
          <h3 className="text-lg font-semibold text-emerald-900 mb-3">Resumo de Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 border border-emerald-100">
              <p className="text-sm text-gray-600 mb-1">Primeira Etapa</p>
              <p className="text-2xl font-bold text-emerald-700">
                {metrics.block_stats[0]?.responses_count || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">leads iniciaram</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-emerald-100">
              <p className="text-sm text-gray-600 mb-1">Última Etapa</p>
              <p className="text-2xl font-bold text-emerald-700">
                {metrics.block_stats[metrics.block_stats.length - 1]?.responses_count || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">leads completaram</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-emerald-100">
              <p className="text-sm text-gray-600 mb-1">Drop-off Total</p>
              <p className="text-2xl font-bold text-red-600">
                {metrics.block_stats[0]?.responses_count
                  ? ((metrics.block_stats[0].responses_count - (metrics.block_stats[metrics.block_stats.length - 1]?.responses_count || 0)) / metrics.block_stats[0].responses_count * 100).toFixed(1)
                  : 0}%
              </p>
              <p className="text-xs text-gray-500 mt-1">taxa de abandono</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
