import React from 'react';
import { AlertTriangle, FlaskConical } from 'lucide-react';

interface AiNoticeProps {
  message: string;
  tone?: 'error' | 'simulated';
}

export const AiNotice: React.FC<AiNoticeProps> = ({ message, tone = 'error' }) => {
  const isSimulated = tone === 'simulated';
  const Icon = isSimulated ? FlaskConical : AlertTriangle;

  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-xl border px-2.5 py-2 text-[11px] font-medium leading-snug ${
        isSimulated ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-rose-50 border-rose-200 text-rose-700'
      }`}
    >
      <Icon className={`w-3.5 h-3.5 shrink-0 mt-px ${isSimulated ? 'text-amber-600' : 'text-rose-600'}`} />
      <span>{message}</span>
    </div>
  );
};
