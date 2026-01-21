interface ChatMessageProps {
  message: {
    type: 'bot' | 'user';
    content: any;
    blockType?: string;
    attachmentUrl?: string;
    attachmentType?: string;
  };
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isBot = message.type === 'bot';

  const renderContent = () => {
    if (message.attachmentUrl && message.attachmentType === 'image') {
      return (
        <div>
          <img
            src={message.attachmentUrl}
            alt="Imagem enviada"
            className="rounded-lg max-w-full mb-1 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => window.open(message.attachmentUrl, '_blank')}
            onError={(e) => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EErro ao carregar%3C/text%3E%3C/svg%3E';
            }}
          />
          {message.content.text && (
            <p className="text-sm whitespace-pre-wrap">{message.content.text}</p>
          )}
        </div>
      );
    }

    switch (message.blockType) {
      case 'text':
      case 'question':
        return (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content.text}
          </p>
        );

      case 'image':
        return (
          <div>
            {message.content.mediaUrl && (
              <img
                src={message.content.mediaUrl}
                alt="Image"
                className="rounded-lg max-w-full mb-2"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImagem%3C/text%3E%3C/svg%3E';
                }}
              />
            )}
            {message.content.text && (
              <p className="text-sm whitespace-pre-wrap">{message.content.text}</p>
            )}
          </div>
        );

      case 'video':
        return (
          <div>
            {message.content.mediaUrl && (
              <video
                src={message.content.mediaUrl}
                controls
                className="rounded-lg max-w-full mb-2"
              />
            )}
            {message.content.text && (
              <p className="text-sm whitespace-pre-wrap">{message.content.text}</p>
            )}
          </div>
        );

      case 'audio':
        return (
          <div>
            {message.content.mediaUrl && (
              <audio src={message.content.mediaUrl} controls className="w-full" />
            )}
          </div>
        );

      default:
        return (
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content.text || ''}
          </p>
        );
    }
  };

  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[75%] rounded-lg px-4 py-2 shadow-sm ${
          isBot
            ? 'bg-white text-gray-800'
            : 'bg-emerald-500 text-white'
        }`}
      >
        {renderContent()}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className={`text-xs ${isBot ? 'text-gray-500' : 'text-emerald-100'}`}>
            {new Date().toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </div>
  );
}
