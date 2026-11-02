import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useNovaVisitaStore } from '../store/novaVisitaStore';

async function buscarUsuarios() {
  const response = await api.get('/usuarios');
  return response.data;
}

async function criarVisita(dados) {
  const response = await api.post('/visitas', dados);
  return response.data;
}

function mensagemDeErro(error) {
  const resposta = error.response?.data;
  if (!resposta?.mensagem) {
    return ['Não foi possível criar a visita. Tente novamente.'];
  }
  return [resposta.mensagem, ...(resposta.erros ?? [])];
}

function validar({ denunciado, dataAgendada }) {
  const erros = {};
  if (!denunciado.trim()) {
    erros.denunciado = 'Informe os dados do denunciado.';
  }
  if (!dataAgendada) {
    erros.dataAgendada = 'Informe a data agendada.';
  }
  return erros;
}

const labelStyle = { display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: '#555' };
const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box', fontFamily: 'inherit' };
const campoStyle = { marginBottom: '1rem' };
const erroCampoStyle = { marginTop: '0.35rem', color: '#c0392b', fontSize: '0.85rem' };
const inputComErro = (temErro) => (temErro ? { ...inputStyle, borderColor: '#e74c3c' } : inputStyle);

export default function GestorNovaVisitaPage() {
  const navigate = useNavigate();
  const [denunciado, setDenunciado] = useState('');
  const [endereco, setEndereco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataAgendada, setDataAgendada] = useState('');
  const [erros, setErros] = useState({});
  const queryClient = useQueryClient();

  const fiscalizadoresSelecionados = useNovaVisitaStore((state) => state.fiscalizadoresSelecionados);
  const toggleFiscalizador = useNovaVisitaStore((state) => state.toggleFiscalizador);
  const limparSelecao = useNovaVisitaStore((state) => state.limparSelecao);

  useEffect(() => {
    return () => limparSelecao();
  }, [limparSelecao]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['usuarios'],
    queryFn: buscarUsuarios,
  });

  const fiscalizadores = (data ?? []).filter((u) => u.role === 'fiscalizador');

  // endereco e descricao ainda não existem no back, por isso não são enviados
  const criarMutation = useMutation({
    mutationFn: () => criarVisita({
      denunciado,
      data_agendada: dataAgendada ? new Date(dataAgendada).toISOString() : undefined,
      fiscalizadores_ids: fiscalizadoresSelecionados,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitas'] });
      limparSelecao();
      navigate('/');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const novosErros = validar({ denunciado, dataAgendada });
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) {
      return;
    }
    criarMutation.mutate();
  };

  return (
    <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', maxWidth: '600px' }}>
      <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#333' }}>Nova visita</h2>

      {criarMutation.isError && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#fdecea', color: '#c0392b', borderRadius: '4px', fontSize: '0.9rem' }}>
          {mensagemDeErro(criarMutation.error).map((msg, i) => (
            <div key={i}>{msg}</div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={campoStyle}>
          <label style={labelStyle}>Dados do denunciado *</label>
          <input
            type="text"
            value={denunciado}
            onChange={(e) => setDenunciado(e.target.value)}
            placeholder="Nome ou razão social do denunciado"
            style={inputComErro(erros.denunciado)}
          />
          {erros.denunciado && <div style={erroCampoStyle}>{erros.denunciado}</div>}
        </div>

        <div style={campoStyle}>
          <label style={labelStyle}>Endereço</label>
          <input
            type="text"
            value={endereco}
            onChange={(e) => setEndereco(e.target.value)}
            placeholder="Rua, número, bairro, cidade"
            style={inputStyle}
          />
        </div>

        <div style={campoStyle}>
          <label style={labelStyle}>Data agendada *</label>
          <input
            type="datetime-local"
            value={dataAgendada}
            onChange={(e) => setDataAgendada(e.target.value)}
            style={inputComErro(erros.dataAgendada)}
          />
          {erros.dataAgendada && <div style={erroCampoStyle}>{erros.dataAgendada}</div>}
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Descrição da denúncia</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={5}
            placeholder="Descreva a denúncia"
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={labelStyle}>Fiscalizadores</label>

          {isLoading && <p style={{ color: '#555', margin: 0 }}>Carregando fiscalizadores...</p>}

          {isError && <p style={{ color: '#e74c3c', margin: 0 }}>Erro ao carregar fiscalizadores.</p>}

          {!isLoading && !isError && fiscalizadores.length === 0 && (
            <p style={{ color: '#555', margin: 0 }}>Nenhum fiscalizador cadastrado.</p>
          )}

          {!isLoading && !isError && fiscalizadores.map((fiscalizador) => (
            <label key={fiscalizador.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', color: '#333', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={fiscalizadoresSelecionados.includes(fiscalizador.id)}
                onChange={() => toggleFiscalizador(fiscalizador.id)}
              />
              {fiscalizador.nome}
              <span style={{ color: '#888', fontSize: '0.85rem' }}>({fiscalizador.email})</span>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ padding: '0.6rem 1rem', backgroundColor: '#fff', color: '#555', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={criarMutation.isPending}
            style={{
              padding: '0.6rem 1rem',
              backgroundColor: criarMutation.isPending ? '#a0c4ff' : '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 'bold',
              cursor: criarMutation.isPending ? 'not-allowed' : 'pointer'
            }}
          >
            {criarMutation.isPending ? 'Salvando...' : 'Criar visita'}
          </button>
        </div>
      </form>
    </div>
  );
}
