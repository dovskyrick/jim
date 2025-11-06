import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DirectoryScreen from './src/screens/DirectoryScreen';
import PlayerScreen from './src/screens/PlayerScreen';
import { Lesson } from './src/types';

// Define navigation types
export type RootStackParamList = {
  Directory: undefined;
  Player: {
    lesson: Lesson;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Directory"
        screenOptions={{
          headerShown: false, // We're using custom headers
        }}
      >
        <Stack.Screen name="Directory" component={DirectoryScreen} />
        <Stack.Screen name="Player" component={PlayerScreen} />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
