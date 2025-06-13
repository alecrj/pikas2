import React, { useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfessionalCanvas } from '../../src/engines/drawing';
import { DrawingTools } from '../../src/components/Canvas/DrawingTools';
import { useDrawing } from '../../src/contexts/DrawingContext';

export default function DrawScreen() {
  const canvasRef = useRef(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  
  const handleCanvasReady = () => {
    setIsCanvasReady(true);
    console.log('✅ Canvas ready for drawing');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.canvasContainer}>
        <ProfessionalCanvas
          ref={canvasRef}
          onReady={handleCanvasReady}
          settings={{
            pressureSensitivity: 1.0,
            tiltSensitivity: 1.0,
            smoothing: 0.5,
            predictiveStroke: true,
            palmRejection: true,
          }}
        />
      </View>
      {isCanvasReady && (
        <DrawingTools />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  canvasContainer: {
    flex: 1,
  },
});