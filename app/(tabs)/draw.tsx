import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Pressable, 
  Text, 
  ScrollView,
  Modal,
  Alert,
  Platform,
  Dimensions,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import {
  Canvas,
  useCanvasRef,
  Skia,
  Drawing,
  Path,
  Paint,
  Group,
  Image as SkiaImage,
} from '@shopify/react-native-skia';
import { 
  GestureHandlerRootView, 
  PanGestureHandler, 
  PinchGestureHandler,
  TapGestureHandler,
  State,
} from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withTiming,
  runOnJS,
  useAnimatedGestureHandler,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useDrawing } from '../../src/contexts/DrawingContext';
import { useUserProgress } from '../../src/contexts/UserProgressContext';
import { ProfessionalCanvas } from '../../src/engines/drawing/ProfessionalCanvas';
import { brushEngine } from '../../src/engines/drawing/BrushEngine';
import { Brush, Layer, Color, Point, BrushCategory } from '../../src/types';
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
  ChevronUp,
  Maximize,
  Move,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Sliders,
} from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Professional color palette
const PROFESSIONAL_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
  '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB', '#A52A2A',
  '#808080', '#C0C0C0', '#FFD700', '#4B0082', '#FF69B4', '#DC143C',
  '#00CED1', '#FF4500', '#2E8B57', '#DAA520', '#D2691E', '#8B008B',
  '#556B2F', '#8B4513', '#2F4F4F', '#000080', '#8B0000', '#483D8B',
];

