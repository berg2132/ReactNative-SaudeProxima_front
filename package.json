// ============================================================
// ARQUIVO: App.js
// FUNÇÃO:  Ponto de entrada do aplicativo React Native.
//          Configura o sistema de navegação entre telas usando
//          o react-navigation (Stack Navigator).
//
//  FLUXO DE NAVEGAÇÃO:
//    Login → (Cadastro) → Home → History
// ============================================================

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Importação das telas do aplicativo
import LoginScreen from './src/screens/LoginScreen';
import CadastroScreen from './src/screens/CadastroScreen';
import HomeScreen from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';

// Cria o navegador de pilha (Stack Navigator)
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    // NavigationContainer é o contêiner raiz — envolve todo o app
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          // Estilo padrão para todos os cabeçalhos do app
          headerStyle: { backgroundColor: '#1976D2' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {/* Tela de Login — sem cabeçalho para tela cheia */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />

        {/* Tela de Cadastro — sem cabeçalho */}
        <Stack.Screen
          name="Cadastro"
          component={CadastroScreen}
          options={{ headerShown: false }}
        />

        {/* Tela Principal: lista de unidades de saúde próximas */}
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: '🏥 Unidades de Saúde - Recife' }}
        />

        {/* Tela de Histórico: check-ins salvos no banco de dados */}
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ title: '📋 Meu Histórico de Check-ins' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
