import { StatusBar } from 'expo-status-bar';
import DirectoryScreen from './src/screens/DirectoryScreen';

export default function App() {
  return (
    <>
      <DirectoryScreen />
      <StatusBar style="auto" />
    </>
  );
}