export default function DrawScreen() {
  const theme = useTheme();
  const { state: drawingState, dispatch: drawingDispatch } = useDrawing();
  const { addXP, addAchievement, updateLearningStats } = useUserProgress();
  
  const canvasRef = useCanvasRef();
  const professionalCanvas = useRef<ProfessionalCanvas | null>(null);
  
  const [showBrushPicker, setShowBrushPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [showBrushSettings, setShowBrushSettings] = useState(false);
  const [currentTool, setCurrentTool] = useState<'brush' | 'move' | 'transform'>('brush');
  const [isDrawing, setIsDrawing] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  
  // Canvas state
  const [canvasState, setCanvasState] = useState<any>(null);
  
  // Gesture values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const lastScale = useSharedValue(1);
  const lastTranslateX = useSharedValue(0);
  const lastTranslateY = useSharedValue(0);
  
  // Tool panel animation
  const toolbarAnimation = useSharedValue(1);
  
  const styles = createStyles(theme);

  useEffect(() => {
    if (canvasRef.current && !professionalCanvas.current) {
      // Initialize professional canvas with Skia
      professionalCanvas.current = new ProfessionalCanvas();
      
      // Calculate canvas dimensions
      const canvasWidth = screenWidth - 20;
      const canvasHeight = screenHeight - 200; // Account for toolbars
      
      professionalCanvas.current.initialize(canvasRef, canvasWidth, canvasHeight);
      
      // Set initial brush and color
      const defaultBrush = brushEngine.getBrush('pencil-2b');
      if (defaultBrush) {
        professionalCanvas.current.setBrush(defaultBrush);
        brushEngine.setCurrentBrush('pencil-2b');
      }
      
      professionalCanvas.current.setColor(drawingState.currentColor);
      
      // Subscribe to canvas events
      const unsubscribeStroke = professionalCanvas.current.onStroke((stroke) => {
        drawingDispatch({ type: 'ADD_STROKE', stroke });
        addXP(1);
        updateLearningStats('drawing', { strokesDrawn: 1 });
      });
      
      const unsubscribeLayers = professionalCanvas.current.onLayersChange((layers) => {
        // Update context with layer changes
      });
      
      setCanvasReady(true);
      
      return () => {
        unsubscribeStroke();
        unsubscribeLayers();
        professionalCanvas.current?.destroy();
      };
    }
  }, [canvasRef.current]);

  // Touch handlers for drawing
  const handleTouchStart = useCallback((event: any) => {
    if (currentTool !== 'brush' || !professionalCanvas.current) return;
    
    const { locationX, locationY } = event.nativeEvent;
    const touches = event.nativeEvent.touches || [];
    const touch = touches[0] || event.nativeEvent;
    
    // Get pressure and tilt data
    const point: Point = {
      x: locationX,
      y: locationY,
      pressure: touch.force || 0.5,
      tiltX: touch.tiltX || 0,
      tiltY: touch.tiltY || 0,
      timestamp: Date.now(),
    };
    
    professionalCanvas.current.startStroke(point);
    setIsDrawing(true);
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [currentTool]);

  const handleTouchMove = useCallback((event: any) => {
    if (!isDrawing || currentTool !== 'brush' || !professionalCanvas.current) return;
    
    const { locationX, locationY } = event.nativeEvent;
    const touches = event.nativeEvent.touches || [];
    const touch = touches[0] || event.nativeEvent;
    
    const point: Point = {
      x: locationX,
      y: locationY,
      pressure: touch.force || 0.5,
      tiltX: touch.tiltX || 0,
      tiltY: touch.tiltY || 0,
      timestamp: Date.now(),
    };
    
    professionalCanvas.current.addPoint(point);
  }, [isDrawing, currentTool]);

  const handleTouchEnd = useCallback(() => {
    if (!isDrawing || !professionalCanvas.current) return;
    
    professionalCanvas.current.endStroke();
    setIsDrawing(false);
    
    // Check achievements
    checkDrawingAchievements();
  }, [isDrawing]);

  // Gesture handlers for canvas manipulation
  const panGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      if (currentTool === 'move') {
        lastTranslateX.value = translateX.value;
        lastTranslateY.value = translateY.value;
      }
    },
    onActive: (event) => {
      if (currentTool === 'move') {
        translateX.value = lastTranslateX.value + event.translationX;
        translateY.value = lastTranslateY.value + event.translationY;
      }
    },
    onEnd: () => {
      if (currentTool === 'move') {
        runOnJS(updateCanvasTransform)();
      }
    },
  });

  const pinchGestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      lastScale.value = scale.value;
    },
    onActive: (event) => {
      scale.value = lastScale.value * event.scale;
    },
    onEnd: () => {
      runOnJS(updateCanvasTransform)();
    },
  });

  const updateCanvasTransform = () => {
    if (professionalCanvas.current) {
      professionalCanvas.current.setZoom(scale.value);
      professionalCanvas.current.setPan(translateX.value, translateY.value);
      professionalCanvas.current.setRotation(rotation.value);
    }
  };

  const animatedCanvasStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const checkDrawingAchievements = () => {
    const state = professionalCanvas.current?.getState();
    if (!state) return;
    
    const totalStrokes = state.layers.reduce((sum: number, layer: any) => 
      sum + (layer.strokes?.length || 0), 0
    );
    
    if (totalStrokes === 1) {
      addAchievement('first_stroke');
    }
    if (totalStrokes === 100) {
      addAchievement('hundred_strokes');
    }
    if (state.layers.length >= 5) {
      addAchievement('layer_master');
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
      const base64 = await professionalCanvas.current?.exportImage('png', 1.0);
      if (!base64) return;
      
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to save images.');
        return;
      }
      
      // Save to media library
      const filename = `Pikaso_${Date.now()}.png`;
      const fileUri = `${MediaLibrary.documentDirectory}${filename}`;
      
      // Convert base64 to file and save
      await MediaLibrary.createAssetAsync(fileUri);
      
      Alert.alert('Success', 'Artwork saved to gallery!');
      addAchievement('first_export');
      updateLearningStats('portfolio', { artworksCreated: 1 });
    } catch (error) {
      Alert.alert('Error', 'Failed to export artwork');
      console.error('Export error:', error);
    }
  };

  const handleShare = async () => {
    try {
      const base64 = await professionalCanvas.current?.exportImage('png', 1.0);
      if (!base64) return;
      
      await Sharing.shareAsync(base64, {
        mimeType: 'image/png',
        dialogTitle: 'Share your artwork',
      });
      
      addAchievement('first_share');
      updateLearningStats('community', { artworksShared: 1 });
    } catch (error) {
      Alert.alert('Error', 'Failed to share artwork');
    }
  };

  const handleBrushSelect = (brush: Brush) => {
    professionalCanvas.current?.setBrush(brush);
    brushEngine.setCurrentBrush(brush.id);
    drawingDispatch({ type: 'SET_BRUSH', brush });
    setShowBrushPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleColorSelect = (colorHex: string) => {
    const color = hexToColor(colorHex);
    professionalCanvas.current?.setColor(color);
    drawingDispatch({ type: 'SET_COLOR', color });
    setShowColorPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLayerAdd = () => {
    const layerId = professionalCanvas.current?.addLayer();
    if (layerId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const toggleToolbar = () => {
    toolbarAnimation.value = withSpring(toolbarAnimation.value === 1 ? 0 : 1);
  };

  const animatedToolbarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(toolbarAnimation.value, [0, 1], [0.3, 1]),
    transform: [
      {
        translateY: interpolate(
          toolbarAnimation.value,
          [0, 1],
          [-50, 0],
          Extrapolate.CLAMP
        ),
      },
    ],
  }));

  // Helper function to convert hex to Color object
  const hexToColor = (hex: string): Color => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    const delta = max - min;
    
    let h = 0;
    if (delta !== 0) {
      if (max === rNorm) h = 60 * (((gNorm - bNorm) / delta) % 6);
      else if (max === gNorm) h = 60 * (((bNorm - rNorm) / delta) + 2);
      else if (max === bNorm) h = 60 * (((rNorm - gNorm) / delta) + 4);
    }
    
    const s = max === 0 ? 0 : delta / max;
    const brightness = max;
    
    return {
      hex,
      rgb: { r, g, b },
      hsb: { h: h < 0 ? h + 360 : h, s, b: brightness },
      alpha: 1,
    };
  };

  const renderBrushPicker = () => {
    const allBrushes = brushEngine.getAllBrushes();
    const categories: BrushCategory[] = ['pencil', 'ink', 'paint', 'watercolor', 'airbrush', 'marker', 'texture', 'eraser'];
    
    return (
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
            <Text style={styles.pickerTitle}>Professional Brushes</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {categories.map(category => {
                const categoryBrushes = brushEngine.getBrushesByCategory(category);
                if (categoryBrushes.length === 0) return null;
                
                return (
                  <View key={category} style={styles.brushCategory}>
                    <Text style={styles.categoryTitle}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      style={styles.brushRow}
                    >
                      {categoryBrushes.map((brush) => (
                        <Pressable
                          key={brush.id}
                          style={[
                            styles.brushOption,
                            brushEngine.getCurrentBrush()?.id === brush.id && styles.selectedBrush
                          ]}
                          onPress={() => handleBrushSelect(brush)}
                        >
                          <Text style={styles.brushIcon}>{brush.icon}</Text>
                          <Text style={styles.brushName}>{brush.name}</Text>
                          <Text style={styles.brushSize}>{brush.settings.size}px</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                );
              })}
            </ScrollView>
            
            <Pressable
              style={styles.brushSettingsButton}
              onPress={() => {
                setShowBrushPicker(false);
                setShowBrushSettings(true);
              }}
            >
              <Sliders size={20} color={theme.colors.primary} />
              <Text style={styles.brushSettingsText}>Brush Settings</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    );
  };

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
          <Text style={styles.pickerTitle}>Color Palette</Text>
          
          <View style={styles.colorGrid}>
            {PROFESSIONAL_COLORS.map((colorHex) => (
              <Pressable
                key={colorHex}
                style={[
                  styles.colorOption,
                  { backgroundColor: colorHex },
                  drawingState.currentColor.hex === colorHex && styles.selectedColor
                ]}
                onPress={() => handleColorSelect(colorHex)}
              />
            ))}
          </View>
          
          <View style={styles.colorTools}>
            <View style={styles.currentColorDisplay}>
              <View 
                style={[styles.currentColorSwatch, { backgroundColor: drawingState.currentColor.hex }]} 
              />
              <Text style={styles.currentColorHex}>{drawingState.currentColor.hex}</Text>
            </View>
          </View>
          
          <View style={styles.recentColors}>
            <Text style={styles.recentLabel}>Recent Colors:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {(drawingState.recentColors || []).map((colorHex: string, index: number) => (
                <Pressable
                  key={`recent-${index}`}
                  style={[styles.recentColor, { backgroundColor: colorHex }]}
                  onPress={() => handleColorSelect(colorHex)}
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
                onPress={handleLayerAdd}
              >
                <Plus size={20} color={theme.colors.primary} />
                <Text style={styles.addLayerText}>Add Layer</Text>
              </Pressable>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {state.layers.map((layer: Layer) => (
                <View
                  key={layer.id}
                  style={[
                    styles.layerItem,
                    state.activeLayerId === layer.id && styles.activeLayer
                  ]}
                >
                  <Pressable
                    style={styles.layerMain}
                    onPress={() => {
                      professionalCanvas.current?.setActiveLayer(layer.id);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Pressable
                      style={styles.layerVisibility}
                      onPress={() => {
                        professionalCanvas.current?.updateLayerProperties(layer.id, {
                          visible: !layer.visible
                        });
                      }}
                    >
                      {layer.visible ? 
                        <Eye size={16} color={theme.colors.text} /> : 
                        <EyeOff size={16} color={theme.colors.textSecondary} />
                      }
                    </Pressable>
                    
                    <View style={styles.layerInfo}>
                      <Text style={styles.layerName}>{layer.name}</Text>
                      <Text style={styles.layerOpacity}>
                        {Math.round(layer.opacity * 100)}% • {layer.blendMode}
                      </Text>
                    </View>
                    
                    <Pressable
                      style={styles.layerLock}
                      onPress={() => {
                        professionalCanvas.current?.updateLayerProperties(layer.id, {
                          locked: !layer.locked
                        });
                      }}
                    >
                      {layer.locked ? 
                        <Lock size={16} color={theme.colors.textSecondary} /> : 
                        <Unlock size={16} color={theme.colors.text} />
                      }
                    </Pressable>
                  </Pressable>
                  
                  {state.layers.length > 1 && (
                    <Pressable
                      style={styles.layerDelete}
                      onPress={() => {
                        Alert.alert(
                          'Delete Layer',
                          `Delete "${layer.name}"?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Delete',
                              style: 'destructive',
                              onPress: () => {
                                professionalCanvas.current?.deleteLayer(layer.id);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              }
                            }
                          ]
                        );
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
        <PinchGestureHandler onGestureEvent={pinchGestureHandler}>
          <Animated.View style={[styles.canvasWrapper, animatedCanvasStyle]}>
            <PanGestureHandler onGestureEvent={panGestureHandler}>
              <Animated.View style={styles.canvasInner}>
                <Canvas
                  ref={canvasRef}
                  style={styles.canvas}
                  onTouch={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                />
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>
        </PinchGestureHandler>
        
        {/* Canvas overlay indicators */}
        {isDrawing && (
          <View style={styles.drawingIndicator}>
            <View style={styles.drawingDot} />
          </View>
        )}
      </View>
      
      {/* Top Toolbar */}
      <Animated.View style={[styles.topToolbar, animatedToolbarStyle]}>
        <View style={styles.toolGroup}>
          <Pressable style={styles.toolButton} onPress={handleUndo}>
            <Undo size={24} color={theme.colors.text} />
          </Pressable>
          <Pressable style={styles.toolButton} onPress={handleRedo}>
            <Redo size={24} color={theme.colors.text} />
          </Pressable>
        </View>
        
        <View style={styles.toolSeparator} />
        
        <View style={styles.toolGroup}>
          <Pressable 
            style={[styles.toolButton, currentTool === 'brush' && styles.activeToolButton]}
            onPress={() => setCurrentTool('brush')}
          >
            <BrushIcon size={24} color={theme.colors.text} />
          </Pressable>
          <Pressable 
            style={[styles.toolButton, currentTool === 'move' && styles.activeToolButton]}
            onPress={() => setCurrentTool('move')}
          >
            <Move size={24} color={theme.colors.text} />
          </Pressable>
          <Pressable 
            style={[styles.toolButton, currentTool === 'transform' && styles.activeToolButton]}
            onPress={() => setCurrentTool('transform')}
          >
            <Maximize size={24} color={theme.colors.text} />
          </Pressable>
        </View>
        
        <View style={styles.toolSeparator} />
        
        <View style={styles.toolGroup}>
          <Pressable style={styles.toolButton} onPress={() => setShowLayerPanel(true)}>
            <Layers size={24} color={theme.colors.text} />
          </Pressable>
          <Pressable style={styles.toolButton} onPress={handleClear}>
            <Trash2 size={24} color={theme.colors.error} />
          </Pressable>
        </View>
        
        <View style={styles.toolSpacer} />
        
        <View style={styles.toolGroup}>
          <Pressable style={styles.toolButton} onPress={handleExport}>
            <Download size={24} color={theme.colors.text} />
          </Pressable>
          <Pressable style={styles.toolButton} onPress={handleShare}>
            <Share2 size={24} color={theme.colors.text} />
          </Pressable>
        </View>
        
        <Pressable style={styles.toolbarToggle} onPress={toggleToolbar}>
          <ChevronUp size={20} color={theme.colors.textSecondary} />
        </Pressable>
      </Animated.View>
      
      {/* Bottom Toolbar */}
      <View style={styles.bottomToolbar}>
        <Pressable
          style={[styles.mainToolButton, { backgroundColor: drawingState.currentColor.hex }]}
          onPress={() => setShowBrushPicker(true)}
        >
          <BrushIcon size={28} color={theme.colors.surface} />
        </Pressable>
        
        <Pressable
          style={[styles.mainToolButton, styles.colorButton]}
          onPress={() => setShowColorPicker(true)}
        >
          <View 
            style={[styles.colorButtonInner, { backgroundColor: drawingState.currentColor.hex }]} 
          />
        </Pressable>
        
        <View style={styles.brushInfoContainer}>
          <Text style={styles.brushInfoText}>
            {brushEngine.getCurrentBrush()?.name || 'Select Brush'}
          </Text>
          <View style={styles.brushInfoDetails}>
            <Text style={styles.brushInfoSize}>
              {brushEngine.getCurrentBrush()?.settings.size || 0}px
            </Text>
            <Text style={styles.brushInfoOpacity}>
              {Math.round((brushEngine.getCurrentBrush()?.settings.opacity || 1) * 100)}%
            </Text>
          </View>
        </View>
        
        <View style={styles.canvasControls}>
          <Pressable
            style={styles.zoomButton}
            onPress={() => {
              scale.value = withSpring(scale.value * 1.2);
              updateCanvasTransform();
            }}
          >
            <ZoomIn size={20} color={theme.colors.text} />
          </Pressable>
          <Text style={styles.zoomText}>{Math.round(scale.value * 100)}%</Text>
          <Pressable
            style={styles.zoomButton}
            onPress={() => {
              scale.value = withSpring(scale.value * 0.8);
              updateCanvasTransform();
            }}
          >
            <ZoomOut size={20} color={theme.colors.text} />
          </Pressable>
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
  canvasWrapper: {
    flex: 1,
  },
  canvasInner: {
    flex: 1,
  },
  canvas: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  drawingIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 8,
  },
  drawingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
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
    borderRadius: 16,
    padding: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  toolGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolButton: {
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 2,
  },
  activeToolButton: {
    backgroundColor: theme.colors.primary + '20',
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
  toolbarToggle: {
    padding: 8,
    marginLeft: 8,
  },
  mainToolButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  colorButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 3,
    borderColor: theme.colors.border,
  },
  colorButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  brushInfoContainer: {
    flex: 1,
    marginRight: 12,
  },
  brushInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  brushInfoDetails: {
    flexDirection: 'row',
    marginTop: 2,
  },
  brushInfoSize: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginRight: 8,
  },
  brushInfoOpacity: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  canvasControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoomButton: {
    padding: 8,
  },
  zoomText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginHorizontal: 8,
    minWidth: 40,
    textAlign: 'center',
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
    maxHeight: '70%',
  },
  pickerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 20,
  },
  brushCategory: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  brushRow: {
    marginBottom: 10,
  },
  brushOption: {
    alignItems: 'center',
    marginRight: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.background,
    minWidth: 80,
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
    textAlign: 'center',
  },
  brushSize: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  brushSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    marginTop: 16,
  },
  brushSettingsText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginLeft: 8,
    fontWeight: '500',
  },
  colorPickerContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    margin: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedColor: {
    borderColor: theme.colors.primary,
    borderWidth: 3,
  },
  colorTools: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  currentColorDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currentColorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  currentColorHex: {
    fontSize: 16,
    color: theme.colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  recentColors: {
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
  layerPanelContainer: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  layerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addLayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary + '20',
  },
  addLayerText: {
    fontSize: 14,
    color: theme.colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  layerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    overflow: 'hidden',
  },
  activeLayer: {
    backgroundColor: theme.colors.primary + '10',
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  layerMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  layerVisibility: {
    padding: 4,
    marginRight: 8,
  },
  layerInfo: {
    flex: 1,
  },
  layerName: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  layerOpacity: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  layerLock: {
    padding: 4,
    marginLeft: 8,
  },
  layerDelete: {
    padding: 16,
    backgroundColor: theme.colors.error + '10',
  },
});