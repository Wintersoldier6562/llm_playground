import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../features/auth/authSlice';
import type { RootState, AppDispatch } from '../store';
import Page from '@atlaskit/page';
import Button from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const error = useSelector((state: RootState) => state.auth.error);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/chat');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await dispatch(login({ email, password }));
  };

  return (
    <Page>
      <div className="min-h-screen flex items-center justify-center bg-[#1B2638] py-12 px-4">
        <div className="max-w-md w-full card p-8 space-y-8">
          <div>
            <h2 className="mt-2 text-center text-3xl font-bold text-white">Sign in to your account</h2>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email-address" className="label mb-1">Email address</label>
                <Textfield
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  isRequired
                  value={email}
                  onChange={e => setEmail((e.target as HTMLInputElement).value)}
                  placeholder="Email address"
                  className="input"
                  style={{ background: 'var(--color-input-bg)', color: 'white', borderColor: 'var(--color-input-border)' }}
                />
              </div>
              <div>
                <label htmlFor="password" className="label mb-1">Password</label>
                <Textfield
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  isRequired
                  value={password}
                  onChange={e => setPassword((e.target as HTMLInputElement).value)}
                  placeholder="Password"
                  className="input"
                  style={{ background: 'var(--color-input-bg)', color: 'white', borderColor: 'var(--color-input-border)' }}
                />
              </div>
            </div>
            {error && (
              <div className="text-[#EF5C48] text-sm text-center">{error}</div>
            )}
            <div>
              <Button
                type="submit"
                appearance="primary"
                shouldFitContainer
                style={{ background: 'var(--color-primary)', color: 'var(--color-sidebar-active-text)' }}
              >
                Sign in
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Page>
  );
} 