import { useQuery } from '@tanstack/react-query';
import { comparison } from '../services/api';
import Page from '@atlaskit/page';
import Spinner from '@atlaskit/spinner';

const MODEL_NAMES: { [key: string]: string } = {
  'openai': 'OpenAI',
  'anthropic': 'Anthropic',
  'xai': 'Xai',
  'google': 'Google',
};

interface ModelMetrics {
  totalPromptTokens: number;
  totalCompletionTokens: number;
  totalCost: number;
  totalLatency: number;
  count: number;
}

export function Performance() {
  const { data: history, isLoading, error } = useQuery({
    queryKey: ['history'],
    queryFn: comparison.getHistory,
  });

  const calculateMetrics = () => {
    if (!history || !Array.isArray(history)) return {};
    const modelMetrics: { [key: string]: ModelMetrics } = {};
    Object.keys(MODEL_NAMES).forEach(model => {
      modelMetrics[model] = {
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalCost: 0,
        totalLatency: 0,
        count: 0
      };
    });
    history.forEach((comparison) => {
      if (comparison.responses && Array.isArray(comparison.responses)) {
        comparison.responses.forEach((response: any) => {
          const model = response.model_name;
          if (modelMetrics[model]) {
            modelMetrics[model].totalPromptTokens += response.usage.prompt_tokens;
            modelMetrics[model].totalCompletionTokens += response.usage.completion_tokens;
            modelMetrics[model].totalCost += response.cost;
            modelMetrics[model].totalLatency += response.latency;
            modelMetrics[model].count++;
          }
        });
      }
    });
    return modelMetrics;
  };

  const metrics = calculateMetrics();

  if (isLoading) {
    return (
      <Page>
        <div className="flex justify-center items-center h-64">
          <Spinner size="large" />
        </div>
      </Page>
    );
  }

  if (error) {
    return (
      <Page>
        <div className="flex justify-center items-center h-64">
          <div className="bg-[#CA3521] text-white px-4 py-3 rounded-md card">
            Error loading performance data. Please try again.
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Model Performance</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(MODEL_NAMES).map(([modelId, modelName]) => {
          const modelData = metrics[modelId];
          if (!modelData || modelData.count === 0) return null;
          return (
            <div key={modelId} className="card p-6">
              <h2 className="text-xl font-medium text-white mb-4">{modelName}</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-medium text-[#B6C2CF] mb-2">Tokens</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B6C2CF]">Prompt Tokens:</span>
                      <span className="font-medium text-white">
                        {modelData.totalPromptTokens.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B6C2CF]">Completion Tokens:</span>
                      <span className="font-medium text-white">
                        {modelData.totalCompletionTokens.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B6C2CF]">Total Tokens:</span>
                      <span className="font-medium text-white">
                        {(modelData.totalPromptTokens + modelData.totalCompletionTokens).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B6C2CF]">Average Tokens per Response:</span>
                      <span className="font-medium text-white">
                        {((modelData.totalPromptTokens + modelData.totalCompletionTokens) / modelData.count).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-medium text-[#B6C2CF] mb-2">Cost</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B6C2CF]">Total Cost:</span>
                      <span className="font-medium text-white">
                        ${modelData.totalCost.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B6C2CF]">Average Cost per Response:</span>
                      <span className="font-medium text-white">
                        ${(modelData.totalCost / modelData.count).toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-medium text-[#B6C2CF] mb-2">Latency</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B6C2CF]">Total Latency:</span>
                      <span className="font-medium text-white">
                        {modelData.totalLatency.toFixed(2)}s
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B6C2CF]">Average Latency:</span>
                      <span className="font-medium text-white">
                        {(modelData.totalLatency / modelData.count).toFixed(2)}s
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-base font-medium text-[#B6C2CF] mb-2">Usage</h3>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#B6C2CF]">Total Responses:</span>
                    <span className="font-medium text-white">
                      {modelData.count}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Page>
  );
} 