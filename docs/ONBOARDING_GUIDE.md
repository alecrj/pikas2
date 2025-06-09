# 🚀 Pikaso Developer Onboarding Guide

## ⚡ **5-Minute Quick Start**

### **1. Clone & Setup**
```bash
git clone [your-repo-url]
cd Pikaso
npm install
npx expo start --clear
```

### **2. Verify Everything Works**
```bash
# Should show: "Found 0 errors"
npx tsc --noEmit

# Should launch app with tab navigation
npx expo start
```

### **3. Test Core Functionality**
- ✅ App launches to home screen
- ✅ Tab navigation works (Home, Draw, Learn, Gallery, Profile)
- ✅ Draw tab opens basic canvas
- ✅ Learn tab shows skill trees
- ✅ No console errors

**If anything fails**: Check `docs/PROJECT_KNOWLEDGE.md` for troubleshooting

---

## 🏗️ **Architecture Overview**

### **Project Structure**
```
Pikaso/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Main tab navigation
│   └── _layout.tsx        # Root layout with providers
├── src/
│   ├── engines/           # Core business logic (modular)
│   ├── contexts/          # React Context providers
│   ├── types/             # TypeScript definitions
│   └── constants/         # App constants
└── docs/                  # Project documentation
```

### **Key Concepts**

#### **🔧 Engine Architecture**
```typescript
src/engines/
├── core/          # Foundation (error handling, performance)
├── drawing/       # Canvas and drawing tools
├── learning/      # Lessons and skill progression  
├── user/          # Profiles and achievements
└── community/     # Social features
```

#### **🎯 Context Providers**
```typescript
- ThemeContext      → Dark/light mode, colors
- UserProgressContext → XP, levels, achievements
- DrawingContext    → Canvas state, tools, layers
- LearningContext   → Lessons, progress, skill trees
```

#### **📱 Screen Structure**
```typescript
app/(tabs)/
├── index.tsx      # Home screen (default route)
├── draw.tsx       # Drawing canvas
├── learn.tsx      # Skill trees and lessons
├── gallery.tsx    # Portfolio and community
└── profile.tsx    # User profile and settings
```

---

## 🎯 **Current Status & Priorities**

### **✅ What's Complete**
- **Foundation**: TypeScript architecture, routing, contexts
- **Basic Features**: Tab navigation, simple drawing, lesson structure
- **Code Quality**: Zero compilation errors, clean architecture

### **🚀 What's Next (Your Focus)**
1. **Drawing Engine**: Upgrade to professional tools (Apple Pencil, brushes)
2. **Learning System**: Add AI feedback and adaptive difficulty
3. **UI Polish**: Material Design system and animations
4. **Performance**: 60fps optimization and monitoring

### **📋 Immediate Tasks (Pick One)**
- **Frontend**: Enhance drawing canvas with Apple Pencil support
- **Backend**: Improve lesson content and assessment system
- **Design**: Implement professional UI components
- **Performance**: Add frame rate monitoring

---

## 🛠️ **Development Workflow**

### **Before Starting Work**
```bash
# Always start fresh
git pull origin main
npm install
npx expo start --clear
```

### **Code Standards**
- **TypeScript Strict**: All code must compile without errors
- **Modular Design**: Use existing engine/context patterns
- **Performance First**: Maintain 60fps drawing target
- **Error Handling**: Use ErrorBoundary and errorHandler
- **Testing**: Verify on real devices, not just simulator

### **Key Files to Understand**
```typescript
src/engines/drawing/ProfessionalCanvas.ts  # Drawing engine core
src/engines/learning/SkillTreeManager.ts   # Learning system
src/contexts/DrawingContext.tsx            # Canvas state management
src/contexts/LearningContext.tsx           # Learning state management
app/(tabs)/draw.tsx                        # Drawing interface
app/(tabs)/learn.tsx                       # Learning interface
```

---

## 🎨 **Feature Development Guide**

### **Adding New Drawing Features**
1. **Engine Layer**: Add logic to `src/engines/drawing/`
2. **Context Layer**: Update `src/contexts/DrawingContext.tsx`
3. **UI Layer**: Modify `app/(tabs)/draw.tsx`
4. **Types**: Add types to `src/types/index.ts`

