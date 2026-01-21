import {
  MessageSquare,
  HelpCircle,
  Image,
  Video,
  Mic,
  Keyboard,
  Radio,
  Clock,
  StopCircle,
} from 'lucide-react';
import type { BlockType } from '../../lib/database.types';

interface BlockSidebarProps {
  onAddBlock: (blockType: BlockType) => void;
}

const blocks = [
  {
    type: 'text' as BlockType,
    label: 'Texto',
    icon: MessageSquare,
    description: 'Enviar mensagem de texto',
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  {
    type: 'question' as BlockType,
    label: 'Pergunta',
    icon: HelpCircle,
    description: 'Fazer uma pergunta e aguardar resposta',
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    type: 'image' as BlockType,
    label: 'Imagem',
    icon: Image,
    description: 'Enviar uma imagem',
    color: 'bg-pink-500 hover:bg-pink-600',
  },
  {
    type: 'video' as BlockType,
    label: 'Vídeo',
    icon: Video,
    description: 'Enviar um vídeo',
    color: 'bg-red-500 hover:bg-red-600',
  },
  {
    type: 'audio' as BlockType,
    label: 'Áudio',
    icon: Mic,
    description: 'Enviar um áudio',
    color: 'bg-orange-500 hover:bg-orange-600',
  },
  {
    type: 'typing_effect' as BlockType,
    label: 'Digitando...',
    icon: Keyboard,
    description: 'Mostrar efeito "digitando"',
    color: 'bg-gray-500 hover:bg-gray-600',
  },
  {
    type: 'recording_effect' as BlockType,
    label: 'Gravando...',
    icon: Radio,
    description: 'Mostrar efeito "gravando áudio"',
    color: 'bg-gray-500 hover:bg-gray-600',
  },
  {
    type: 'delay' as BlockType,
    label: 'Delay',
    icon: Clock,
    description: 'Aguardar tempo antes da próxima mensagem',
    color: 'bg-yellow-500 hover:bg-yellow-600',
  },
  {
    type: 'end' as BlockType,
    label: 'Finalizar',
    icon: StopCircle,
    description: 'Finalizar o funil (lead pode continuar conversando)',
    color: 'bg-red-500 hover:bg-red-600',
  },
];

export default function BlockSidebar({ onAddBlock }: BlockSidebarProps) {
  return (
    <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Blocos Disponíveis</h2>
        <p className="text-sm text-gray-600 mt-1">Arraste ou clique para adicionar</p>
      </div>

      <div className="p-4 space-y-3">
        {blocks.map((block) => {
          const Icon = block.icon;
          return (
            <button
              key={block.type}
              onClick={() => onAddBlock(block.type)}
              className={`w-full ${block.color} text-white rounded-lg p-4 transition-colors text-left group hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">{block.label}</h3>
                  <p className="text-xs opacity-90 mt-1">{block.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Como usar:</h3>
        <ul className="text-xs text-gray-600 space-y-2">
          <li>• Clique em um bloco para adicioná-lo ao canvas</li>
          <li>• Conecte os blocos arrastando das bolinhas</li>
          <li>• Clique em um bloco para editá-lo</li>
          <li>• Salve o funil para aplicar as mudanças</li>
        </ul>
      </div>
    </div>
  );
}
