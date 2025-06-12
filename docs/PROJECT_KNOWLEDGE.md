# 📚 Pikaso Project Knowledge - PHASE 2 INITIALIZATION FIXES

**Project Classification**: Production-Ready Drawing App (React Native + Expo)  
**Current Status**: 🔄 **PHASE 2 - ENGINE INITIALIZATION** - Critical path to production  
**Last Updated**: June 12, 2025 | **Priority**: HIGH - Engine Bootstrap  
**GitHub**: https://github.com/alecrj/pik.git  

---

## 🎯 **CURRENT STATUS - PHASE 2**

### **✅ PHASE 1 COMPLETED (100%)**
- ✅ **TypeScript Compilation**: All 13 errors resolved
- ✅ **React Hooks Order**: Critical crash issue fixed
- ✅ **Navigation Architecture**: Smooth tab navigation working
- ✅ **User System**: Onboarding and account creation functional
- ✅ **Core Architecture**: Google-level modular engine system established

### **🔄 PHASE 2 CURRENT ISSUES**
| Component | Status | Issue | Next Action |
|-----------|--------|-------|-------------|
| **Learning System** | ❌ Blocked | SkillTreeManager.initialize is undefined | **Fix engine singletons** |
| **Drawing System** | ❌ Blocked | Canvas initialization hanging | **Fix drawing engine bootstrap** |
| **Music System** | 🚫 Missing | No background music implementation | **Add Expo AV system** |
| **Content System** | 🚫 Missing | No lesson content loading | **Implement lesson data** |

---

## 🚨 **CRITICAL PATH - NEXT SESSION PRIORITIES**

### **Priority 1: Engine Initialization (30 min)**
**Objective**: Fix SkillTreeManager and engine singleton bootstrap

**Root Cause**: Missing singleton exports and initialization methods
```javascript
// Current Error:
❌ skillTreeManager.initialize is not a function (it is undefined)

// Required Files to Fix:
1. src/engines/learning/SkillTreeManager.ts - Add singleton export
2. src/engines/learning/LessonEngine.ts - Add singleton export  
3. src/engines/drawing/BrushEngine.ts - Add initialization method
4. src/engines/core/DataManager.ts - Add learning data methods
```

### **Priority 2: Drawing System Completion (45 min)**
**Objective**: Procreate-level drawing capabilities

**Components Needed**:
- ✅ Canvas component structure (exists)
- ❌ Apple Pencil pressure sensitivity (needs implementation)
- ❌ Professional brush engine (needs completion)
- ❌ Layer system functionality (needs implementation)
- ❌ 60fps performance optimization (needs tuning)

### **Priority 3: Music System Implementation (20 min)**
**Objective**: Background music with track selection per page

**Technical Requirements**:
- **Expo AV integration** for audio playback
- **Track library system** with categorized playlists
- **Page-specific music** (drawing, learning, gallery themes)
- **Volume controls** and fade transitions
- **User preferences** for music on/off

---

## 🎵 **MUSIC SYSTEM ARCHITECTURE**

### **Track Categories**
```typescript
interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  category: 'focus' | 'creative' | 'learning' | 'ambient';
  url: string;
  duration: number;
  bpm?: number;
}

// Page-Specific Playlists:
- Drawing: Focus/Ambient tracks (lo-fi, instrumental)
- Learning: Concentration tracks (binaural beats, nature sounds)
- Gallery: Creative tracks (upbeat, inspiring)
- Profile: Personal tracks (user customizable)
```

### **Music Manager Implementation**
```typescript
class MusicManager {
  // Background music with seamless transitions
  // Volume controls and fade effects
  // Track recommendations based on activity
  // Offline caching for core tracks
}
```

---

## 🎨 **DRAWING SYSTEM - PROCREATE LEVEL FEATURES**

### **Core Features Needed**
1. **Apple Pencil Integration**
   - 4096 pressure levels
   - Tilt detection for shading
   - Palm rejection
   - Haptic feedback

2. **Professional Brush Engine**
   - 15+ brush types (pencil, ink, watercolor, airbrush)
   - Custom brush creation
   - Pressure curves and dynamics
   - Texture support

3. **Layer System**
   - Unlimited layers
   - Blend modes (multiply, screen, overlay, etc.)
   - Layer effects and transformations
   - Group management

4. **Performance Optimization**
   - 60fps guaranteed drawing
   - Memory efficient rendering
   - Smooth zoom and pan
   - Instant undo/redo

---

## 📁 **FILES NEEDED FOR NEXT SESSION**

### **🚨 ENGINE INITIALIZATION (Must Fix First)**
```
src/engines/learning/
├── SkillTreeManager.ts        # Add singleton pattern + initialize()
├── LessonEngine.ts           # Add singleton pattern + initialize()
└── index.ts                  # Export all engine singletons

src/engines/drawing/
├── BrushEngine.ts            # Complete initialization method
├── ProfessionalCanvas.ts     # Add Apple Pencil integration
└── index.ts                  # Export drawing singletons

src/engines/core/
├── DataManager.ts            # Add lesson/skill tree data methods
└── index.ts                  # Export core singletons
```

