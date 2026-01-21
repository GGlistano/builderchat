import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Clock, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Conversation, FunnelBlock } from '../../lib/database.types';
import ChatMessage from '../../components/chat/ChatMessage';

interface LeadResponse {
  id: string;
  conversation_id: string;
  block_id: string;
  response_text: string;
  attachment_url?: string;
  attachment_type?: string;
  created_at: string;
}

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: any;
  blockType?: string;
  attachmentUrl?: string;
  attachmentType?: string;
  timestamp: string;
}

export default function ConversationDetail() {
  const { funnelId, conversationId } = useParams<{ funnelId: string; conversationId: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (conversationId) {
      loadConversation();
    }
  }, [conversationId]);

  const loadConversation = async () => {
    try {
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .maybeSingle();

      if (convError) throw convError;
      setConversation(convData);

      const { data: blocksData } = await supabase
        .from('funnel_blocks')
        .select('*')
        .eq('funnel_id', convData.funnel_id)
        .order('order_index');

      const { data: responsesData } = await supabase
        .from('lead_responses')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at');

      const allMessages: Message[] = [];

      if (blocksData && responsesData) {
        const responsesByBlock = new Map<string, LeadResponse[]>();
        responsesData.forEach((response) => {
          const blockResponses = responsesByBlock.get(response.block_id) || [];
          blockResponses.push(response);
          responsesByBlock.set(response.block_id, blockResponses);
        });

        blocksData.forEach((block) => {
          if (block.type !== 'delay' && block.type !== 'typing_effect' && block.type !== 'recording_effect') {
            allMessages.push({
              id: block.id,
              type: 'bot',
              content: block.content,
              blockType: block.type,
              timestamp: block.created_at,
            });
          }

          const responses = responsesByBlock.get(block.id) || [];
          responses.forEach((response) => {
            allMessages.push({
              id: response.id,
              type: 'user',
              content: { text: response.response_text },
              attachmentUrl: response.attachment_url || undefined,
              attachmentType: response.attachment_type || undefined,
              timestamp: response.created_at,
            });
          });
        });
      }

      setMessages(allMessages);
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLeadName = () => {
    if (!conversation) return 'Lead';
    const data = conversation.lead_data as Record<string, any>;
    return data?.nome || data?.name || data?.email || 'Lead sem nome';
  };

  const getLeadInfo = () => {
    if (!conversation) return {};
    const data = conversation.lead_data as Record<string, any>;
    return {
      email: data?.email || '',
      contacto: data?.contacto || data?.phone || data?.telefone || '',
      ticket: data?.ticket_code || '',
      provincia: data?.provincia || '',
      bairro: data?.bairro || '',
    };
  };

  const exportConversation = () => {
    if (!conversation) return;

    let text = `Conversa com ${getLeadName()}\n`;
    text += `Data: ${new Date(conversation.created_at).toLocaleString('pt-BR')}\n`;
    text += `Status: ${conversation.status}\n\n`;
    text += `--- MENSAGENS ---\n\n`;

    messages.forEach((msg) => {
      const sender = msg.type === 'bot' ? 'Bot' : 'Lead';
      const time = new Date(msg.timestamp).toLocaleTimeString('pt-BR');
      text += `[${time}] ${sender}: ${msg.content.text || '(mídia)'}\n`;
      if (msg.attachmentUrl) {
        text += `Anexo: ${msg.attachmentUrl}\n`;
      }
      text += '\n';
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversa-${conversation.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-600">Conversa não encontrada</p>
      </div>
    );
  }

  const leadInfo = getLeadInfo();

  return (
    <div className="h-full flex">
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(`/admin/funnel/${funnelId}/conversations`)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{getLeadName()}</h1>
                  <p className="text-sm text-gray-600">
                    {conversation.status === 'active' ? 'Ativo' : conversation.status === 'completed' ? 'Completo' : 'Abandonado'}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={exportConversation}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>

        <div
          className="flex-1 overflow-y-auto px-6 py-6 space-y-3"
          style={{
            backgroundColor: '#e5ddd5',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 800 800'%3E%3Cg fill='none' stroke='%23d9d1c7' stroke-width='1' opacity='0.3'%3E%3Cpath d='M769 229L1037 260.9M927 880L731 737 520 660 309 538 40 599 295 764 126.5 879.5 40 599-197 493 102 382-31 229 126.5 79.5-69-63'/%3E%3Cpath d='M-31 229L237 261 390 382 603 493 308.5 537.5 101.5 381.5M370 905L295 764'/%3E%3Cpath d='M520 660L578 842 731 737 840 599 603 493 520 660 295 764 309 538 390 382 539 269 769 229 577.5 41.5 370 105 295 -36 126.5 79.5 237 261 102 382 40 599 -69 737 127 880'/%3E%3Cpath d='M520-140L578.5 42.5 731-63M603 493L539 269 237 261 370 105M902 382L539 269M390 382L102 382'/%3E%3Cpath d='M-222 42L126.5 79.5 370 105 539 269 577.5 41.5 927 80 769 229 902 382 603 493 731 737M295-36L577.5 41.5M578 842L295 764M40-201L127 80M102 382L-261 269'/%3E%3C/g%3E%3Cg fill='%23d4cdc3'%3E%3Ccircle cx='769' cy='229' r='5'/%3E%3Ccircle cx='539' cy='269' r='5'/%3E%3Ccircle cx='603' cy='493' r='5'/%3E%3Ccircle cx='731' cy='737' r='5'/%3E%3Ccircle cx='520' cy='660' r='5'/%3E%3Ccircle cx='309' cy='538' r='5'/%3E%3Ccircle cx='295' cy='764' r='5'/%3E%3Ccircle cx='40' cy='599' r='5'/%3E%3Ccircle cx='102' cy='382' r='5'/%3E%3Ccircle cx='127' cy='80' r='5'/%3E%3Ccircle cx='370' cy='105' r='5'/%3E%3Ccircle cx='578' cy='42' r='5'/%3E%3Ccircle cx='237' cy='261' r='5'/%3E%3Ccircle cx='390' cy='382' r='5'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        >
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
        </div>
      </div>

      <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Informações do Lead</h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">Nome</p>
                <p className="text-sm text-gray-900">{getLeadName()}</p>
              </div>
            </div>

            {leadInfo.email && (
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-gray-400 mt-0.5">@</div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <p className="text-sm text-gray-900">{leadInfo.email}</p>
                </div>
              </div>
            )}

            {leadInfo.contacto && (
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-gray-400 mt-0.5">📱</div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Contacto</p>
                  <p className="text-sm text-gray-900">{leadInfo.contacto}</p>
                </div>
              </div>
            )}

            {leadInfo.ticket && (
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-gray-400 mt-0.5">🎫</div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Ticket</p>
                  <p className="text-sm text-gray-900">{leadInfo.ticket}</p>
                </div>
              </div>
            )}

            {leadInfo.provincia && (
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 text-gray-400 mt-0.5">📍</div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Localização</p>
                  <p className="text-sm text-gray-900">
                    {leadInfo.provincia}
                    {leadInfo.bairro && `, ${leadInfo.bairro}`}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-700">Iniciado em</p>
                <p className="text-sm text-gray-900">
                  {new Date(conversation.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>

            {conversation.completed_at && (
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Finalizado em</p>
                  <p className="text-sm text-gray-900">
                    {new Date(conversation.completed_at).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
