import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { comparison } from '../services/api';
import ReactMarkdown from 'react-markdown';
import Spinner from '@atlaskit/spinner';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';

const MODEL_NAMES: { [key: string]: string } = {
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'xai': 'Xai',
  'google': 'Google',
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

export const History: React.FC = () => {
  const navigate = useNavigate();
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

  const handleDelete = async (e: React.MouseEvent, promptId: string) => {
    e.stopPropagation(); // Prevent navigation when clicking delete
    if (window.confirm('Are you sure you want to delete this prompt?')) {
      deleteMutation.mutate(promptId);
    }
  };

  const handleComparisonClick = (promptId: string) => {
    navigate(`/comparison/${promptId}`);
  };

  return (
    <>
      <PageHeader title="History" />
      <div className="p-8">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="large" />
          </div>
        ) : (
          <div className="space-y-6">
            {history?.map((item: any) => (
              <div 
                key={item.prompt_id} 
                className="card p-6 overflow-x-auto cursor-pointer hover:shadow-lg transition-shadow duration-200"
                onClick={() => handleComparisonClick(item.prompt_id)}
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6">
                  <div className="flex-1">
                    <div className="bg-[#23272F] rounded-lg p-4 border border-[#2C333A]">
                      <div className="flex items-center gap-2 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#B6C2CF]" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-[#B6C2CF]">Prompt</span>
                      </div>
                      <p className="text-white font-mono text-sm break-words whitespace-pre-wrap">{item.prompt}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#B6C2CF]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <time className="text-sm text-[#B6C2CF]" dateTime={item.created_at}>
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
                    onClick={(e) => handleDelete(e, item.prompt_id)}
                    className="mt-4 md:mt-0 ml-0 md:ml-4 text-[#EF5C48] hover:text-[#CA3521] transition-all duration-200 text-sm font-medium flex items-center gap-1 group"
                    title="Delete prompt"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5 transform group-hover:scale-110 transition-transform duration-200">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
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
    </>
  );
}

export default History; 