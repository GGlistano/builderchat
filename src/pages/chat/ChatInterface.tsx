import { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Send, Mic, Camera, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Funnel, FunnelBlock, Conversation } from '../../lib/database.types';
import ChatMessage from '../../components/chat/ChatMessage';
import TypingIndicator from '../../components/chat/TypingIndicator';
import RecordingIndicator from '../../components/chat/RecordingIndicator';

interface Message {
  id: string;
  type: 'bot' | 'user';
  content: any;
  blockType?: string;
  attachmentUrl?: string;
  attachmentType?: string;
}

interface LeadTicket {
  id: string;
  ticket_code: string;
  funnel_id: string;
  lead_data: Record<string, any>;
  created_at: string;
  used_at: string | null;
  expires_at: string;
}

export default function ChatInterface() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [funnel, setFunnel] = useState<Funnel | null>(null);
  const [blocks, setBlocks] = useState<FunnelBlock[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const [funnelCompleted, setFunnelCompleted] = useState(false);
  const [ticketData, setTicketData] = useState<LeadTicket | null>(null);
  const [isSearchingAgent, setIsSearchingAgent] = useState(false);
  const [agentFound, setAgentFound] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  const [ticketCheckComplete, setTicketCheckComplete] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationStartedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (slug) {
      loadFunnel();
    }
  }, [slug]);

  useEffect(() => {
    if (loadingComplete && ticketCheckComplete && blocks.length > 0 && !conversation && !conversationStartedRef.current) {
      conversationStartedRef.current = true;
      startConversation();
    }
  }, [loadingComplete, ticketCheckComplete, blocks, conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, isRecording]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadFunnel = async () => {
    try {
      const { data: funnelData, error: funnelError } = await supabase
        .from('funnels')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle();

      if (funnelError) throw funnelError;

      if (!funnelData) {
        alert('Funil não encontrado ou inativo');
        return;
      }

      setFunnel(funnelData);

      const { data: blocksData, error: blocksError } = await supabase
        .from('funnel_blocks')
        .select('*')
        .eq('funnel_id', funnelData.id)
        .order('order_index');

      if (blocksError) throw blocksError;
      setBlocks(blocksData || []);

      const ticketCode = searchParams.get('ticket');
      if (ticketCode) {
        await loadTicket(ticketCode, funnelData.id);
      } else {
        setTicketCheckComplete(true);
      }

      setLoadingComplete(true);
    } catch (error) {
      console.error('Error loading funnel:', error);
    }
  };

  const loadTicket = async (ticketCode: string, funnelId: string) => {
    try {
      const { data: ticket, error } = await supabase
        .from('lead_tickets')
        .select('*')
        .eq('ticket_code', ticketCode)
        .eq('funnel_id', funnelId)
        .maybeSingle();

      if (error) {
        console.error('Error loading ticket:', error);
        setTicketCheckComplete(true);
        return;
      }

      if (!ticket) {
        alert('Ticket inválido ou expirado');
        setTicketCheckComplete(true);
        return;
      }

      const expiresAt = new Date(ticket.expires_at);
      if (expiresAt < new Date()) {
        alert('Este ticket expirou. Por favor, preencha o formulário novamente.');
        setTicketCheckComplete(true);
        return;
      }

      if (ticket.used_at) {
        alert('Este ticket já foi utilizado.');
        setTicketCheckComplete(true);
        return;
      }

      setTicketData(ticket);
      setTicketCheckComplete(true);
    } catch (error) {
      console.error('Error loading ticket:', error);
      setTicketCheckComplete(true);
    }
  };

  const startConversation = async () => {
    try {
      if (ticketData) {
        setIsSearchingAgent(true);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        setAgentFound(true);
        await new Promise((resolve) => setTimeout(resolve, 1500));

        setIsSearchingAgent(false);
        setAgentFound(false);
      }

      const conversationData: any = {
        funnel_id: funnel!.id,
        status: 'active',
      };

      if (ticketData) {
        conversationData.lead_data = {
          ticket_code: ticketData.ticket_code,
          ...ticketData.lead_data,
        };
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert([conversationData])
        .select()
        .single();

      if (error) throw error;
      setConversation(data);

      if (ticketData) {
        const leadMessage = formatLeadTicketMessage(ticketData);
        setMessages([{
          id: 'lead-ticket-intro',
          type: 'user',
          content: { text: leadMessage },
          blockType: 'text',
        }]);

        await supabase
          .from('lead_tickets')
          .update({
            used_at: new Date().toISOString(),
            session_id: data.id,
          })
          .eq('id', ticketData.id);

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      executeBlock(0);
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const formatLeadTicketMessage = (ticket: LeadTicket): string => {
    const data = ticket.lead_data;
    let message = `Olá! Vim através do formulário de empréstimo.\n\n`;
    message += `📋 Pedido: ${ticket.ticket_code}\n\n`;

    const fieldLabels: Record<string, string> = {
      nome: 'Nome',
      name: 'Nome',
      contacto: 'Contacto',
      telefone: 'Contacto',
      phone: 'Contacto',
      valor: 'Valor Solicitado',
      valor_solicitado: 'Valor Solicitado',
      prazo: 'Prazo de Pagamento',
      motivo: 'Motivo',
      finalidade: 'Finalidade',
      provincia: 'Província',
      bairro: 'Bairro',
      quarteirao: 'Quarteirão',
      numero_casa: 'Nº Casa',
      sector_trabalho: 'Sector de Trabalho',
      taxa_inscricao: 'Taxa de Inscrição',
      juros_mensais: 'Juros Mensais',
      parcela_estimada: 'Parcela Estimada',
      forma_pagamento: 'Forma de Pagamento',
      email: 'Email',
    };

    const sections: { title: string; fields: string[] }[] = [
      {
        title: '👤 Meus dados:',
        fields: ['nome', 'name', 'contacto', 'telefone', 'phone', 'email']
      },
      {
        title: '💰 Sobre o empréstimo:',
        fields: ['valor', 'valor_solicitado', 'prazo', 'motivo', 'finalidade', 'taxa_inscricao', 'juros_mensais', 'parcela_estimada', 'forma_pagamento']
      },
      {
        title: '📍 Localização:',
        fields: ['provincia', 'bairro', 'quarteirao', 'numero_casa']
      },
      {
        title: '💼 Trabalho:',
        fields: ['sector_trabalho']
      }
    ];

    sections.forEach(section => {
      const sectionFields = section.fields
        .map(field => {
          const value = data[field];
          if (value) {
            const label = fieldLabels[field] || field;
            return `• ${label}: ${value}`;
          }
          return null;
        })
        .filter(Boolean);

      if (sectionFields.length > 0) {
        message += `${section.title}\n`;
        message += sectionFields.join('\n') + '\n\n';
      }
    });

    const knownFields = sections.flatMap(s => s.fields);
    const additionalFields = Object.entries(data).filter(([key]) =>
      !knownFields.includes(key)
    );

    if (additionalFields.length > 0) {
      message += '📝 Outras informações:\n';
      additionalFields.forEach(([key, value]) => {
        const label = fieldLabels[key.toLowerCase()] || key;
        message += `• ${label}: ${value}\n`;
      });
    }

    return message.trim();
  };

  const executeBlock = async (index: number) => {
    if (index >= blocks.length) {
      await completeConversation();
      return;
    }

    const block = blocks[index];
    setCurrentBlockIndex(index);

    switch (block.type) {
      case 'end':
        await handleEndBlock();
        break;
      case 'text':
        await handleTextBlock(block, index);
        break;
      case 'question':
        await handleQuestionBlock(block, index);
        break;
      case 'image':
      case 'video':
      case 'audio':
        await handleMediaBlock(block, index);
        break;
      case 'typing_effect':
        await handleTypingEffect(block, index);
        break;
      case 'recording_effect':
        await handleRecordingEffect(block, index);
        break;
      case 'delay':
        await handleDelay(block, index);
        break;
    }
  };

  const replaceVariables = (text: string): string => {
    if (!text || !ticketData) return text;

    let result = text;
    const data = ticketData.lead_data;

    const variableMap: Record<string, any> = {
      customer_name: data.nome || data.name || '',
      customer_email: data.email || '',
      customer_phone: data.contacto || data.telefone || data.phone || '',
      order_number: ticketData.ticket_code || '',
      valor: data.valor_solicitado || data.valor || '',
      valor_emprestimo: data.valor_solicitado || data.valor || '',
    };

    Object.keys(data).forEach(key => {
      variableMap[key] = data[key];
    });

    const regex = /\{\{([^}]+)\}\}/g;
    result = result.replace(regex, (match, variableName) => {
      const trimmedName = variableName.trim();
      return variableMap[trimmedName] !== undefined ? variableMap[trimmedName] : match;
    });

    return result;
  };

  const handleTextBlock = async (block: FunnelBlock, index: number) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const processedContent = {
      ...block.content,
      text: replaceVariables(block.content.text || ''),
    };

    addBotMessage(block.id, processedContent, 'text');

    setTimeout(() => {
      executeBlock(index + 1);
    }, 800);
  };

  const handleQuestionBlock = async (block: FunnelBlock, index: number) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const processedContent = {
      ...block.content,
      text: replaceVariables(block.content.text || ''),
    };

    addBotMessage(block.id, processedContent, 'question');
    setWaitingForResponse(true);
  };

  const handleMediaBlock = async (block: FunnelBlock, index: number) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const processedContent = {
      ...block.content,
      text: replaceVariables(block.content.text || ''),
    };

    addBotMessage(block.id, processedContent, block.type);

    setTimeout(() => {
      executeBlock(index + 1);
    }, 1000);
  };

  const handleTypingEffect = async (block: FunnelBlock, index: number) => {
    setIsTyping(true);
    const duration = (block.content as any).duration || 2000;

    await new Promise((resolve) => setTimeout(resolve, duration));

    setIsTyping(false);
    executeBlock(index + 1);
  };

  const handleRecordingEffect = async (block: FunnelBlock, index: number) => {
    setIsRecording(true);
    const duration = (block.content as any).duration || 2000;

    await new Promise((resolve) => setTimeout(resolve, duration));

    setIsRecording(false);
    executeBlock(index + 1);
  };

  const handleDelay = async (block: FunnelBlock, index: number) => {
    const duration = (block.content as any).duration || 1000;

    await new Promise((resolve) => setTimeout(resolve, duration));

    executeBlock(index + 1);
  };

  const addBotMessage = (id: string, content: any, blockType: string) => {
    setMessages((prev) => [...prev, {
      id,
      type: 'bot',
      content,
      blockType,
    }]);
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || !waitingForResponse) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: { text: userInput },
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      await supabase.from('lead_responses').insert([{
        conversation_id: conversation!.id,
        block_id: funnelCompleted ? null : blocks[currentBlockIndex].id,
        response_text: userInput,
      }]);

      const existingLeadData = conversation!.lead_data as Record<string, any> || {};
      await supabase
        .from('conversations')
        .update({
          lead_data: { ...existingLeadData, lastResponse: userInput },
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', conversation!.id);
    } catch (error) {
      console.error('Error saving response:', error);
    }

    setUserInput('');

    if (!funnelCompleted) {
      setWaitingForResponse(false);
      setTimeout(() => {
        executeBlock(currentBlockIndex + 1);
      }, 800);
    }
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !waitingForResponse || !conversation) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Por favor, selecione uma imagem válida (JPG, PNG, GIF ou WEBP)');
      return;
    }

    if (file.size > 5242880) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploadingImage(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${conversation.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(uploadData.path);

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: { text: '' },
        attachmentUrl: publicUrl,
        attachmentType: 'image',
      };

      setMessages((prev) => [...prev, userMessage]);

      await supabase.from('lead_responses').insert([{
        conversation_id: conversation.id,
        block_id: funnelCompleted ? null : blocks[currentBlockIndex].id,
        response_text: 'Enviou uma imagem',
        attachment_url: publicUrl,
        attachment_type: 'image',
      }]);

      const existingLeadData = conversation.lead_data as Record<string, any> || {};
      await supabase
        .from('conversations')
        .update({
          lead_data: { ...existingLeadData, lastResponse: 'Imagem enviada' },
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', conversation.id);

      if (!funnelCompleted) {
        setWaitingForResponse(false);
        setTimeout(() => {
          executeBlock(currentBlockIndex + 1);
        }, 800);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erro ao enviar imagem. Tente novamente.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEndBlock = async () => {
    try {
      await supabase
        .from('conversations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', conversation!.id);

      setFunnelCompleted(true);
      setWaitingForResponse(true);
    } catch (error) {
      console.error('Error ending conversation:', error);
    }
  };

  const completeConversation = async () => {
    try {
      await supabase
        .from('conversations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', conversation!.id);

      setFunnelCompleted(true);
      setWaitingForResponse(true);
    } catch (error) {
      console.error('Error completing conversation:', error);
    }
  };

  if (!funnel) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando chat...</p>
        </div>
      </div>
    );
  }

  if (isSearchingAgent || agentFound) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-emerald-100">
        <div className="text-center px-6">
          <div className="relative w-24 h-24 mx-auto mb-8">
            {!agentFound ? (
              <>
                <div className="absolute inset-0 rounded-full border-4 border-emerald-200"></div>
                <div className="absolute inset-0 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center animate-bounce">
                <div className="w-24 h-24 rounded-full bg-emerald-600 flex items-center justify-center shadow-xl">
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          <h2 className="text-2xl font-bold text-emerald-800 mb-3">
            {!agentFound ? 'Procurando agente disponível...' : 'Agente encontrado!'}
          </h2>
          <p className="text-emerald-600">
            {!agentFound ? 'Conectando você com um especialista' : 'Iniciando atendimento'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      <div className="bg-emerald-600 text-white px-4 py-3 flex items-center gap-3 shadow-md">
        <button className="p-2 hover:bg-emerald-700 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center flex-shrink-0">
          {funnel.profile_image_url ? (
            <img
              src={funnel.profile_image_url}
              alt={funnel.profile_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-emerald-100 text-emerald-600 font-bold text-lg">
              {funnel.profile_name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="font-semibold">{funnel.profile_name}</h1>
          <p className="text-xs text-emerald-100">Online</p>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto px-4 py-6 space-y-3"
        style={{
          backgroundColor: '#e5ddd5',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 800 800'%3E%3Cg fill='none' stroke='%23d9d1c7' stroke-width='1' opacity='0.3'%3E%3Cpath d='M769 229L1037 260.9M927 880L731 737 520 660 309 538 40 599 295 764 126.5 879.5 40 599-197 493 102 382-31 229 126.5 79.5-69-63'/%3E%3Cpath d='M-31 229L237 261 390 382 603 493 308.5 537.5 101.5 381.5M370 905L295 764'/%3E%3Cpath d='M520 660L578 842 731 737 840 599 603 493 520 660 295 764 309 538 390 382 539 269 769 229 577.5 41.5 370 105 295 -36 126.5 79.5 237 261 102 382 40 599 -69 737 127 880'/%3E%3Cpath d='M520-140L578.5 42.5 731-63M603 493L539 269 237 261 370 105M902 382L539 269M390 382L102 382'/%3E%3Cpath d='M-222 42L126.5 79.5 370 105 539 269 577.5 41.5 927 80 769 229 902 382 603 493 731 737M295-36L577.5 41.5M578 842L295 764M40-201L127 80M102 382L-261 269'/%3E%3C/g%3E%3Cg fill='%23d4cdc3'%3E%3Ccircle cx='769' cy='229' r='5'/%3E%3Ccircle cx='539' cy='269' r='5'/%3E%3Ccircle cx='603' cy='493' r='5'/%3E%3Ccircle cx='731' cy='737' r='5'/%3E%3Ccircle cx='520' cy='660' r='5'/%3E%3Ccircle cx='309' cy='538' r='5'/%3E%3Ccircle cx='295' cy='764' r='5'/%3E%3Ccircle cx='40' cy='599' r='5'/%3E%3Ccircle cx='102' cy='382' r='5'/%3E%3Ccircle cx='127' cy='80' r='5'/%3E%3Ccircle cx='370' cy='105' r='5'/%3E%3Ccircle cx='578' cy='42' r='5'/%3E%3Ccircle cx='237' cy='261' r='5'/%3E%3Ccircle cx='390' cy='382' r='5'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isTyping && <TypingIndicator />}
        {isRecording && <RecordingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white border-t border-gray-200 px-3 py-2 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/jpg"
          onChange={handleImageSelect}
          className="hidden"
          disabled={!waitingForResponse || uploadingImage}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!waitingForResponse || uploadingImage}
          className="p-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Enviar imagem"
        >
          {uploadingImage ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Camera className="w-5 h-5" />
          )}
        </button>

        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          disabled={!waitingForResponse || uploadingImage}
          placeholder={waitingForResponse ? 'Digite sua resposta...' : 'Aguarde...'}
          className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {userInput.trim() ? (
          <button
            onClick={handleSendMessage}
            disabled={!waitingForResponse || uploadingImage}
            className="p-2 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button
            className="p-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
            disabled={!waitingForResponse || uploadingImage}
          >
            <Mic className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
