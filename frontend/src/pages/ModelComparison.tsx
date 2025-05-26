import React, { useEffect, useState } from 'react';
import { comparison } from '../services/api';
import Spinner from '@atlaskit/spinner';
import Page from '@atlaskit/page';
import Table from '@atlaskit/table';

interface ProviderModel {
  model_name: string;
  max_tokens: number;
  input_cost_per_token: number;
  output_cost_per_token: number;
  mode: string;
  provider: string;
}

const columns = [
  { key: 'provider', title: 'Provider' },
  { key: 'model_name', title: 'Model' },
  { key: 'max_tokens', title: 'Max Tokens' },
  { key: 'input_cost_per_token', title: 'Input Cost/Token' },
  { key: 'output_cost_per_token', title: 'Output Cost/Token' },
];

const ModelComparison: React.FC = () => {
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    comparison.getProviderModels()
      .then((data) => {
        setModels(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to fetch model data.');
        setLoading(false);
      });
  }, []);

  return (
    <Page>
      <div style={{
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        padding: 40,
        marginTop: 32,
        width: '90vw',
        maxWidth: 1200,
        minWidth: 340,
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        <h2 style={{ fontWeight: 700, fontSize: 28, marginBottom: 24 }}>Model Comparison Table</h2>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
            <Spinner size="large" />
          </div>
        ) : error ? (
          <div style={{ color: 'red', marginTop: 24 }}>{error}</div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: 24 }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                minWidth: 700,
                overflow: 'hidden',
              }}
            >
              <thead>
                <tr style={{ background: '#F4F5F7' }}>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, padding: '14px 18px', textAlign: 'left', fontWeight: 600, fontSize: 15, color: '#253858', borderBottom: '1px solid #DFE1E6' }}>Provider</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, padding: '14px 18px', textAlign: 'left', fontWeight: 600, fontSize: 15, color: '#253858', borderBottom: '1px solid #DFE1E6' }}>Model</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, padding: '14px 18px', textAlign: 'left', fontWeight: 600, fontSize: 15, color: '#253858', borderBottom: '1px solid #DFE1E6' }}>Max Tokens</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, padding: '14px 18px', textAlign: 'left', fontWeight: 600, fontSize: 15, color: '#253858', borderBottom: '1px solid #DFE1E6' }}>Input Cost/1k-Tokens</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, padding: '14px 18px', textAlign: 'left', fontWeight: 600, fontSize: 15, color: '#253858', borderBottom: '1px solid #DFE1E6' }}>Output Cost/1k-Tokens</th>
                </tr>
              </thead>
              <tbody>
                {models.map((model, idx) => (
                  <tr
                    key={`${model.provider}-${model.model_name}`}
                    style={{
                      background: idx % 2 === 0 ? '#FAFBFC' : 'white',
                      transition: 'background 0.2s',
                      cursor: 'pointer',
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = '#E6FCFF')}
                    onMouseOut={e => (e.currentTarget.style.background = idx % 2 === 0 ? '#FAFBFC' : 'white')}
                  >
                    <td style={{ padding: '12px 18px', borderBottom: '1px solid #F4F5F7', fontSize: 15 }}>{model.provider.charAt(0).toUpperCase() + model.provider.slice(1).toLowerCase()}</td>
                    <td style={{ padding: '12px 18px', borderBottom: '1px solid #F4F5F7', fontSize: 15 }}>{model.model_name}</td>
                    <td style={{ padding: '12px 18px', borderBottom: '1px solid #F4F5F7', fontSize: 15 }}>{model.max_tokens}</td>
                    <td style={{ padding: '12px 18px', borderBottom: '1px solid #F4F5F7', fontSize: 15 }}>{(model.input_cost_per_token*1000).toFixed(4)}</td>
                    <td style={{ padding: '12px 18px', borderBottom: '1px solid #F4F5F7', fontSize: 15 }}>{(model.output_cost_per_token*1000).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && models.length === 0 && !error && (
          <div style={{ marginTop: 24 }}>No models found.</div>
        )}
      </div>
    </Page>
  );
};

export default ModelComparison; 