import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { comparison } from '../services/api';
import ReactMarkdown from 'react-markdown';
import Spinner from '@atlaskit/spinner';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import SectionMessage from '@atlaskit/section-message';
// @ts-ignore
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
// @ts-ignore
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';

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
    className={`w-5 h-5 transform transition-transform ${expanded ? 'rotate-180' : ''}`}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ModelResponse = ({ response }: { response: any }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [tabIndex, setTabIndex] = React.useState(0);
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
        <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <Tabs id={`tabs-${response.model_name}`} selected={tabIndex} onChange={setTabIndex}>
            <TabList>
              <Tab>Markdown</Tab>
              <Tab>Raw</Tab>
            </TabList>
            <TabPanel>
              <div className="prose max-w-none text-[#172B4D] font-mono text-sm leading-relaxed overflow-hidden max-h-96 overflow-auto">
                <ReactMarkdown>{response.content}</ReactMarkdown>
              </div>
            </TabPanel>
            <TabPanel>
              <div className="bg-[#23272B] rounded-md p-3 overflow-x-auto">
                <SyntaxHighlighter language="xml" style={docco} showLineNumbers customStyle={{ background: '#23272B', color: '#F8FAFC' }}>
                  {response.content}
                </SyntaxHighlighter>
              </div>
            </TabPanel>
          </Tabs>
        </div>
      )}
    </div>
  );
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
      <div className="min-h-screen bg-[#0F172A] py-8">
        <div className="flex justify-center items-center h-64">
          <Spinner size="large" />
        </div>
      </div>
    );
  }

  if (error || !comparisonData) {
    return (
      <div className="min-h-screen bg-[#0F172A] py-8">
        <div className="flex justify-center items-center h-64">
          <SectionMessage appearance="error">
            {error ? 'Error loading comparison' : 'Comparison not found'}
          </SectionMessage>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] py-8">
      <div className="card mx-auto p-8" style={{ width: '90vw', maxWidth: 1200, minWidth: 340 }}>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Comparison Details</h1>
        </div>
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
  );
}; 