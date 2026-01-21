import { memo } from 'react';
import { Handle, Position } from 'reactflow';
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

interface BlockNodeProps {
  data: {
    blockType: BlockType;
    content: any;
    orderIndex: number;
  };
  selected?: boolean;
}

const blockIcons: Record<BlockType, React.ReactNode> = {
  text: <MessageSquare className="w-4 h-4" />,
  question: <HelpCircle className="w-4 h-4" />,
  image: <Image className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  audio: <Mic className="w-4 h-4" />,
  typing_effect: <Keyboard className="w-4 h-4" />,
  recording_effect: <Radio className="w-4 h-4" />,
  delay: <Clock className="w-4 h-4" />,
  end: <StopCircle className="w-4 h-4" />,
};

const blockLabels: Record<BlockType, string> = {
  text: 'Mensagem de Texto',
  question: 'Pergunta',
  image: 'Imagem',
  video: 'Vídeo',
  audio: 'Áudio',
  typing_effect: 'Efeito Digitando',
  recording_effect: 'Efeito Gravando',
  delay: 'Delay',
  end: 'Finalizar Funil',
};

const blockColors: Record<BlockType, string> = {
  text: 'bg-blue-500',
  question: 'bg-purple-500',
  image: 'bg-pink-500',
  video: 'bg-red-500',
  audio: 'bg-orange-500',
  typing_effect: 'bg-gray-500',
  recording_effect: 'bg-gray-500',
  delay: 'bg-yellow-500',
  end: 'bg-red-600',
};

function BlockNode({ data, selected }: BlockNodeProps) {
  const { blockType, content } = data;

  const getPreviewText = () => {
    if (content.text) {
      return content.text.substring(0, 40) + (content.text.length > 40 ? '...' : '');
    }
    if (content.duration) {
      return `${content.duration / 1000}s`;
    }
    return blockLabels[blockType];
  };

  return (
    <div className={`bg-white rounded-lg border-2 shadow-md hover:shadow-lg transition-all min-w-[200px] ${
      selected ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-gray-300'
    }`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      <div className={`${blockColors[blockType]} text-white px-3 py-2 rounded-t-md flex items-center gap-2`}>
        {blockIcons[blockType]}
        <span className="text-sm font-medium">{blockLabels[blockType]}</span>
      </div>

      <div className="px-3 py-3">
        <p className="text-sm text-gray-700">{getPreviewText()}</p>
        {selected && (
          <p className="text-xs text-emerald-600 mt-2 font-medium">
            Clique em "Aplicar Alterações" no painel →
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
}

export default memo(BlockNode);
