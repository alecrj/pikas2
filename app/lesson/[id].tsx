// app/lesson/[id].tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useLearning } from '../../src/contexts/LearningContext';
import { skillTreeManager } from '../../src/engines/learning/SkillTreeManager';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function LessonScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const theme = useTheme();
  const { startLesson, currentLesson } = useLearning();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLesson();
  }, [id]);

  const loadLesson = async () => {
    try {
      const lesson = skillTreeManager.getLesson(id as string);
      if (lesson) {
        await startLesson(lesson);
      }
    } catch (error) {
      console.error('Failed to load lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>
        {currentLesson?.title}
      </Text>
      {/* Add lesson content components here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});