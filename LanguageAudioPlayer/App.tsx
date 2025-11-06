import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, ScrollView } from 'react-native';
import { useState } from 'react';
import { fetchManifest } from './src/services/firebase';
import { Manifest } from './src/types';

export default function App() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testFetchManifest = async () => {
    setLoading(true);
    setError(null);
    setManifest(null);

    try {
      const data = await fetchManifest();
      setManifest(data);
      console.log('📋 Full manifest data:', JSON.stringify(data, null, 2));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Phase 0: Firebase Test</Text>
      
      <Button 
        title={loading ? "Loading..." : "Fetch Manifest from Firebase"} 
        onPress={testFetchManifest}
        disabled={loading}
      />

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>❌ Error: {error}</Text>
        </View>
      )}

      {manifest && (
        <ScrollView style={styles.resultBox}>
          <Text style={styles.successText}>✅ Manifest loaded successfully!</Text>
          <Text style={styles.resultText}>
            Languages: {manifest.languages.length}
          </Text>
          {manifest.languages.map((lang) => (
            <View key={lang.id} style={styles.languageBox}>
              <Text style={styles.languageName}>📚 {lang.name}</Text>
              <Text style={styles.detailText}>
                Levels: {lang.levels.length}
              </Text>
              {lang.levels.map((level) => (
                <View key={level.id} style={styles.levelBox}>
                  <Text style={styles.levelName}>  • {level.name}</Text>
                  <Text style={styles.detailText}>
                    {'    '}Lessons: {level.lessons.length}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  errorBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    maxWidth: '100%',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  resultBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    maxWidth: '100%',
    maxHeight: 400,
  },
  successText: {
    color: '#2e7d32',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 14,
    marginBottom: 10,
    fontWeight: 'bold',
  },
  languageBox: {
    marginTop: 10,
    marginBottom: 10,
  },
  languageName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  levelBox: {
    marginLeft: 10,
    marginTop: 5,
  },
  levelName: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
