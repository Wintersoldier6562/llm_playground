import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { comparison } from '../services/api';
import ReactMarkdown from 'react-markdown';

const MODEL_NAMES: { [key: string]: string } = {
  'openai': 'GPT-4',
  'anthropic': 'Claude',
  'xai': 'XAI',
};

const MetricBadge = ({ label, value, unit = '', color = 'blue' }: { label: string; value: string | number; unit?: string; color?: string }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colorMap[color] || colorMap.blue}`}>
      {label}: {value}{unit}
    </span>
  );
};

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    className={`w-5 h-5 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ModelResponse = ({ response }: { response: any }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const modelName = MODEL_NAMES[response.model_name] || response.model_name;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-lg transition-shadow duration-200 flex-1">
      <button
        className="w-full flex flex-col md:flex-row md:items-center justify-between px-5 py-4 cursor-pointer focus:outline-none group"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
      >
        <div className="flex-1 flex flex-col md:flex-row md:items-center md:gap-4">
          <span className="text-sm font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors mb-2 md:mb-0">{modelName}</span>
          <div className="flex flex-row space-x-2 md:space-x-4 items-center">
            <MetricBadge label="Tokens" value={response.usage.total_tokens} color="blue" />
            <MetricBadge label="Cost" value={`$${response.cost.toFixed(4)}`} color="green" />
            <MetricBadge label="Latency" value={response.latency.toFixed(2)} unit="s" color="yellow" />
          </div>
        </div>
        <span className="ml-0 md:ml-4 text-gray-400 group-hover:text-indigo-700 transition-colors"><ChevronIcon expanded={isExpanded} /></span>
      </button>
      {isExpanded && (
        <div className="prose max-w-none text-[#172B4D] font-mono text-sm leading-relaxed px-5 pb-5 pt-2 border-t border-gray-100 bg-gray-50 rounded-b-xl overflow-hidden max-h-96 overflow-auto">
          <ReactMarkdown>{response.content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export function History() {
  const { data: history, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: comparison.getHistory,
  });

  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (promptId: string) => comparison.deletePrompt(promptId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });

  const handleDelete = async (promptId: string) => {
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      deleteMutation.mutate(promptId);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#172B4D]">Comparison History</h1>
      </div>
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0052CC]"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {history?.map((item: any) => (
            <div key={item.prompt_id} className="bg-white shadow rounded-lg p-6 overflow-x-auto">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
                <div className="flex-1">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-gray-500">Prompt</span>
                    </div>
                    <p className="text-[#172B4D] font-mono text-sm break-words whitespace-pre-wrap">{item.prompt}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <time className="text-sm text-gray-500" dateTime={item.created_at}>
                      {new Date(item.created_at).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </time>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.prompt_id)}
                  className="mt-4 md:mt-0 ml-0 md:ml-4 text-[#DE350B] hover:text-[#FF5630] transition-colors text-sm font-medium flex items-center gap-1"
                  title="Delete prompt"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>Delete</span>
                </button>
              </div>
              <div className="flex flex-col md:flex-row gap-6">
                {item.responses.map((response: any) => (
                  <div key={response.model_name} className="flex-1">
                    <ModelResponse response={response} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 