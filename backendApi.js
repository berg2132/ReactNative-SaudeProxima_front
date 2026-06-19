// ============================================================
// ARQUIVO: src/services/backendApi.js
// FUNÇÃO:  Centraliza todas as chamadas para o nosso próprio
//          backend Node.js (rodando no Render ou localmente).
//          Mantém a URL base em um único lugar — para trocar
//          o endereço, basta alterar a constante API_URL.
// ============================================================

import axios from 'axios';

// ⚠️  IMPORTANTE: troque esta URL pelo endereço do seu backend.
//    Em desenvolvimento local, use o IP do seu PC na rede Wi-Fi:
//      ex: 'http://192.168.1.100:3333'
//    Em produção (Render, Railway, etc.), use a URL pública:
//      ex: 'https://saude-recife-backend.onrender.com'
export const API_URL = 'https://saude-recife-backend.onrender.com';

// ============================================================
// Função: listarCheckins
// Faz GET /checkins → retorna histórico completo do banco.
// ============================================================
export const listarCheckins = async () => {
  try {
    const resposta = await axios.get(`${API_URL}/checkins`, { timeout: 10000 });
    return resposta.data; // array de check-ins
  } catch (error) {
    console.error('Erro ao listar check-ins:', error.message);
    throw new Error('Não foi possível carregar o histórico.');
  }
};

// ============================================================
// Função: salvarCheckin
// Faz POST /checkins → salva um novo check-in com feedback.
//
// Parâmetros (objeto):
//   localNome        — nome da unidade de saúde
//   latitudeUsuario  — latitude GPS do usuário
//   longitudeUsuario — longitude GPS do usuário
//   distrito         — distrito sanitário (opcional)
//   area             — área de abrangência (opcional)
//   telefone         — telefone da unidade (opcional)
//   avaliacao        — nota de 1 a 5 (opcional)
//   feedback         — comentário textual (opcional)
// ============================================================
export const salvarCheckin = async (dados) => {
  try {
    const resposta = await axios.post(`${API_URL}/checkins`, dados, { timeout: 10000 });
    return resposta.data; // documento criado
  } catch (error) {
    console.error('Erro ao salvar check-in:', error.message);
    // Repassa o erro original para o componente tratar (ex: status 400)
    throw error;
  }
};

// ============================================================
// Função: removerCheckin
// Faz DELETE /checkins/:id → remove um check-in pelo ID.
// ============================================================
export const removerCheckin = async (id) => {
  try {
    const resposta = await axios.delete(`${API_URL}/checkins/${id}`, { timeout: 10000 });
    return resposta.data;
  } catch (error) {
    console.error('Erro ao remover check-in:', error.message);
    throw new Error('Não foi possível remover o check-in.');
  }
};

// ============================================================
// Funções de Usuário
// ============================================================

export const cadastrarUsuario = async ({ nome, email, senha }) => {
  const resposta = await axios.post(`${API_URL}/usuarios`, { nome, email, senha }, { timeout: 10000 });
  return resposta.data;
};

export const loginUsuario = async ({ email, senha }) => {
  const resposta = await axios.post(`${API_URL}/usuarios/login`, { email, senha }, { timeout: 10000 });
  return resposta.data;
};
