import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Clock, Download, DollarSign, TrendingUp, ExternalLink } from 'lucide-react';
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

interface TicketData {
  id: string;
  ticket_code: string;
  attribution_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  fbp?: string;
  fbc?: string;
  first_landing_page?: string;
  first_referrer?: string;
  last_landing_page?: string;
  last_referrer?: string;
  user_agent?: string;
  is_paid: boolean;
  paid_amount?: number;
  paid_at?: string;
  conversion_sent_to_facebook: boolean;
}

export default function ConversationDetail() {
  const { funnelId, conversationId } = useParams<{ funnelId: string; conversationId: string }>();
  const navigate = useNavigate();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [showMarkAsPaid, setShowMarkAsPaid] = useState(false);
  const [paidAmount, setPaidAmount] = useState('');
  const [savingPayment, setSavingPayment] = useState(false);
  const [sendingToFacebook, setSendingToFacebook] = useState(false);
  const [sendingToUtmify, setSendingToUtmify] = useState(false);

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

      if (convData) {
        const leadData = convData.lead_data as Record<string, any>;
        const ticketCode = leadData?.ticket_code;

        if (ticketCode) {
          const { data: ticket } = await supabase
            .from('lead_tickets')
            .select('*')
            .eq('ticket_code', ticketCode)
            .maybeSingle();

          if (ticket) {
            setTicketData(ticket as TicketData);
          }
        }
      }

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

  const handleMarkAsPaid = async () => {
    if (!ticketData || !paidAmount) {
      alert('Por favor, insira o valor pago');
      return;
    }

    const amount = parseFloat(paidAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, insira um valor válido');
      return;
    }

    setSavingPayment(true);
    try {
      const { error } = await supabase
        .from('lead_tickets')
        .update({
          is_paid: true,
          paid_amount: amount,
          paid_at: new Date().toISOString(),
        })
        .eq('id', ticketData.id);

      if (error) throw error;

      setTicketData({
        ...ticketData,
        is_paid: true,
        paid_amount: amount,
        paid_at: new Date().toISOString(),
      });

      setShowMarkAsPaid(false);
      setPaidAmount('');
      alert('Lead marcado como pago!');
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Erro ao marcar como pago');
    } finally {
      setSavingPayment(false);
    }
  };

  const handleSendToFacebook = async () => {
    if (!ticketData) return;

    if (!ticketData.is_paid) {
      alert('Marque o lead como pago antes de enviar para o Facebook');
      return;
    }

    setSendingToFacebook(true);
    try {
      const leadData = conversation?.lead_data as Record<string, any>;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-conversion`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticket_id: ticketData.id,
            event_name: 'Purchase',
            value: ticketData.paid_amount,
            currency: 'MZN',
            email: leadData?.email,
            phone: leadData?.contacto || leadData?.phone || leadData?.telefone,
            first_name: leadData?.nome,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao enviar conversão');
      }

      const { error: updateError } = await supabase
        .from('lead_tickets')
        .update({ conversion_sent_to_facebook: true })
        .eq('id', ticketData.id);

      if (updateError) throw updateError;

      setTicketData({
        ...ticketData,
        conversion_sent_to_facebook: true,
      });

      alert('Conversão enviada para o Facebook com sucesso!');
    } catch (error) {
      console.error('Error sending to Facebook:', error);
      alert('Erro ao enviar conversão para o Facebook');
    } finally {
      setSendingToFacebook(false);
    }
  };

  const handleSendToUtmify = async (status: 'waiting_payment' | 'paid') => {
    if (!ticketData) return;

    if (status === 'paid' && !ticketData.is_paid) {
      alert('Marque o lead como pago antes de enviar como "pago" para Utmify');
      return;
    }

    const amount = status === 'paid' && ticketData.paid_amount ? ticketData.paid_amount : parseFloat(paidAmount || '0');

    if (!amount || amount <= 0) {
      alert('Por favor, insira um valor válido');
      return;
    }

    setSendingToUtmify(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/utmify-conversion`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticket_id: ticketData.id,
            status: status,
            amount: amount,
          }),
        }
      );

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erro ao enviar para Utmify');
      }

      alert(`Evento "${status === 'waiting_payment' ? 'Aguardando Pagamento' : 'Pago'}" enviado para Utmify!\n\nConversão: ${data.conversion_info?.mzn} MZN → $${data.conversion_info?.usd} USD`);
    } catch (error) {
      console.error('Error sending to Utmify:', error);
      alert('Erro ao enviar para Utmify: ' + (error as Error).message);
    } finally {
      setSendingToUtmify(false);
    }
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

          {ticketData && !ticketData.is_paid && (
            <div className="mb-4 bg-emerald-50 rounded-lg p-4 border border-emerald-200">
              {!showMarkAsPaid ? (
                <button
                  onClick={() => setShowMarkAsPaid(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  <DollarSign className="w-4 h-4" />
                  Marcar como Pago
                </button>
              ) : (
                <div className="space-y-3">
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="Valor pago (MZN)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    step="0.01"
                    min="0"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleMarkAsPaid}
                      disabled={savingPayment}
                      className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm disabled:opacity-50"
                    >
                      {savingPayment ? 'Salvando...' : 'Confirmar'}
                    </button>
                    <button
                      onClick={() => {
                        setShowMarkAsPaid(false);
                        setPaidAmount('');
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {ticketData && ticketData.is_paid && (
            <div className="mb-4 space-y-2">
              <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                <div className="flex items-center gap-2 text-green-800 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-medium text-sm">Lead Pago</span>
                </div>
                <p className="text-lg font-bold text-green-900">
                  {ticketData.paid_amount?.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'MZN',
                  })}
                </p>
                {ticketData.paid_at && (
                  <p className="text-xs text-green-700 mt-1">
                    {new Date(ticketData.paid_at).toLocaleString('pt-BR')}
                  </p>
                )}
              </div>

              {!ticketData.conversion_sent_to_facebook && (
                <button
                  onClick={handleSendToFacebook}
                  disabled={sendingToFacebook}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  <TrendingUp className="w-4 h-4" />
                  {sendingToFacebook ? 'Enviando...' : 'Enviar para Facebook'}
                </button>
              )}

              {ticketData.conversion_sent_to_facebook && (
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 flex items-center gap-2 text-blue-800">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">Enviado para o Facebook</span>
                </div>
              )}

              <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                <p className="text-xs font-medium text-purple-900 mb-2">Utmify Integration</p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleSendToUtmify('paid')}
                    disabled={sendingToUtmify}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm disabled:opacity-50"
                  >
                    <TrendingUp className="w-4 h-4" />
                    {sendingToUtmify ? 'Enviando...' : 'Enviar como Pago'}
                  </button>
                  <button
                    onClick={() => handleSendToUtmify('waiting_payment')}
                    disabled={sendingToUtmify}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 border border-purple-300 rounded-lg hover:bg-purple-200 transition-colors font-medium text-sm disabled:opacity-50"
                  >
                    <Clock className="w-4 h-4" />
                    {sendingToUtmify ? 'Enviando...' : 'Enviar Aguardando Pagamento'}
                  </button>
                </div>
              </div>
            </div>
          )}

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

          {ticketData && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-md font-bold text-gray-900 mb-4">Dados de Tracking</h3>

              <div className="space-y-4">
                {(ticketData.utm_source || ticketData.utm_medium || ticketData.utm_campaign) && (
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <p className="text-xs font-medium text-blue-900 mb-2">UTM Parameters</p>
                    <div className="space-y-1">
                      {ticketData.utm_source && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-700">Source:</span>
                          <span className="text-xs font-medium text-blue-900">{ticketData.utm_source}</span>
                        </div>
                      )}
                      {ticketData.utm_medium && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-700">Medium:</span>
                          <span className="text-xs font-medium text-blue-900">{ticketData.utm_medium}</span>
                        </div>
                      )}
                      {ticketData.utm_campaign && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-700">Campaign:</span>
                          <span className="text-xs font-medium text-blue-900">{ticketData.utm_campaign}</span>
                        </div>
                      )}
                      {ticketData.utm_content && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-700">Content:</span>
                          <span className="text-xs font-medium text-blue-900">{ticketData.utm_content}</span>
                        </div>
                      )}
                      {ticketData.utm_term && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-700">Term:</span>
                          <span className="text-xs font-medium text-blue-900">{ticketData.utm_term}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(ticketData.fbclid || ticketData.fbp || ticketData.fbc) && (
                  <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                    <p className="text-xs font-medium text-indigo-900 mb-2">Facebook Tracking</p>
                    <div className="space-y-1">
                      {ticketData.fbclid && (
                        <div>
                          <span className="text-xs text-indigo-700">FBCLID:</span>
                          <p className="text-xs font-mono text-indigo-900 break-all">{ticketData.fbclid}</p>
                        </div>
                      )}
                      {ticketData.fbp && (
                        <div>
                          <span className="text-xs text-indigo-700">FBP:</span>
                          <p className="text-xs font-mono text-indigo-900 break-all">{ticketData.fbp}</p>
                        </div>
                      )}
                      {ticketData.fbc && (
                        <div>
                          <span className="text-xs text-indigo-700">FBC:</span>
                          <p className="text-xs font-mono text-indigo-900 break-all">{ticketData.fbc}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(ticketData.first_landing_page || ticketData.last_landing_page) && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs font-medium text-gray-900 mb-2">Landing Pages</p>
                    <div className="space-y-2">
                      {ticketData.first_landing_page && (
                        <div>
                          <span className="text-xs text-gray-600">First:</span>
                          <a
                            href={ticketData.first_landing_page}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline break-all flex items-center gap-1"
                          >
                            {ticketData.first_landing_page}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                      )}
                      {ticketData.last_landing_page && ticketData.last_landing_page !== ticketData.first_landing_page && (
                        <div>
                          <span className="text-xs text-gray-600">Last:</span>
                          <a
                            href={ticketData.last_landing_page}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:underline break-all flex items-center gap-1"
                          >
                            {ticketData.last_landing_page}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(ticketData.first_referrer || ticketData.last_referrer) && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs font-medium text-gray-900 mb-2">Referrers</p>
                    <div className="space-y-2">
                      {ticketData.first_referrer && (
                        <div>
                          <span className="text-xs text-gray-600">First:</span>
                          <p className="text-xs text-gray-900 break-all">{ticketData.first_referrer}</p>
                        </div>
                      )}
                      {ticketData.last_referrer && ticketData.last_referrer !== ticketData.first_referrer && (
                        <div>
                          <span className="text-xs text-gray-600">Last:</span>
                          <p className="text-xs text-gray-900 break-all">{ticketData.last_referrer}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {ticketData.attribution_id && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <p className="text-xs font-medium text-gray-900 mb-1">Attribution ID</p>
                    <p className="text-xs font-mono text-gray-600 break-all">{ticketData.attribution_id}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
