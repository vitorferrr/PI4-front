import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { isCancel } from 'axios';
import { api } from '../lib/api';
import { isTokenValid, startSession, useSession } from '../lib/session';

async function fazerLogin(email, senha) {
  const response = await api.post('/auth/login', { email, senha }, { skipAuth: true });
  startSession(response.data?.token);
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const token = useSession((state) => state.token);
  const location = useLocation();
  const from = location.state?.from;
  const returnPath = typeof from === 'string' && from.startsWith('/')
    && !from.startsWith('//') && !from.includes('\\') && !/^\/login(?:[/?#]|$)/.test(from)
    ? from : '/';

  const loginMutation = useMutation({
    mutationFn: () => fazerLogin(email, password),
    onError: (error) => {
      if (isCancel(error)) return;
      alert(error.response?.status === 401
        ? 'E-mail ou senha inválidos'
        : 'Não foi possível entrar. Tente novamente.');
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault(); 
    if (!loginMutation.isPending) loginMutation.mutate();
  };

  if (isTokenValid(token)) {
    return <Navigate to={returnPath} replace />;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f4f6f8' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', width: '350px' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#333' }}>Procon - Login</h2>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#555' }}>E-mail</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            placeholder="Digite seu e-mail"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#555' }}>Senha</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            placeholder="Digite sua senha"
            style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button 
            type="submit" 
            disabled={loginMutation.isPending}
            style={{ 
              width: '50%', 
              padding: '0.75rem', 
              backgroundColor: loginMutation.isPending ? '#a0c4ff' : '#007bff', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '4px', 
              fontWeight: 'bold', 
              cursor: loginMutation.isPending ? 'not-allowed' : 'pointer' 
            }}
          >
            {loginMutation.isPending ? 'Entrando...' : 'Entrar'}
          </button>
        </div>
      </form>
    </div>
  );
}
