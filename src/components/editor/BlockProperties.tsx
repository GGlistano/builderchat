import { useState, useEffect } from 'react';
import { X, Trash2, Check } from 'lucide-react';
import type { Node } from 'reactflow';

interface BlockPropertiesProps {
  node: Node;
  onUpdate: (data: any) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function BlockProperties({ node, onUpdate, onDelete, onClose }: BlockPropertiesProps) {
  const [content, setContent] = useState(node.data.content);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setContent(node.data.content);
    setSaved(false);
  }, [node]);

  const handleSave = () => {
    onUpdate({ content });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const renderFields = () => {
    const blockType = node.data.blockType;

    switch (blockType) {
      case 'text':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Texto da Mensagem
            </label>
            <textarea
              value={content.text || ''}
              onChange={(e) => setContent({ ...content, text: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              rows={4}
              placeholder="Digite a mensagem..."
            />
          </div>
        );

      case 'question':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pergunta
              </label>
              <textarea
                value={content.text || ''}
                onChange={(e) => setContent({ ...content, text: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                rows={3}
                placeholder="Digite a pergunta..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Resposta
              </label>
              <select
                value={content.questionType || 'text'}
                onChange={(e) => setContent({ ...content, questionType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="text">Texto Livre</option>
                <option value="email">Email</option>
                <option value="phone">Telefone</option>
                <option value="multiple_choice">Múltipla Escolha</option>
              </select>
            </div>

            {content.questionType === 'multiple_choice' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Opções (uma por linha)
                </label>
                <textarea
                  value={content.options?.join('\n') || ''}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      options: e.target.value.split('\n').filter((o) => o.trim()),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  rows={4}
                  placeholder="Opção 1&#10;Opção 2&#10;Opção 3"
                />
              </div>
            )}
          </div>
        );

      case 'image':
      case 'video':
      case 'audio':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL do {blockType === 'image' ? 'Imagem' : blockType === 'video' ? 'Vídeo' : 'Áudio'}
              </label>
              <input
                type="url"
                value={content.mediaUrl || ''}
                onChange={(e) => setContent({ ...content, mediaUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="https://exemplo.com/arquivo.jpg"
              />
              <p className="mt-1 text-xs text-gray-500">
                Cole o link da mídia hospedada
              </p>
            </div>

            {blockType !== 'audio' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Legenda (opcional)
                </label>
                <textarea
                  value={content.text || ''}
                  onChange={(e) => setContent({ ...content, text: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  rows={2}
                  placeholder="Adicione uma legenda..."
                />
              </div>
            )}
          </div>
        );

      case 'typing_effect':
      case 'recording_effect':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duração (segundos)
            </label>
            <input
              type="number"
              min="0.5"
              max="10"
              step="0.5"
              value={(content.duration || 2000) / 1000}
              onChange={(e) =>
                setContent({ ...content, duration: parseFloat(e.target.value) * 1000 })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Tempo que o efeito será exibido (0.5 a 10 segundos)
            </p>
          </div>
        );

      case 'delay':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tempo de Espera (segundos)
            </label>
            <input
              type="number"
              min="0.5"
              max="60"
              step="0.5"
              value={(content.duration || 1000) / 1000}
              onChange={(e) =>
                setContent({ ...content, duration: parseFloat(e.target.value) * 1000 })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Pausa antes da próxima mensagem (0.5 a 60 segundos)
            </p>
          </div>
        );

      case 'end':
        return (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2">Bloco de Finalização</h3>
            <p className="text-sm text-red-800 mb-3">
              Este bloco encerra o funil de forma silenciosa. Quando o lead chegar aqui:
            </p>
            <ul className="text-sm text-red-700 space-y-2 ml-4">
              <li>O funil para de enviar mensagens automaticamente</li>
              <li>O lead pode continuar enviando mensagens</li>
              <li>Nenhuma mensagem de despedida é enviada</li>
              <li>A conversa fica disponível na caixa de entrada</li>
            </ul>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">Propriedades do Bloco</h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
        <p className="text-sm text-blue-800">
          <strong>Dica:</strong> Faça as alterações e clique em "Aplicar Alterações" para salvar.
        </p>
      </div>

      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        {renderFields()}

        {(node.data.blockType === 'text' || node.data.blockType === 'question') && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <details className="group">
              <summary className="cursor-pointer text-sm font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-2">
                <span>📋 Variáveis Disponíveis</span>
                <span className="text-xs text-gray-500 group-open:hidden">(clique para ver)</span>
              </summary>

              <div className="mt-3 space-y-4">
                <div className="bg-gray-50 p-3 rounded-lg text-xs">
                  <p className="font-medium text-gray-700 mb-2">Use variáveis no texto assim:</p>
                  <code className="block bg-white px-2 py-1 rounded border border-gray-200 text-emerald-600">
                    Olá {`{{customer_name}}`}, vi que você solicitou {`{{valor_emprestimo}}`}
                  </code>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 text-xs mb-2">👤 Dados do Cliente:</h4>
                  <div className="space-y-1 text-xs">
                    <div className="bg-emerald-50 px-2 py-1 rounded">
                      <code className="text-emerald-700">{`{{customer_name}}`}</code>
                      <span className="text-gray-600 ml-2">Nome do cliente</span>
                    </div>
                    <div className="bg-emerald-50 px-2 py-1 rounded">
                      <code className="text-emerald-700">{`{{customer_email}}`}</code>
                      <span className="text-gray-600 ml-2">Email</span>
                    </div>
                    <div className="bg-emerald-50 px-2 py-1 rounded">
                      <code className="text-emerald-700">{`{{customer_phone}}`}</code>
                      <span className="text-gray-600 ml-2">Telefone</span>
                    </div>
                    <div className="bg-emerald-50 px-2 py-1 rounded">
                      <code className="text-emerald-700">{`{{order_number}}`}</code>
                      <span className="text-gray-600 ml-2">Nº do pedido</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 text-xs mb-2">💰 Empréstimo:</h4>
                  <div className="space-y-1 text-xs">
                    <div className="bg-emerald-50 px-2 py-1 rounded">
                      <code className="text-emerald-700">{`{{valor}}`}</code>
                      <span className="text-gray-600 ml-2">Valor do empréstimo</span>
                    </div>
                    <div className="bg-emerald-50 px-2 py-1 rounded">
                      <code className="text-emerald-700">{`{{prazo}}`}</code>
                      <span className="text-gray-600 ml-2">Prazo de pagamento</span>
                    </div>
                    <div className="bg-emerald-50 px-2 py-1 rounded">
                      <code className="text-emerald-700">{`{{motivo}}`}</code>
                      <span className="text-gray-600 ml-2">Motivo do empréstimo</span>
                    </div>
                    <div className="bg-emerald-50 px-2 py-1 rounded">
                      <code className="text-emerald-700">{`{{taxa_inscricao}}`}</code>
                      <span className="text-gray-600 ml-2">Taxa de inscrição</span>
                    </div>
                    <div className="bg-emerald-50 px-2 py-1 rounded">
                      <code className="text-emerald-700">{`{{juros_mensais}}`}</code>
                      <span className="text-gray-600 ml-2">Juros mensais</span>
                    </div>
                    <div className="bg-emerald-50 px-2 py-1 rounded">
                      <code className="text-emerald-700">{`{{parcela_estimada}}`}</code>
                      <span className="text-gray-600 ml-2">Parcela mensal estimada</span>
                    </div>
                    <div className="bg-emerald-50 px-2 py-1 rounded">
                      <code className="text-emerald-700">{`{{forma_pagamento}}`}</code>
                      <span className="text-gray-600 ml-2">Forma de pagamento</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 text-xs mb-2">📍 Localização:</h4>
                  <div className="space-y-1 text-xs">
                    <div className="bg-emerald-50 px-2 py-1 rounded">
                      <code className="text-emerald-700">{`{{provincia}}`}</code>
                      <span className="text-gray-600 ml-2">Província</span>
                    </div>
                    <div className="bg-emerald-50 px-2 py-1 rounded">
                      <code className="text-emerald-700">{`{{bairro}}`}</code>
                      <span className="text-gray-600 ml-2">Bairro</span>
                    </div>
                    <div className="bg-emerald-50 px-2 py-1 rounded">
                      <code className="text-emerald-700">{`{{quarteirao}}`}</code>
                      <span className="text-gray-600 ml-2">Quarteirão</span>
                    </div>
                    <div className="bg-emerald-50 px-2 py-1 rounded">
                      <code className="text-emerald-700">{`{{numero_casa}}`}</code>
                      <span className="text-gray-600 ml-2">Número da casa</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-700 text-xs mb-2">💼 Profissional:</h4>
                  <div className="space-y-1 text-xs">
                    <div className="bg-emerald-50 px-2 py-1 rounded">
                      <code className="text-emerald-700">{`{{sector_trabalho}}`}</code>
                      <span className="text-gray-600 ml-2">Sector de trabalho</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-2 rounded text-xs">
                  <p className="text-gray-600 mb-1"><strong>💡 Dica:</strong> Qualquer outro campo enviado pelo formulário também pode ser usado!</p>
                  <p className="text-gray-500 italic">Basta usar o nome exato do campo entre {`{{chaves duplas}}`}</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-xs">
                  <p className="text-yellow-800">
                    <strong>⚠️ Importante:</strong> As variáveis só funcionam quando o chat é iniciado via ticket (formulário). Se não houver dados, o texto da variável aparecerá vazio.
                  </p>
                </div>
              </div>
            </details>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-200 space-y-2">
        <button
          onClick={handleSave}
          className={`w-full px-4 py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2 ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {saved ? (
            <>
              <Check className="w-5 h-5" />
              Salvo com Sucesso!
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Aplicar Alterações
            </>
          )}
        </button>
        <button
          onClick={() => {
            if (confirm('Tem certeza que deseja excluir este bloco?')) {
              onDelete();
            }
          }}
          className="w-full px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Excluir Bloco
        </button>
      </div>
    </div>
  );
}
