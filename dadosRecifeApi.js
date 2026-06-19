// ============================================================
// ARQUIVO: src/screens/HomeScreen.js
// FUNÇÃO:  Tela principal do app. Responsável por:
//   1. Solicitar permissão e obter a localização do usuário (GPS)
//   2. Buscar todas as unidades de saúde na API do Dados Recife
//   3. Filtrar e ordenar as unidades mais próximas ao usuário
//   4. Exibir a lista com distância, horário e especialidades
//   5. Abrir modal para fazer check-in com avaliação e feedback
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';

// Serviços separados para manter o componente limpo (princípio SRP)
import {
  buscarTodasUnidades,
  buscarServicosPorUnidade,
  agruparUnidadesDuplicadas,
  filtrarPorProximidade,
} from '../services/dadosRecifeApi';
import { salvarCheckin } from '../services/backendApi';

// Raio de busca padrão: 10 km ao redor do usuário
const RAIO_BUSCA_KM = 10;

export default function HomeScreen({ navigation }) {
  // ---- Estados do componente ----
  const [unidades, setUnidades] = useState([]);           // lista filtrada por proximidade
  const [localizacao, setLocalizacao] = useState(null);   // lat/lon do usuário
  const [carregando, setCarregando] = useState(true);     // controla o spinner inicial
  const [atualizando, setAtualizando] = useState(false);  // controla o pull-to-refresh
  const [erroLocalizacao, setErroLocalizacao] = useState(false);

  // ---- Estados do Modal de Check-in ----
  const [modalVisivel, setModalVisivel] = useState(false);
  const [unidadeSelecionada, setUnidadeSelecionada] = useState(null);
  const [avaliacao, setAvaliacao] = useState(0);          // estrelas: 0 a 5
  const [feedback, setFeedback] = useState('');
  const [enviandoCheckin, setEnviandoCheckin] = useState(false);

  // Executa ao montar a tela: pede localização e já carrega os dados
  useEffect(() => {
    iniciarApp();
  }, []);

  // ============================================================
  // Função principal: obtém localização e carrega dados da API
  // ============================================================
  const iniciarApp = async () => {
    setCarregando(true);
    try {
      // --- PASSO 1: Solicitar permissão de localização ao usuário ---
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        // Se o usuário negou, avisa e carrega os dados sem filtro de distância
        setErroLocalizacao(true);
        Alert.alert(
          'Localização negada',
          'Sem sua localização, não conseguimos ordenar as clínicas por distância. Mostrando todas.',
          [{ text: 'Ok' }]
        );
        await carregarSemLocalizacao();
        return;
      }

      // --- PASSO 2: Obter as coordenadas GPS atuais ---
      const posicao = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced, // balanceia precisão e velocidade
      });

      const coords = {
        latitude: posicao.coords.latitude,
        longitude: posicao.coords.longitude,
      };
      setLocalizacao(coords);

      // --- PASSO 3: Buscar unidades na API do Dados Recife ---
      await carregarUnidades(coords);

    } catch (error) {
      console.error('Erro ao iniciar app:', error.message);
      Alert.alert('Erro', error.message || 'Falha ao carregar dados.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  };

  // ============================================================
  // Carrega e filtra unidades por proximidade do usuário
  // ============================================================
  const carregarUnidades = async (coords) => {
    // Busca as unidades "cruas" (uma linha por equipe) e os serviços em paralelo
    const [todasUnidadesCruas, mapaServicos] = await Promise.all([
      buscarTodasUnidades(),
      buscarServicosPorUnidade(),
    ]);

    // Agrupa as unidades duplicadas (mesma US, equipes diferentes)
    // e já anexa a lista de serviços oferecidos por cada uma.
    const todasUnidades = agruparUnidadesDuplicadas(todasUnidadesCruas, mapaServicos);

    // Filtra apenas as que têm coordenadas e estão dentro do raio
    const proximas = filtrarPorProximidade(
      todasUnidades,
      coords.latitude,
      coords.longitude,
      RAIO_BUSCA_KM
    );

    if (proximas.length === 0) {
      // Nenhuma no raio — mostra todas ordenadas pelo nome
      Alert.alert(
        'Nenhuma unidade próxima',
        `Não encontramos unidades num raio de ${RAIO_BUSCA_KM} km. Mostrando todas.`
      );
      setUnidades(todasUnidades.slice(0, 50)); // limita para não sobrecarregar
    } else {
      setUnidades(proximas);
    }
  };

  // Fallback: carrega sem filtro de distância (permissão negada)
  const carregarSemLocalizacao = async () => {
    const [todasUnidadesCruas, mapaServicos] = await Promise.all([
      buscarTodasUnidades(),
      buscarServicosPorUnidade(),
    ]);
    const todasUnidades = agruparUnidadesDuplicadas(todasUnidadesCruas, mapaServicos);
    setUnidades(todasUnidades.slice(0, 50));
  };

  // Pull-to-refresh: recarrega tudo ao puxar a lista para baixo
  const aoAtualizar = useCallback(() => {
    setAtualizando(true);
    iniciarApp();
  }, []);

  // ============================================================
  // Abre o modal de check-in para a unidade escolhida
  // ============================================================
  const abrirModalCheckin = (unidade) => {
    setUnidadeSelecionada(unidade);
    setAvaliacao(0);
    setFeedback('');
    setModalVisivel(true);
  };

  // ============================================================
  // Envia o check-in com avaliação para o backend
  // ============================================================
  const confirmarCheckin = async () => {
    if (!localizacao) {
      Alert.alert('Aviso', 'Sua localização ainda não foi obtida.');
      return;
    }
    if (avaliacao === 0) {
      Alert.alert('Aviso', 'Por favor, selecione pelo menos 1 estrela de avaliação.');
      return;
    }

    setEnviandoCheckin(true);
    try {
      // Monta o payload completo para o backend
      await salvarCheckin({
        localNome: unidadeSelecionada.unidade || 'Unidade sem nome',
        latitudeUsuario: localizacao.latitude,
        longitudeUsuario: localizacao.longitude,
        distrito: unidadeSelecionada.distrito || '',
        area: unidadeSelecionada.area || '',
        telefone: unidadeSelecionada.telefone || '',
        avaliacao,      // nota de 1 a 5
        feedback,       // comentário do usuário
      });

      setModalVisivel(false);
      Alert.alert(
        '✅ Check-in realizado!',
        `Você fez check-in em ${unidadeSelecionada.unidade}. Obrigado pela avaliação!`,
        [{ text: 'Ver Histórico', onPress: () => navigation.navigate('History') }, { text: 'Ok' }]
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o check-in. Tente novamente.');
    } finally {
      setEnviandoCheckin(false);
    }
  };

  // ============================================================
  // Componente de estrelas para avaliação (1 a 5)
  // ============================================================
  const Estrelas = () => (
    <View style={styles.estrelasContainer}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => setAvaliacao(n)}>
          <Text style={[styles.estrela, n <= avaliacao && styles.estrelaSelecionada]}>
            ★
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // ============================================================
  // Renderiza cada card de unidade de saúde na lista
  // ============================================================
  const renderItem = ({ item }) => {
    // Distância formatada: mostra metros se < 1 km
    const distTexto =
      item.distanciaKm != null
        ? item.distanciaKm < 1
          ? `${Math.round(item.distanciaKm * 1000)} m`
          : `${item.distanciaKm.toFixed(1)} km`
        : null;

    return (
      <View style={styles.card}>
        {/* Tag de distância — verde se < 2 km, amarela se mais longe */}
        {distTexto && (
          <View style={[styles.tagDistancia, item.distanciaKm < 2 && styles.tagPerto]}>
            <Text style={styles.tagTexto}>📍 {distTexto}</Text>
          </View>
        )}

        {/* Nome da unidade */}
        <Text style={styles.tituloCard}>{item.unidade || 'Unidade de Saúde'}</Text>

        {/* Informações de localização e contato */}
        <Text style={styles.infoCard}>🏘️  Distrito: {item.distrito || 'Não informado'}</Text>
        <Text style={styles.infoCard}>📌 Área: {item.area || 'Não informada'}</Text>
        <Text style={styles.infoCard}>📞 Tel: {item.telefone || 'Não informado'}</Text>

        {/* Ponto de apoio / especialidades disponíveis */}
        {item.ponto_de_apoio ? (
          <Text style={styles.infoCard}>🩺 Ponto de Apoio: {item.ponto_de_apoio}</Text>
        ) : null}

        {/* Serviços oferecidos pela unidade (ex: Odontologia, Raio-X) */}
        {item.servicos && item.servicos.length > 0 ? (
          <View style={styles.servicosContainer}>
            {item.servicos.map((servico, indice) => (
              <View key={`${servico}-${indice}`} style={styles.tagServico}>
                <Text style={styles.tagServicoTexto}>{servico}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* Horário de funcionamento (campo 'horario' na API do Recife) */}
        {item.horario ? (
          <View style={styles.horarioBox}>
            <Text style={styles.horarioTexto}>🕐 Horário: {item.horario}</Text>
          </View>
        ) : null}

        {/* Botão de check-in */}
        <TouchableOpacity
          style={styles.botaoCheckin}
          onPress={() => abrirModalCheckin(item)}
          activeOpacity={0.8}
        >
          <Text style={styles.botaoTexto}>📋 Fazer Check-in & Avaliar</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  return (
    <View style={styles.container}>

      {/* Cabeçalho com localização e botão de histórico */}
      <View style={styles.header}>
        {localizacao ? (
          <Text style={styles.textoLocalizacao}>
            📍 Lat {localizacao.latitude.toFixed(4)}, Lng {localizacao.longitude.toFixed(4)}
            {'\n'}Mostrando unidades em até {RAIO_BUSCA_KM} km
          </Text>
        ) : erroLocalizacao ? (
          <Text style={styles.textoLocalizacao}>⚠️ Localização não disponível</Text>
        ) : (
          <Text style={styles.textoLocalizacao}>🔍 Obtendo sua localização...</Text>
        )}

        <TouchableOpacity
          style={styles.botaoHistorico}
          onPress={() => navigation.navigate('History')}
        >
          <Text style={styles.botaoTexto}>📋 Meu Histórico</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de unidades ou spinner de carregamento */}
      {carregando ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.textoCarregando}>Buscando unidades de saúde próximas...</Text>
        </View>
      ) : unidades.length === 0 ? (
        <View style={styles.centrado}>
          <Text style={styles.textoVazio}>Nenhuma unidade encontrada.</Text>
          <TouchableOpacity style={styles.botaoRecarregar} onPress={aoAtualizar}>
            <Text style={styles.botaoTexto}>🔄 Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={unidades}
          keyExtractor={(item, index) =>
            `${item._id || item.unidade || 'unidade'}-${item.distrito || ''}-${index}`
          }
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} colors={['#1976D2']} />
          }
          ListHeaderComponent={
            <Text style={styles.contador}>
              {unidades.length} unidade(s) encontrada(s)
            </Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* ======================================================
          MODAL DE CHECK-IN E AVALIAÇÃO
          Abre ao clicar em "Fazer Check-in" em um card
      ====================================================== */}
      <Modal
        visible={modalVisivel}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisivel(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView showsVerticalScrollIndicator={false}>

              <Text style={styles.modalTitulo}>📋 Check-in</Text>
              <Text style={styles.modalUnidade}>{unidadeSelecionada?.unidade}</Text>
              <Text style={styles.modalSubtitulo}>{unidadeSelecionada?.distrito}</Text>

              {/* Avaliação por estrelas */}
              <Text style={styles.modalLabel}>Como você avalia este local?</Text>
              <Estrelas />
              <Text style={styles.avaliacaoTexto}>
                {avaliacao > 0 ? `${avaliacao} estrela${avaliacao > 1 ? 's' : ''}` : 'Toque para avaliar'}
              </Text>

              {/* Campo de feedback textual */}
              <Text style={styles.modalLabel}>Deixe um comentário (opcional):</Text>
              <TextInput
                style={styles.inputFeedback}
                placeholder="Ex: Atendimento rápido, equipe atenciosa..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                maxLength={500}
                value={feedback}
                onChangeText={setFeedback}
              />
              <Text style={styles.contadorCaracteres}>{feedback.length}/500</Text>

              {/* Botões do modal */}
              <TouchableOpacity
                style={[styles.botaoConfirmar, enviandoCheckin && styles.botaoDesabilitado]}
                onPress={confirmarCheckin}
                disabled={enviandoCheckin}
              >
                {enviandoCheckin ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.botaoTexto}>✅ Confirmar Check-in</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.botaoCancelar}
                onPress={() => setModalVisivel(false)}
              >
                <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================
// ESTILOS
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },

  // Cabeçalho
  header: {
    backgroundColor: '#1976D2',
    padding: 15,
    paddingTop: 10,
  },
  textoLocalizacao: {
    color: '#E3F2FD',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  botaoHistorico: {
    backgroundColor: '#0D47A1',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  botaoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // Cards das unidades
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 12,
    marginBottom: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  tagDistancia: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF9C4',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  tagPerto: { backgroundColor: '#C8E6C9' },
  tagTexto: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  tituloCard: { fontSize: 16, fontWeight: 'bold', color: '#1A237E', marginBottom: 6 },
  infoCard: { fontSize: 13, color: '#555', marginBottom: 2 },
  servicosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  tagServico: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  tagServicoTexto: { fontSize: 12, color: '#2E7D32', fontWeight: '600' },
  horarioBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    padding: 6,
    marginTop: 6,
  },
  horarioTexto: { fontSize: 13, color: '#1565C0', fontWeight: '500' },
  botaoCheckin: {
    backgroundColor: '#1976D2',
    padding: 11,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },

  // Estados de carregamento e vazio
  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  textoCarregando: { marginTop: 12, color: '#555', fontSize: 14, textAlign: 'center' },
  textoVazio: { color: '#888', fontSize: 16, marginBottom: 15 },
  botaoRecarregar: {
    backgroundColor: '#1976D2',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  contador: {
    textAlign: 'center',
    color: '#777',
    fontSize: 13,
    marginVertical: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '85%',
  },
  modalTitulo: { fontSize: 20, fontWeight: 'bold', color: '#1A237E', textAlign: 'center' },
  modalUnidade: { fontSize: 16, fontWeight: '600', color: '#333', textAlign: 'center', marginTop: 8 },
  modalSubtitulo: { fontSize: 13, color: '#777', textAlign: 'center', marginBottom: 16 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 8, marginTop: 12 },
  estrelasContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 4 },
  estrela: { fontSize: 36, color: '#DDD', marginHorizontal: 4 },
  estrelaSelecionada: { color: '#FFC107' },
  avaliacaoTexto: { textAlign: 'center', color: '#888', fontSize: 13, marginBottom: 8 },
  inputFeedback: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 90,
  },
  contadorCaracteres: { textAlign: 'right', color: '#AAA', fontSize: 11, marginTop: 4 },
  botaoConfirmar: {
    backgroundColor: '#2E7D32',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 18,
  },
  botaoDesabilitado: { backgroundColor: '#AAA' },
  botaoCancelar: { padding: 12, alignItems: 'center', marginTop: 8 },
  botaoCancelarTexto: { color: '#E53935', fontWeight: 'bold', fontSize: 14 },
});
