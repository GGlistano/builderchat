import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, MessageSquare, Clock, User, ChevronLeft, ChevronRight, Filter, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Conversation, Funnel } from '../../lib/database.types';

interface ConversationWithDetails extends Conversation {
  response_count?: number;
  last_message?: string;
}

type DateFilter = 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'custom';

export default function ConversationsInbox() {
  const { funnelId } = useParams<{ funnelId: string }>();
  const navigate = useNavigate();
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [conversations, setConversations] = useState<ConversationWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const itemsPerPage = 50;

  useEffect(() => {
    if (funnelId) {
      loadFunnel();
      loadConversations();
    }
  }, [funnelId, currentPage, searchTerm, dateFilter, customStartDate, customEndDate]);

  const loadFunnel = async () => {
    try {
      const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .eq('id', funnelId)
        .maybeSingle();

      if (error) throw error;
      setFunnel(data);
    } catch (error) {
      console.error('Error loading funnel:', error);
    }
  };

  const getDateRange = (): { start: string | null; end: string | null } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateFilter) {
      case 'today':
        return {
          start: today.toISOString(),
          end: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString()
        };
      case 'yesterday':
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        return {
          start: yesterday.toISOString(),
          end: today.toISOString()
        };
      case '7days':
        const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
          start: sevenDaysAgo.toISOString(),
          end: null
        };
      case '30days':
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        return {
          start: thirtyDaysAgo.toISOString(),
          end: null
        };
      case 'custom':
        return {
          start: customStartDate ? new Date(customStartDate).toISOString() : null,
          end: customEndDate ? new Date(new Date(customEndDate).getTime() + 24 * 60 * 60 * 1000).toISOString() : null
        };
      default:
        return { start: null, end: null };
    }
  };

  const loadConversations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('conversations')
        .select('*', { count: 'exact' })
        .eq('funnel_id', funnelId)
        .order('started_at', { ascending: false });

      const dateRange = getDateRange();
      if (dateRange.start) {
        query = query.gte('started_at', dateRange.start);
      }
      if (dateRange.end) {
        query = query.lt('started_at', dateRange.end);
      }

      if (!searchTerm) {
        query = query.range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      let filteredData = data || [];

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filteredData = filteredData.filter((conv) => {
          const leadData = conv.lead_data as Record<string, any> || {};
          const searchableFields = [
            leadData.nome,
            leadData.name,
            leadData.email,
            leadData.contacto,
            leadData.telefone,
            leadData.phone,
            leadData.ticket_code,
            conv.id
          ];

          return searchableFields.some(field =>
            field && String(field).toLowerCase().includes(searchLower)
          );
        });
      }

      const paginatedData = searchTerm
        ? filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
        : filteredData;

      const conversationsWithDetails = await Promise.all(
        paginatedData.map(async (conv) => {
          const { data: responses } = await supabase
            .from('lead_responses')
            .select('response_text')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1);

          return {
            ...conv,
            response_count: responses?.length || 0,
            last_message: responses?.[0]?.response_text || 'Sem mensagens',
          };
        })
      );

      setConversations(conversationsWithDetails);
      setTotalCount(searchTerm ? filteredData.length : (count || 0));
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const getLeadName = (conversation: Conversation) => {
    const data = conversation.lead_data as Record<string, any>;
    if (!data || Object.keys(data).length === 0) {
      return `Lead #${conversation.id.slice(0, 8)}`;
    }
    return data.nome || data.name || data.email || data.contacto || data.telefone || data.phone || `Lead #${conversation.id.slice(0, 8)}`;
  };

  const getLeadContact = (conversation: Conversation) => {
    const data = conversation.lead_data as Record<string, any>;
    if (!data) return '';
    return data.contacto || data.telefone || data.phone || data.email || '';
  };

  const getTicketCode = (conversation: Conversation) => {
    const data = conversation.lead_data as Record<string, any>;
    if (!data) return '';
    return data.ticket_code || '';
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      abandoned: 'bg-gray-100 text-gray-800',
    };

    const labels = {
      active: 'Ativo',
      completed: 'Completo',
      abandoned: 'Abandonado',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.abandoned}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Conversas</h1>
              {funnel && <p className="text-sm text-gray-600">{funnel.name}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-gray-400" />
            <span className="text-lg font-semibold text-gray-700">{totalCount}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Pesquisar por nome, email, contacto ou código do ticket..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                dateFilter !== 'all'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="text-sm font-medium">Período</span>
            </button>

            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-10 w-64">
                <div className="p-3 space-y-2">
                  <button
                    onClick={() => {
                      setDateFilter('all');
                      setShowDatePicker(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      dateFilter === 'all'
                        ? 'bg-emerald-100 text-emerald-800 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    Todos os períodos
                  </button>
                  <button
                    onClick={() => {
                      setDateFilter('today');
                      setShowDatePicker(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      dateFilter === 'today'
                        ? 'bg-emerald-100 text-emerald-800 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() => {
                      setDateFilter('yesterday');
                      setShowDatePicker(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      dateFilter === 'yesterday'
                        ? 'bg-emerald-100 text-emerald-800 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    Ontem
                  </button>
                  <button
                    onClick={() => {
                      setDateFilter('7days');
                      setShowDatePicker(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      dateFilter === '7days'
                        ? 'bg-emerald-100 text-emerald-800 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    Últimos 7 dias
                  </button>
                  <button
                    onClick={() => {
                      setDateFilter('30days');
                      setShowDatePicker(false);
                      setCurrentPage(1);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      dateFilter === '30days'
                        ? 'bg-emerald-100 text-emerald-800 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    Últimos 30 dias
                  </button>

                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <p className="text-xs font-medium text-gray-700 mb-2 px-3">Período personalizado</p>
                    <div className="space-y-2 px-3">
                      <div>
                        <label className="text-xs text-gray-600">Data início</label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600">Data fim</label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (customStartDate) {
                            setDateFilter('custom');
                            setShowDatePicker(false);
                            setCurrentPage(1);
                          }
                        }}
                        disabled={!customStartDate}
                        className="w-full px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <MessageSquare className="w-16 h-16 mb-4 text-gray-300" />
            <p className="text-lg font-medium">Nenhuma conversa encontrada</p>
            {searchTerm && <p className="text-sm">Tente ajustar sua pesquisa</p>}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => navigate(`/admin/funnel/${funnelId}/conversation/${conversation.id}`)}
                className="bg-white hover:bg-gray-50 px-6 py-4 cursor-pointer transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-emerald-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {getLeadName(conversation)}
                      </h3>
                      <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                        {formatDate(conversation.last_activity_at || conversation.started_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      {getTicketCode(conversation) && (
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {getTicketCode(conversation)}
                        </span>
                      )}
                      {getStatusBadge(conversation.status)}
                    </div>

                    {getLeadContact(conversation) && (
                      <p className="text-sm text-gray-600 mb-1">
                        {getLeadContact(conversation)}
                      </p>
                    )}

                    <p className="text-sm text-gray-500 truncate">
                      {conversation.last_message}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-gray-400 flex-shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-700">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, totalCount)} de {totalCount} conversas
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
