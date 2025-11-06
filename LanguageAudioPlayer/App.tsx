import { StatusBar } from 'expo-status-bar';
import PlayerScreen from './src/screens/PlayerScreen';
import { Lesson } from './src/types';

// PHASE 2 TESTING: Hardcoded lesson for testing
const testLesson: Lesson = {
  id: 'lesson1',
  title: 'Test Lesson - Phase 2',
  storagePath: 'audio-lessons/test.wav',
};

export default function App() {
  return (
    <>
      <PlayerScreen lesson={testLesson} />
      <StatusBar style="auto" />
    </>
  );
}