### **Adding New Learning Features**
1. **Engine Layer**: Enhance `src/engines/learning/`
2. **Context Layer**: Update `src/contexts/LearningContext.tsx`
3. **UI Layer**: Modify `app/(tabs)/learn.tsx`
4. **Content**: Add lessons to SkillTreeManager

### **Adding New Screens**
1. **Create**: New file in `app/` directory
2. **Route**: Register in `app/_layout.tsx` if needed
3. **Navigate**: Use `useRouter()` from expo-router

---

## 🐛 **Common Issues & Solutions**

### **TypeScript Errors**
```bash
# Check for errors
npx tsc --noEmit

# Common fixes
- Add missing imports
- Check type definitions in src/types/
- Ensure context providers are wrapped properly
```

### **Metro/Expo Issues**
```bash
# Clear all caches
npx expo start --clear

# Reset metro
npx expo start --reset-cache

# Clear node modules
rm -rf node_modules && npm install
```

### **Context Provider Errors**
```bash
# Error: "useTheme must be used within ThemeProvider"
# Solution: Check app/_layout.tsx has all providers wrapped correctly
```

### **Routing Issues**
```bash
# Error: "Unmatched Route"
# Solution: Ensure screen file exists and is properly exported
```

---

## 📚 **Resources & Documentation**

### **Project Docs**
- `docs/DEV_INSTRUCTIONS.md` → Detailed roadmap and technical specs
- `docs/PROJECT_KNOWLEDGE.md` → Architecture and current status
- `docs/ONBOARDING_GUIDE.md` → This guide

### **External Resources**
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Lucide Icons](https://lucide.dev/) (our icon library)

### **Key Dependencies**
```json
"expo-router": "Navigation framework"
"react-native-reanimated": "Animations"
"@shopify/react-native-skia": "High-performance graphics" 
"lucide-react-native": "Icon library"
"expo-haptics": "Tactile feedback"
```

---

## 🚀 **Getting Started Checklist**

### **Day 1: Setup & Exploration**
- [ ] Clone repo and run successfully
- [ ] Explore app structure and navigation
- [ ] Read architecture documentation
- [ ] Try drawing on canvas and navigating lessons
- [ ] Identify one area to improve

### **Day 2: Make First Contribution**
- [ ] Pick a small improvement (UI polish, bug fix)
- [ ] Follow modular architecture patterns
- [ ] Test on real device
- [ ] Verify no TypeScript errors
- [ ] Document any issues found

### **Week 1: Major Feature**
- [ ] Choose focus area (drawing, learning, UI, performance)
- [ ] Study existing implementation
- [ ] Plan enhancement approach
- [ ] Implement with professional quality
- [ ] Test thoroughly and gather feedback

---

## 🎯 **Success Metrics**

### **Code Quality**
- Zero TypeScript compilation errors
- Follows existing architectural patterns
- Performance tested on real devices
- Proper error handling implemented

### **User Experience**
- Features feel professional and polished
- 60fps performance maintained
- Intuitive and delightful to use
- Accessible to all users

### **Team Collaboration**
- Clear documentation of changes
- Follows established conventions
- Communicates blockers early
- Helps improve overall codebase

---

## 💡 **Pro Tips**

### **Development**
- **Real Device Testing**: Simulator can't test Apple Pencil or performance
- **Incremental Development**: Small, testable changes
- **Performance First**: Always check frame rates
- **User-Centric**: Think like an artist learning to draw

### **Architecture**
- **Engine → Context → UI**: Follow the data flow
- **Modular**: Keep concerns separated
- **TypeScript**: Let the type system guide you
- **Error Boundaries**: Handle failures gracefully

### **Debugging**
- **React DevTools**: Inspect component hierarchy
- **Chrome DevTools**: Network and performance profiling
- **Console Logs**: Strategic logging for understanding flow
- **Real Device**: Test on actual iPad with Apple Pencil

---

## 🏆 **Ready to Build Something Amazing?**

You now have:
- ✅ **Working development environment**
- ✅ **Architecture understanding**
- ✅ **Clear next steps and priorities**
- ✅ **Development workflow and standards**

**Choose your adventure:**
- 🎨 **Drawing Engine**: Make the canvas feel like Procreate
- 📚 **Learning System**: Build Duolingo-level engagement  
- ✨ **UI Polish**: Create Apple-level design excellence
- ⚡ **Performance**: Achieve 60fps with advanced features

**Welcome to the team! Let's build the future of creative education! 🚀**