### **🎵 MUSIC SYSTEM (New Implementation)**
```
src/engines/audio/            # NEW DIRECTORY
├── MusicManager.ts           # Background music system
├── TrackLibrary.ts           # Music track database
├── AudioEngine.ts            # Expo AV integration
└── index.ts                  # Audio system exports

src/content/music/            # NEW DIRECTORY
├── tracks.ts                 # Track metadata and URLs
├── playlists.ts              # Page-specific playlists
└── index.ts                  # Music content exports
```

### **🎨 DRAWING ENHANCEMENT (Priority Implementation)**
```
src/engines/drawing/
├── ApplePencilHandler.ts     # NEW - Pressure/tilt detection
├── LayerManager.ts           # NEW - Professional layer system  
├── BrushLibrary.ts           # NEW - Professional brush collection
└── PerformanceOptimizer.ts   # ENHANCE - 60fps guarantees
```

---

## 🚀 **NEXT SESSION EXECUTION PLAN**

### **Phase 2A: Engine Bootstrap (30 min)**
1. **Fix SkillTreeManager singleton** - Add proper initialize() method
2. **Fix LessonEngine singleton** - Add content loading
3. **Fix DataManager** - Add lesson data persistence
4. **Test initialization** - Verify learning tab loads

### **Phase 2B: Music System (20 min)**
1. **Install Expo AV** - `expo install expo-av`
2. **Create MusicManager** - Background audio system
3. **Add track library** - Focus/creative/learning playlists
4. **Integrate page-specific music** - Auto-play on tab switch

### **Phase 2C: Drawing System Enhancement (45 min)**
1. **Apple Pencil integration** - Pressure sensitivity
2. **Professional brush engine** - 10+ brush types
3. **Layer system** - Basic layer management
4. **Performance optimization** - 60fps drawing

### **Phase 2D: Content Integration (15 min)**
1. **Add lesson content** - 5 complete lessons with practice
2. **Test user flows** - Onboarding → Learning → Drawing
3. **Verify music system** - Page transitions with audio
4. **Performance validation** - 60fps + smooth audio

---

## 📊 **SUCCESS METRICS FOR NEXT SESSION**

### **Engine Initialization**
- ✅ Learning tab loads without "Loading learning content..."
- ✅ Drawing tab loads without "Initializing canvas..."
- ✅ All engine singletons properly exported and initialized

### **Music System**
- ✅ Background music plays automatically
- ✅ Smooth transitions between pages
- ✅ User can control volume and track selection
- ✅ No audio conflicts or memory leaks

### **Drawing Enhancement**
- ✅ Apple Pencil pressure sensitivity working
- ✅ Smooth 60fps drawing performance
- ✅ Basic layer system functional
- ✅ Professional brush feel and responsiveness

### **User Experience**
- ✅ Complete user flow: Onboarding → Learn → Draw → Gallery
- ✅ No loading screens or initialization hangs
- ✅ Professional app feel with music and smooth interactions

---

## 🎯 **COMPLETION CRITERIA**

**Phase 2 Complete When**:
1. ✅ All tabs load instantly without hanging
2. ✅ Background music enhances user experience
3. ✅ Drawing feels as responsive as Procreate
4. ✅ Learning system delivers interactive lessons
5. ✅ Performance maintains 60fps throughout

**Ready for Phase 3**: Advanced features, content creation, and production polish.

---

## 💡 **TECHNICAL ARCHITECTURE NOTES**

### **Engine Singleton Pattern**
```typescript
// Required Pattern for All Engines:
export class EngineClass {
  private static instance: EngineClass;
  
  public static getInstance(): EngineClass {
    if (!EngineClass.instance) {
      EngineClass.instance = new EngineClass();
    }
    return EngineClass.instance;
  }
  
  public async initialize(): Promise<void> {
    // Engine-specific initialization
  }
}

export const engineInstance = EngineClass.getInstance();
```

### **Music System Integration**
```typescript
// MusicManager will be context-based:
const MusicContext = createContext<MusicContextType>();

// Auto-play on navigation:
useEffect(() => {
  musicManager.playForPage(currentPage);
}, [currentPage]);
```

### **Drawing Performance Targets**
- **Input Latency**: <16ms from Apple Pencil to screen
- **Frame Rate**: Locked 60fps during drawing
- **Memory Usage**: <100MB for complex artworks
- **Battery Impact**: <10% per hour of drawing

---

## 🔄 **PHASE PROGRESSION**

- ✅ **Phase 1**: TypeScript + Navigation (COMPLETE)
- 🔄 **Phase 2**: Engine Initialization + Music + Drawing (CURRENT)
- 🚫 **Phase 3**: Content + Social + Advanced Features
- 🚫 **Phase 4**: Performance + Polish + Production Ready

**Next Session Goal**: Complete Phase 2 and move to Phase 3 with full engine functionality and music system operational.