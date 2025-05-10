import { useQuery } from '@tanstack/react-query';
import { comparison } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const MODEL_NAMES: { [key: string]: string } = {
  'openai': 'GPT-4',
  'anthropic': 'Claude',
  'xai': 'XAI',
};

interface ChartData {
  model: string;
  avgPromptTokens: number;
  avgCompletionTokens: number;
  avgLatency: number;
  avgCost: number;
}

interface ModelResponse {
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

interface ComparisonResponse {
  prompt_id: string;
  prompt: string;
  responses: ModelResponse[];
  created_at: string;
}

export function Charts() {
  const { data: history, isLoading, error } = useQuery<ComparisonResponse[]>({
    queryKey: ['history'],
    queryFn: comparison.getHistory,
  });

  const calculateMetrics = (): ChartData[] => {
    if (!history || !Array.isArray(history)) return [];

    const modelMetrics: { [key: string]: { promptTokens: number[]; completionTokens: number[]; latency: number[]; cost: number[]; count: number } } = {};

    // Initialize metrics for each model
    Object.keys(MODEL_NAMES).forEach(model => {
      modelMetrics[model] = { promptTokens: [], completionTokens: [], latency: [], cost: [], count: 0 };
    });

    // Calculate metrics from history
    history.forEach((comparison) => {
      if (comparison.responses && Array.isArray(comparison.responses)) {
        comparison.responses.forEach((response: ModelResponse) => {
          const model = response.model_name;
          if (modelMetrics[model]) {
            modelMetrics[model].promptTokens.push(response.usage.prompt_tokens);
            modelMetrics[model].completionTokens.push(response.usage.completion_tokens);
            modelMetrics[model].latency.push(response.latency);
            modelMetrics[model].cost.push(response.cost);
            modelMetrics[model].count++;
          }
        });
      }
    });

    // Calculate averages and format data for charts
    return Object.entries(modelMetrics).map(([model, metrics]) => ({
      model: MODEL_NAMES[model],
      avgPromptTokens: metrics.count > 0 ? Number((metrics.promptTokens.reduce((a, b) => a + b, 0) / metrics.count).toFixed(2)) : 0,
      avgCompletionTokens: metrics.count > 0 ? Number((metrics.completionTokens.reduce((a, b) => a + b, 0) / metrics.count).toFixed(2)) : 0,
      avgLatency: metrics.count > 0 ? Number((metrics.latency.reduce((a, b) => a + b, 0) / metrics.count).toFixed(2)) : 0,
      avgCost: metrics.count > 0 ? Number((metrics.cost.reduce((a, b) => a + b, 0) / metrics.count).toFixed(4)) : 0,
    }));
  };

  const chartData = calculateMetrics();

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
            Error loading chart data. Please try again.
          </div>
        </div>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center text-[#6B778C]">
            No data available for charts. Try comparing some models first.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-24 font-medium text-[#172B4D]">Model Performance Charts</h1>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Prompt Tokens Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-[#DFE1E6] p-6">
            <h2 className="text-16 font-medium text-[#172B4D] mb-4">Average Prompt Tokens per Response</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
                  <XAxis 
                    dataKey="model" 
                    tick={{ fill: '#172B4D' }}
                    axisLine={{ stroke: '#DFE1E6' }}
                  />
                  <YAxis 
                    tick={{ fill: '#172B4D' }}
                    axisLine={{ stroke: '#DFE1E6' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #DFE1E6',
                      borderRadius: '3px',
                      boxShadow: '0 1px 3px rgba(9, 30, 66, 0.13)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="avgPromptTokens" fill="#0052CC" name="Average Prompt Tokens" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Completion Tokens Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-[#DFE1E6] p-6">
            <h2 className="text-16 font-medium text-[#172B4D] mb-4">Average Completion Tokens per Response</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
                  <XAxis 
                    dataKey="model" 
                    tick={{ fill: '#172B4D' }}
                    axisLine={{ stroke: '#DFE1E6' }}
                  />
                  <YAxis 
                    tick={{ fill: '#172B4D' }}
                    axisLine={{ stroke: '#DFE1E6' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #DFE1E6',
                      borderRadius: '3px',
                      boxShadow: '0 1px 3px rgba(9, 30, 66, 0.13)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="avgCompletionTokens" fill="#36B37E" name="Average Completion Tokens" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Average Latency Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-[#DFE1E6] p-6">
            <h2 className="text-16 font-medium text-[#172B4D] mb-4">Average Latency (ms)</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
                  <XAxis 
                    dataKey="model" 
                    tick={{ fill: '#172B4D' }}
                    axisLine={{ stroke: '#DFE1E6' }}
                  />
                  <YAxis 
                    tick={{ fill: '#172B4D' }}
                    axisLine={{ stroke: '#DFE1E6' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #DFE1E6',
                      borderRadius: '3px',
                      boxShadow: '0 1px 3px rgba(9, 30, 66, 0.13)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="avgLatency" fill="#FF5630" name="Average Latency" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Average Cost Chart */}
          <div className="bg-white rounded-lg shadow-sm border border-[#DFE1E6] p-6">
            <h2 className="text-16 font-medium text-[#172B4D] mb-4">Average Cost per Response</h2>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#DFE1E6" />
                  <XAxis 
                    dataKey="model" 
                    tick={{ fill: '#172B4D' }}
                    axisLine={{ stroke: '#DFE1E6' }}
                  />
                  <YAxis 
                    tick={{ fill: '#172B4D' }}
                    axisLine={{ stroke: '#DFE1E6' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #DFE1E6',
                      borderRadius: '3px',
                      boxShadow: '0 1px 3px rgba(9, 30, 66, 0.13)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="avgCost" fill="#6554C0" name="Average Cost" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 