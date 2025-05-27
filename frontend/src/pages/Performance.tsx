import { useQuery } from '@tanstack/react-query';
import { comparison } from '../services/api';

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

    // Initialize metrics for each model
    Object.keys(MODEL_NAMES).forEach(model => {
      modelMetrics[model] = {
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalCost: 0,
        totalLatency: 0,
        count: 0
      };
    });

    // Calculate metrics from history
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
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0052CC]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-[#FFEBE6] border border-[#FF8F73] text-[#DE350B] px-4 py-3 rounded-md">
            Error loading performance data. Please try again.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-24 font-medium text-[#172B4D]">Model Performance</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(MODEL_NAMES).map(([modelId, modelName]) => {
            const modelData = metrics[modelId];
            if (!modelData || modelData.count === 0) return null;

            return (
              <div key={modelId} className="bg-white rounded-lg shadow-sm border border-[#DFE1E6] p-6">
                <h2 className="text-20 font-medium text-[#172B4D] mb-4">{modelName}</h2>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-16 font-medium text-[#172B4D] mb-2">Tokens</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-14">
                        <span className="text-[#6B778C]">Prompt Tokens:</span>
                        <span className="font-medium text-[#172B4D]">
                          {modelData.totalPromptTokens.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-14">
                        <span className="text-[#6B778C]">Completion Tokens:</span>
                        <span className="font-medium text-[#172B4D]">
                          {modelData.totalCompletionTokens.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-14">
                        <span className="text-[#6B778C]">Total Tokens:</span>
                        <span className="font-medium text-[#172B4D]">
                          {(modelData.totalPromptTokens + modelData.totalCompletionTokens).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-14">
                        <span className="text-[#6B778C]">Average Tokens per Response:</span>
                        <span className="font-medium text-[#172B4D]">
                          {((modelData.totalPromptTokens + modelData.totalCompletionTokens) / modelData.count).toFixed(0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-16 font-medium text-[#172B4D] mb-2">Cost</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-14">
                        <span className="text-[#6B778C]">Total Cost:</span>
                        <span className="font-medium text-[#172B4D]">
                          ${modelData.totalCost.toFixed(4)}
                        </span>
                      </div>
                      <div className="flex justify-between text-14">
                        <span className="text-[#6B778C]">Average Cost per Response:</span>
                        <span className="font-medium text-[#172B4D]">
                          ${(modelData.totalCost / modelData.count).toFixed(4)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-16 font-medium text-[#172B4D] mb-2">Latency</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-14">
                        <span className="text-[#6B778C]">Total Latency:</span>
                        <span className="font-medium text-[#172B4D]">
                          {modelData.totalLatency.toFixed(2)}s
                        </span>
                      </div>
                      <div className="flex justify-between text-14">
                        <span className="text-[#6B778C]">Average Latency:</span>
                        <span className="font-medium text-[#172B4D]">
                          {(modelData.totalLatency / modelData.count).toFixed(2)}s
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-16 font-medium text-[#172B4D] mb-2">Usage</h3>
                    <div className="flex justify-between text-14">
                      <span className="text-[#6B778C]">Total Responses:</span>
                      <span className="font-medium text-[#172B4D]">
                        {modelData.count}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 