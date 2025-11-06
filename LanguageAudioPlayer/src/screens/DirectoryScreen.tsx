import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { fetchManifest } from '../services/firebase';
import { Manifest, Language, Level, Lesson } from '../types';

type ViewMode = 'languages' | 'levels' | 'lessons';

export default function DirectoryScreen() {
  // Data state
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Navigation state
  const [viewMode, setViewMode] = useState<ViewMode>('languages');
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<Level | null>(null);

  // Fetch manifest on component mount
  useEffect(() => {
    loadManifest();
  }, []);

  const loadManifest = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchManifest();
      setManifest(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load lessons';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Navigation handlers
  const handleLanguagePress = (language: Language) => {
    setSelectedLanguage(language);
    setViewMode('levels');
  };

  const handleLevelPress = (level: Level) => {
    setSelectedLevel(level);
    setViewMode('lessons');
  };

  const handleLessonPress = (lesson: Lesson) => {
    // TODO: Navigate to player in Phase 3
    console.log('Lesson selected:', lesson.title);
    alert(`Lesson selected: ${lesson.title}\n\nPlayer will be implemented in Phase 2!`);
  };

  const handleBackPress = () => {
    if (viewMode === 'lessons') {
      setViewMode('levels');
      setSelectedLevel(null);
    } else if (viewMode === 'levels') {
      setViewMode('languages');
      setSelectedLanguage(null);
    }
  };

  // Get title based on current view
  const getTitle = (): string => {
    if (viewMode === 'languages') return 'Audio Lessons';
    if (viewMode === 'levels' && selectedLanguage) return selectedLanguage.name;
    if (viewMode === 'lessons' && selectedLevel) return selectedLevel.name;
    return 'Audio Lessons';
  };

  // Get data to display based on current view
  const getDisplayData = (): Array<Language | Level | Lesson> => {
    if (viewMode === 'languages' && manifest) {
      return manifest.languages;
    }
    if (viewMode === 'levels' && selectedLanguage) {
      return selectedLanguage.levels;
    }
    if (viewMode === 'lessons' && selectedLevel) {
      return selectedLevel.lessons;
    }
    return [];
  };

  // Handle item press based on current view
  const handleItemPress = (item: Language | Level | Lesson) => {
    if (viewMode === 'languages') {
      handleLanguagePress(item as Language);
    } else if (viewMode === 'levels') {
      handleLevelPress(item as Level);
    } else if (viewMode === 'lessons') {
      handleLessonPress(item as Lesson);
    }
  };

  // Get item display name
  const getItemName = (item: Language | Level | Lesson): string => {
    if ('name' in item) {
      return item.name;
    }
    if ('title' in item) {
      return item.title;
    }
    return 'Unknown';
  };

  // Render a single list item
  const renderItem = ({ item }: { item: Language | Level | Lesson }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => handleItemPress(item)}
      activeOpacity={0.7}
    >
      <Text style={styles.listItemText}>{getItemName(item)}</Text>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading lessons...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>❌ {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadManifest}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main directory view
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {viewMode !== 'languages' && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>‹ Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.title}>{getTitle()}</Text>
      </View>

      {/* List */}
      <FlatList
        data={getDisplayData()}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* Footer info (for testing) */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          View: {viewMode} | Items: {getDisplayData().length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 50,
    paddingVertical: 8,
    paddingRight: 16,
  },
  backButtonText: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#000',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  listItem: {
    backgroundColor: '#fff',
    padding: 18,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  listItemText: {
    fontSize: 17,
    color: '#000',
    flex: 1,
  },
  chevron: {
    fontSize: 28,
    color: '#c0c0c0',
    fontWeight: '300',
  },
  separator: {
    height: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    backgroundColor: '#fff',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

