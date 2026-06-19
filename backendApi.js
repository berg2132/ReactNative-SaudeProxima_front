// ============================================================
// ARQUIVO: src/screens/HistoryScreen.js
// FUNÇÃO:  Exibe o histórico de todos os check-ins salvos
//          no banco de dados do backend (rota GET /checkins).
//          Mostra avaliação, feedback e permite exclusão.
//          A lista é atualizada toda vez que o usuário entra
//          nesta tela (useFocusEffect).
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { listarCheckins, removerCheckin } from '../services/backendApi';

export default function HistoryScreen() {
  const [checkins, setCheckins] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  // useFocusEffect: executa TODA VEZ que o usuário entra nesta tela.
  // É diferente do useEffect, que roda apenas uma vez ao montar.
  // Garante que a lista sempre reflete o estado atual do banco.
  useFocusEffect(
    useCallback(() => {
      buscarHistorico();
    }, [])
  );

  // ============================================================
  // Busca o histórico no backend via GET /checkins
  // ============================================================
  const buscarHistorico = async () => {
    try {
      const dados = await listarCheckins();
      setCheckins(dados);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar o histórico. Verifique sua conexão.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  };

  // Pull-to-refresh
  const aoAtualizar = () => {
    setAtualizando(true);
    buscarHistorico();
  };

  // ============================================================
  // Remove um check-in via DELETE /checkins/:id
  // ============================================================
  const confirmarRemocao = (id, nome) => {
    Alert.alert(
      '🗑️ Remover Check-in',
      `Deseja remover o check-in em "${nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await removerCheckin(id);
              // Atualiza a lista localmente sem precisar buscar tudo de novo
              setCheckins((prev) => prev.filter((item) => item._id !== id));
              Alert.alert('✅', 'Check-in removido com sucesso!');
            } catch (error) {
              Alert.alert('Erro', 'Falha ao remover o check-in.');
            }
          },
        },
      ]
    );
  };

  // ============================================================
  // Renderiza as estrelas de avaliação
  // ============================================================
  const renderEstrelas = (nota) => {
    if (!nota) return <Text style={styles.semAvaliacao}>Sem avaliação</Text>;
    const estrelas = '★'.repeat(nota) + '☆'.repeat(5 - nota);
    return <Text style={styles.estrelas}>{estrelas}</Text>;
  };

  // ============================================================
  // Renderiza cada item do histórico
  // ============================================================
  const renderItem = ({ item }) => {
    const dataFormatada = new Date(item.dataRegistro).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.card}>
        {/* Nome da unidade */}
        <Text style={styles.nomeUnidade}>{item.localNome}</Text>

        {/* Avaliação em estrelas */}
        <View style={styles.linhaAvaliacao}>
          <Text style={styles.labelCampo}>Avaliação: </Text>
          {renderEstrelas(item.avaliacao)}
        </View>

        {/* Comentário/Feedback (se existir) */}
        {item.feedback ? (
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackTexto}>💬 "{item.feedback}"</Text>
          </View>
        ) : null}

        {/* Informações da unidade */}
        {item.distrito && item.distrito !== 'Não informado' ? (
          <Text style={styles.infoItem}>🏘️ {item.distrito}</Text>
        ) : null}
        {item.telefone && item.telefone !== 'Não informado' ? (
          <Text style={styles.infoItem}>📞 {item.telefone}</Text>
        ) : null}

        {/* Localização GPS do usuário no momento do check-in */}
        <Text style={styles.gpsTexto}>
          📍 {item.latitudeUsuario?.toFixed(5)}, {item.longitudeUsuario?.toFixed(5)}
        </Text>

        {/* Data e hora do check-in */}
        <Text style={styles.dataTexto}>🕐 {dataFormatada}</Text>

        {/* Botão de remover */}
        <TouchableOpacity
          style={styles.botaoRemover}
          onPress={() => confirmarRemocao(item._id, item.localNome)}
        >
          <Text style={styles.botaoRemoverTexto}>🗑️ Remover</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================
  if (carregando) {
    return (
      <View style={styles.centrado}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.textoCarregando}>Carregando histórico...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {checkins.length === 0 ? (
        <View style={styles.centrado}>
          <Text style={styles.iconeVazio}>📋</Text>
          <Text style={styles.textoVazio}>Nenhum check-in encontrado.</Text>
          <Text style={styles.textoVazioSub}>
            Faça seu primeiro check-in em uma clínica próxima!
          </Text>
        </View>
      ) : (
        <FlatList
          data={checkins}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={atualizando} onRefresh={aoAtualizar} colors={['#1976D2']} />
          }
          ListHeaderComponent={
            <Text style={styles.contador}>{checkins.length} check-in(s) registrado(s)</Text>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
}

// ============================================================
// ESTILOS
// ============================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },

  centrado: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  textoCarregando: { marginTop: 10, color: '#555' },

  contador: {
    textAlign: 'center',
    color: '#777',
    fontSize: 13,
    marginVertical: 8,
  },

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
  nomeUnidade: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
  },
  linhaAvaliacao: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelCampo: { fontSize: 13, color: '#555' },
  estrelas: { fontSize: 18, color: '#FFC107', letterSpacing: 2 },
  semAvaliacao: { fontSize: 13, color: '#AAA', fontStyle: 'italic' },

  feedbackBox: {
    backgroundColor: '#F3F4F6',
    borderLeftWidth: 3,
    borderLeftColor: '#1976D2',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  feedbackTexto: { fontSize: 13, color: '#444', fontStyle: 'italic' },

  infoItem: { fontSize: 13, color: '#555', marginBottom: 2 },
  gpsTexto: { fontSize: 12, color: '#888', marginTop: 4 },
  dataTexto: { fontSize: 12, color: '#888', marginTop: 2, marginBottom: 8 },

  botaoRemover: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#EF9A9A',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  botaoRemoverTexto: { color: '#C62828', fontWeight: 'bold', fontSize: 13 },

  iconeVazio: { fontSize: 48, marginBottom: 12 },
  textoVazio: { fontSize: 16, color: '#888', fontWeight: 'bold', marginBottom: 6 },
  textoVazioSub: { fontSize: 14, color: '#AAA', textAlign: 'center' },
});
