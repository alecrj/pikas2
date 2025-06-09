import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Pressable, 
  Text, 
  ScrollView,
  Modal,
  Alert,
  Platform,
  Dimensions
} from 'react-native';
import { Canvas, useCanvasRef } from '@shopify/react-native-skia';
import { GestureHandlerRootView, PanGestureHandler, PinchGestureHandler } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useDrawing } from '../../src/contexts/DrawingContext';
import { useUserProgress } from '../../src/contexts/UserProgressContext';
import { ProfessionalCanvas } from '../../src/engines/drawing/ProfessionalCanvas';
import { Brush, Layer, Color } from '../../src/types';
import { 
  Brush as BrushIcon,
  Layers,
  Palette,
  Undo,
  Redo,
  Download,
  Share2,
  Settings,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function DrawScreen() {
  const theme = useTheme();
  const { state: drawingState, dispatch: drawingDispatch } = useDrawing();
  const { addXP, addAchievement } = useUserProgress();
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const professionalCanvas = useRef<ProfessionalCanvas | null>(null);
  
  const [showBrushPicker, setShowBrushPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  
  const styles = createStyles(theme);

  useEffect(() => {
    if (canvasRef.current && !professionalCanvas.current) {
      professionalCanvas.current = new ProfessionalCanvas();
      professionalCanvas.current.initialize(canvasRef.current);
    }
    return () => {
      professionalCanvas.current?.destroy();
    };
  }, []);
  

  const handleTouchStart = (event: any) => {
    const { locationX, locationY, pressure = 1, tiltX = 0, tiltY = 0 } = event.nativeEvent;
    if (professionalCanvas.current) {
      // FIXED: startStroke only gets the event object (no brush/color as extra arguments)
      professionalCanvas.current.startStroke({
        x: locationX,
        y: locationY,
        pressure,
        tiltX,
        tiltY,
        timestamp: Date.now(),
      });
      setIsDrawing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleTouchMove = (event: any) => {
    if (!isDrawing) return;
    const { locationX, locationY, pressure = 1, tiltX = 0, tiltY = 0 } = event.nativeEvent;
    if (professionalCanvas.current) {
      professionalCanvas.current.addPoint({
        x: locationX,
        y: locationY,
        pressure,
        tiltX,
        tiltY,
        timestamp: Date.now(),
      });
    }
  };

  const handleTouchEnd = () => {
    if (professionalCanvas.current && isDrawing) {
      professionalCanvas.current.endStroke();
      setIsDrawing(false);
      addXP(1);
      checkDrawingAchievements();
    }
  };

  const checkDrawingAchievements = () => {
    const state = professionalCanvas.current?.getState();
    if (!state) return;
    const totalStrokes = state.layers.reduce((sum: number, layer: any) => sum + (layer.strokes?.length || 0), 0);
    if (totalStrokes === 1) {
      addAchievement('first_stroke');
    }
    if (totalStrokes === 100) {
      addAchievement('hundred_strokes');
    }
  };

  const handleUndo = () => {
    professionalCanvas.current?.undo();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRedo = () => {
    professionalCanvas.current?.redo();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleClear = () => {
    Alert.alert(
      'Clear Canvas',
      'Are you sure you want to clear the canvas? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: () => {
            professionalCanvas.current?.clear();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      // FIXED: exportImage() expects 0 arguments
      const blob = await professionalCanvas.current?.exportImage();
      if (!blob) return;
      // Only run FileReader if it's a Blob
      if (blob instanceof Blob) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64 = reader.result as string;
          const { status } = await MediaLibrary.requestPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please grant permission to save images.');
            return;
          }
          const asset = await MediaLibrary.createAssetAsync(base64);
          await MediaLibrary.createAlbumAsync('Pikaso', asset, false);
          Alert.alert('Success', 'Artwork saved to gallery!');
          addAchievement('first_export');
        };
      } else {
        Alert.alert('Export error', 'Unknown image export type');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export artwork');
    }
  };

  const handleShare = async () => {
    try {
      // FIXED: exportImage() expects 0 arguments
      const blob = await professionalCanvas.current?.exportImage();
      if (!blob) return;
      if (blob instanceof Blob) {
        // FIXED: Pass Blob, not string, to createObjectURL
        const url = URL.createObjectURL(blob);
        await Sharing.shareAsync(url, {
          mimeType: 'image/png',
          dialogTitle: 'Share your artwork',
        });
        addAchievement('first_share');
      } else {
        Alert.alert('Share error', 'Unknown image export type');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share artwork');
    }
  };

  const renderBrushPicker = () => (
    <Modal
      visible={showBrushPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowBrushPicker(false)}
    >
      <Pressable 
        style={styles.modalOverlay} 
        onPress={() => setShowBrushPicker(false)}
      >
        <View style={styles.brushPickerContainer}>
          <Text style={styles.pickerTitle}>Choose Brush</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(drawingState.availableBrushes || []).map((brush: Brush) => (
              <Pressable
                key={brush.id}
                style={[
                  styles.brushOption,
                  drawingState.currentBrush.id === brush.id && styles.selectedBrush
                ]}
                onPress={() => {
                  drawingDispatch({ type: 'SET_BRUSH', brush });
                  setShowBrushPicker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.brushIcon}>{brush.icon}</Text>
                <Text style={styles.brushName}>{brush.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.brushSettings}>
            <Text style={styles.settingLabel}>
              Size: {drawingState.currentBrush.settings.size}px
            </Text>
            <Text style={styles.settingLabel}>
              Opacity: {Math.round(drawingState.currentBrush.settings.opacity * 100)}%
            </Text>
          </View>
        </View>
      </Pressable>
    </Modal>
  );

  const renderColorPicker = () => (
    <Modal
      visible={showColorPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowColorPicker(false)}
    >
      <Pressable 
        style={styles.modalOverlay} 
        onPress={() => setShowColorPicker(false)}
      >
        <View style={styles.colorPickerContainer}>
          <Text style={styles.pickerTitle}>Choose Color</Text>
          <View style={styles.colorGrid}>
            {(drawingState.colorPalette || []).map((color: string) => (
              <Pressable
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  drawingState.currentColor.hex === color && styles.selectedColor
                ]}
                onPress={() => {
                  drawingDispatch({ type: 'SET_COLOR', color });
                  setShowColorPicker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            ))}
          </View>
          <View style={styles.recentColors}>
            <Text style={styles.recentLabel}>Recent:</Text>
            <ScrollView horizontal>
              {(drawingState.recentColors || []).map((color: string, index: number) => (
                <Pressable
                  key={`recent-${index}`}
                  style={[styles.recentColor, { backgroundColor: color }]}
                  onPress={() => {
                    drawingDispatch({ type: 'SET_COLOR', color });
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </Pressable>
    </Modal>
  );

  const renderLayerPanel = () => {
    const state = professionalCanvas.current?.getState();
    if (!state) return null;

    return (
      <Modal
        visible={showLayerPanel}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLayerPanel(false)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setShowLayerPanel(false)}
        >
          <View style={styles.layerPanelContainer}>
            <View style={styles.layerHeader}>
              <Text style={styles.pickerTitle}>Layers</Text>
              <Pressable
                style={styles.addLayerButton}
                onPress={() => {
                  professionalCanvas.current?.addLayer();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Plus size={20} color={theme.colors.primary} />
              </Pressable>
            </View>
            <ScrollView>
              {state.layers.map((layer: Layer, index: number) => (
                <View
                  key={layer.id}
                  style={[
                    styles.layerItem,
                    state.activeLayerId === layer.id && styles.activeLayer
                  ]}
                >
                  <Pressable
                    style={styles.layerVisibility}
                    onPress={() => {
                      layer.visible = !layer.visible;
                      professionalCanvas.current?.render();
                    }}
                  >
                    {layer.visible ? 
                      <Eye size={16} color={theme.colors.text} /> : 
                      <EyeOff size={16} color={theme.colors.textSecondary} />
                    }
                  </Pressable>
                  <Text style={styles.layerName}>{layer.name}</Text>
                  <Pressable
                    style={styles.layerLock}
                    onPress={() => {
                      layer.locked = !layer.locked;
                      professionalCanvas.current?.render();
                    }}
                  >
                    {layer.locked ? 
                      <Lock size={16} color={theme.colors.textSecondary} /> : 
                      <Unlock size={16} color={theme.colors.text} />
                    }
                  </Pressable>
                  {state.layers.length > 1 && (
                    <Pressable
                      style={styles.layerDelete}
                      onPress={() => {
                        professionalCanvas.current?.deleteLayer(layer.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Trash2 size={16} color={theme.colors.error} />
                    </Pressable>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          style={styles.canvas}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </View>
      {/* Top Toolbar */}
      <View style={styles.topToolbar}>
        <Pressable style={styles.toolButton} onPress={handleUndo}>
          <Undo size={24} color={theme.colors.text} />
        </Pressable>
        <Pressable style={styles.toolButton} onPress={handleRedo}>
          <Redo size={24} color={theme.colors.text} />
        </Pressable>
        <View style={styles.toolSeparator} />
        <Pressable style={styles.toolButton} onPress={() => setShowLayerPanel(true)}>
          <Layers size={24} color={theme.colors.text} />
        </Pressable>
        <Pressable style={styles.toolButton} onPress={handleClear}>
          <Trash2 size={24} color={theme.colors.error} />
        </Pressable>
        <View style={styles.toolSpacer} />
        <Pressable style={styles.toolButton} onPress={handleExport}>
          <Download size={24} color={theme.colors.text} />
        </Pressable>
        <Pressable style={styles.toolButton} onPress={handleShare}>
          <Share2 size={24} color={theme.colors.text} />
        </Pressable>
      </View>
      {/* Bottom Toolbar */}
      <View style={styles.bottomToolbar}>
        <Pressable
          style={[styles.brushButton, { backgroundColor: drawingState.currentColor.hex }]}
          onPress={() => setShowBrushPicker(true)}
        >
          <BrushIcon size={24} color={theme.colors.surface} />
        </Pressable>
        <Pressable
          style={[styles.colorButton, { backgroundColor: drawingState.currentColor.hex }]}
          onPress={() => setShowColorPicker(true)}
        >
          <View style={styles.colorIndicator} />
        </Pressable>
        <View style={styles.brushInfo}>
          <Text style={styles.brushInfoText}>{drawingState.currentBrush.name}</Text>
          <Text style={styles.brushInfoSubtext}>
            {drawingState.currentBrush.settings.size}px
          </Text>
        </View>
      </View>
      {/* Modals */}
      {renderBrushPicker()}
      {renderColorPicker()}
      {renderLayerPanel()}
    </GestureHandlerRootView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  // ...[styles unchanged, paste yours here]...
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    margin: 10,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  canvas: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  topToolbar: {
    position: 'absolute',
    top: 50,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  bottomToolbar: {
    position: 'absolute',
    bottom: 30,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  toolButton: {
    padding: 12,
    borderRadius: 8,
  },
  toolSeparator: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
    marginHorizontal: 8,
  },
  toolSpacer: {
    flex: 1,
  },
  brushButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  colorButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  colorIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  brushInfo: {
    flex: 1,
  },
  brushInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  brushInfoSubtext: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  brushPickerContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  colorPickerContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  layerPanelContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  brushOption: {
    alignItems: 'center',
    marginRight: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
  },
  selectedBrush: {
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  brushIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  brushName: {
    fontSize: 12,
    color: theme.colors.text,
  },
  brushSettings: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  settingLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  colorOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    margin: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: theme.colors.primary,
    borderWidth: 3,
  },
  recentColors: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginRight: 12,
  },
  recentColor: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  layerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addLayerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.primary + '20',
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
  },
  activeLayer: {
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  layerVisibility: {
    padding: 4,
    marginRight: 8,
  },
  layerName: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text,
  },
  layerLock: {
    padding: 4,
    marginHorizontal: 8,
  },
  layerDelete: {
    padding: 4,
  },
});
