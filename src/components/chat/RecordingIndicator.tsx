import { Mic } from 'lucide-react';

export default function RecordingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-white rounded-lg px-4 py-3 shadow-sm flex items-center gap-2">
        <Mic className="w-4 h-4 text-red-500 animate-pulse" />
        <span className="text-sm text-gray-600">Gravando áudio...</span>
      </div>
    </div>
  );
}
