# 📱 Saúde Próxima — Mobile

Aplicativo **React Native + Expo** para localizar Unidades de Saúde do Recife próximas ao usuário, realizar check-ins, avaliar atendimentos e consultar o histórico de visitas.

---

## 📋 Índice

- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Pré-requisitos](#pré-requisitos)
- [Instalação](#instalação)
- [Configuração da URL do Backend](#configuração-da-url-do-backend)
- [Executando o App](#executando-o-app)
- [Telas](#telas)
- [Serviços e APIs](#serviços-e-apis)
- [Estrutura de Pastas](#estrutura-de-pastas)

---

## ✨ Funcionalidades

- 📍 **Localização em tempo real** via GPS para encontrar unidades de saúde próximas
- 🏥 **Lista de unidades** consumida da API pública do Portal de Dados Abertos do Recife
- ✅ **Check-in** em unidades de saúde com salvamento no backend próprio
- ⭐ **Avaliação** de 1 a 5 estrelas por visita
- 💬 **Feedback textual** sobre o atendimento
- 📋 **Histórico de check-ins** salvo no banco de dados
- 🗑 **Remoção** de check-ins do histórico
- 🔐 **Cadastro e login** de usuários
- 🛠 **Serviços por unidade** exibidos a partir de um segundo dataset do Recife

---

## 🛠 Tecnologias

| Tecnologia | Versão | Uso |
|---|---|---|
| React Native | 0.81.5 | Framework mobile |
| Expo | ^54.0.35 | Toolchain e build |
| React Navigation | ^6.1.7 | Navegação entre telas |
| Axios | ^1.5.0 | Chamadas HTTP |
| expo-location | ~19.0.8 | Permissão e leitura de GPS |

---

## ✅ Pré-requisitos

- [Node.js](https://nodejs.org/) v18 ou superior
- [Expo CLI](https://docs.expo.dev/get-started/installation/) instalado globalmente:
  ```bash
  npm install -g expo-cli
  ```
- App **Expo Go** instalado no celular ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)) **ou** um emulador Android/iOS configurado
- Backend do projeto rodando (local ou em nuvem)

---

## 🚀 Instalação

```bash
# 1. Entre na pasta mobile
cd mobile

# 2. Instale as dependências
npm install
```

---

## 🔧 Configuração da URL do Backend

Abra o arquivo `src/services/backendApi.js` e ajuste a constante `API_URL`:

```js
// Desenvolvimento local — use o IP da sua máquina na rede Wi-Fi:
export const API_URL = 'http://192.168.1.100:3333';

// Produção (Render, Railway, etc.):
export const API_URL = 'https://dados-recife-backend.onrender.com';
```

> ⚠️ **Importante:** `localhost` não funciona em dispositivos físicos. Use o IP real da sua máquina na rede Wi-Fi.

---

## ▶️ Executando o App

```bash
# Inicia o servidor de desenvolvimento Expo
npm start
```

Com o servidor rodando:
- **Celular físico:** escaneie o QR Code com o app Expo Go.
- **Emulador Android:** pressione `a` no terminal.
- **Simulador iOS:** pressione `i` no terminal (requer macOS).
- **Navegador:** pressione `w` no terminal (modo web).

---

## 📱 Telas

### 1. Login
Tela inicial onde o usuário insere e-mail e senha para acessar o app. Redireciona para a tela de Cadastro caso seja o primeiro acesso.

### 2. Cadastro
Formulário para criar uma nova conta com nome, e-mail e senha.

### 3. Home — Unidades de Saúde
Tela principal do app. Ao abrir:
1. Solicita permissão de localização GPS.
2. Busca as unidades de saúde da API do Recife.
3. Exibe apenas as unidades dentro de um raio de 10 km, ordenadas da mais próxima.
4. Cada card mostra: nome, distrito, área/equipe, telefone, distância e serviços disponíveis.
5. Botão **"Check-in aqui"** abre um modal para avaliar (1–5 estrelas) e deixar um comentário.

### 4. Histórico de Check-ins
Lista todos os check-ins registrados no backend, do mais recente ao mais antigo. Permite remover registros individualmente.

---

## 🌐 Serviços e APIs

### `src/services/backendApi.js` — API própria

Centraliza todas as chamadas ao backend Node.js do projeto.

| Função | Método | Rota | Descrição |
|---|---|---|---|
| `listarCheckins` | GET | `/checkins` | Busca o histórico completo |
| `salvarCheckin` | POST | `/checkins` | Registra um novo check-in |
| `removerCheckin` | DELETE | `/checkins/:id` | Remove um check-in |
| `cadastrarUsuario` | POST | `/usuarios` | Cria uma conta |
| `loginUsuario` | POST | `/usuarios/login` | Autentica o usuário |

---

### `src/services/dadosRecifeApi.js` — API Pública do Recife

Consome o [Portal de Dados Abertos da Prefeitura do Recife](https://dados.recife.pe.gov.br/) via API CKAN.

| Função | Descrição |
|---|---|
| `buscarTodasUnidades` | Busca os registros do dataset de Unidades de Saúde |
| `buscarServicosPorUnidade` | Busca o dataset de Rede de Atenção à Saúde (serviços) |
| `agruparUnidadesDuplicadas` | Consolida os registros duplicados (1 por equipe → 1 por unidade) |
| `filtrarPorProximidade` | Filtra e ordena por distância usando a fórmula de Haversine |
| `calcularDistancia` | Calcula a distância em km entre dois pontos geográficos |

**Datasets utilizados:**

| Dataset | Resource ID |
|---|---|
| Unidades de Saúde do Recife | `c727e8f8-40e9-415e-b14d-2c46406abb60` |
| Rede de Atenção à Saúde no Recife | `d05f6ffa-304b-4a28-bd03-1ffb26cbf866` |

> O dataset de unidades retorna **uma linha por equipe** da mesma unidade física. A função `agruparUnidadesDuplicadas` resolve isso agrupando por nome + distrito.

---

## 📁 Estrutura de Pastas

```
mobile/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.js       # Tela de login
│   │   ├── CadastroScreen.js    # Tela de cadastro de usuário
│   │   ├── HomeScreen.js        # Lista de unidades de saúde + check-in
│   │   └── HistoryScreen.js     # Histórico de check-ins
│   └── services/
│       ├── backendApi.js        # Chamadas ao backend próprio
│       └── dadosRecifeApi.js    # Chamadas à API pública do Recife
├── App.js                       # Ponto de entrada: configura a navegação
└── package.json
```

---

## 🗺 Fluxo de Navegação

```
Login
  └──► Home (lista de unidades)
         └──► [Modal de Check-in]
         └──► Histórico de Check-ins
  └──► Cadastro
         └──► Login
```

---

## 🔑 Permissões Necessárias

| Permissão | Motivo |
|---|---|
| **Localização (GPS)** | Necessária para filtrar as unidades de saúde mais próximas e registrar a posição no check-in |

A permissão é solicitada ao usuário na primeira abertura da tela Home via `expo-location`.
