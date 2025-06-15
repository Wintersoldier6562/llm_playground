import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { comparison } from '../services/api';
import ReactMarkdown from 'react-markdown';
import Spinner from '@atlaskit/spinner';
import SectionMessage from '@atlaskit/section-message';
// @ts-ignore
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { PageHeader } from '../components/PageHeader';

const MODEL_NAMES: { [key: string]: string } = {
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'xai': 'Xai',
  'google': 'Google',
};

interface ComparisonResponse {
  model_name: string;
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  cost: number;
  latency: number;
  created_at: string;
}

interface Comparison {
  prompt_id: string;
  prompt: string;
  responses: ComparisonResponse[];
  created_at: string;
}

export const ComparisonDetail: React.FC = () => {
  const { promptId } = useParams<{ promptId: string }>();
  const { data: comparisonData, isLoading, error } = useQuery<Comparison | undefined>({
    queryKey: ['comparison', promptId],
    queryFn: async () => {
      const history = await comparison.getHistory() as Comparison[];
      return history.find((item) => item.prompt_id === promptId);
    },
  });

  if (isLoading) {
    return (
      <>
        <PageHeader title="Comparison Details" />
        <div className="p-8">
          <div className="flex justify-center items-center h-64">
            <Spinner size="large" />
          </div>
        </div>
      </>
    );
  }

  if (error || !comparisonData) {
    return (
      <>
        <PageHeader title="Comparison Details" />
        <div className="p-8">
          <div className="flex justify-center items-center h-64">
            <SectionMessage appearance="error">
              {error ? 'Error loading comparison' : 'Comparison not found'}
            </SectionMessage>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Comparison Details" />
      <div className="p-8">
        <div className="card p-6">
          <div className="mb-6">
            <div className="bg-[#23272F] rounded-lg p-4 border border-[#2C333A]">
              <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#B6C2CF]" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-[#B6C2CF]">Prompt</span>
              </div>
              <p className="text-white font-mono text-sm break-words whitespace-pre-wrap">{comparisonData.prompt}</p>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#B6C2CF]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              <time className="text-sm text-[#B6C2CF]" dateTime={comparisonData.created_at}>
                {new Date(comparisonData.created_at).toLocaleString(undefined, {
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
        </div>
        <div className="mt-8 grid gap-8 justify-center" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
          {comparisonData.responses.map((response) => {
            const modelName = MODEL_NAMES[response.model_name] || response.model_name;
            return (
              <div key={response.model_name} className="card flex flex-col min-h-[220px] p-7">
                <h3 className="font-semibold mb-3 text-[#F8FAFC] capitalize">{modelName}</h3>
                <div className="bg-[#23272B] rounded-md p-3 overflow-x-auto">
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown>{response.content}</ReactMarkdown>
                  </div>
                </div>
                <div className="mt-4 text-xs text-[#94A3B8]">
                  <div>Tokens: {response.usage.total_tokens}</div>
                  <div>Latency: {response.latency.toFixed(2)}s</div>
                  <div>Cost: ${response.cost.toFixed(4)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}; 