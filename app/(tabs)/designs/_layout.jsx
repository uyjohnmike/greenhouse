import { Slot } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { UserNavigationProvider, useUserNavigation } from '../UserNavigationContext';
import SideNavigation from '../navigation/sidenavigation';

function LayoutContent() {
  const { showMenu, openMenu, closeMenu, toggleMenu } = useUserNavigation();
  const anim = useRef(new Animated.Value(showMenu ? 1 : 0)).current;

  useEffect(() => {
    // Animate whenever showMenu changes
    Animated.spring(anim, {
      toValue: showMenu ? 1 : 0,
      friction: 8,
      tension: 40,
      useNativeDriver: false, // Keep false for width animation
    }).start();
  }, [showMenu]);

  const sidebarWidth = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [85, 210], 
  });

  // Arrow rotation - points right when collapsed (0), points left when expanded (1)
  const arrowRotation = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const handleToggle = () => {
    // Use toggleMenu if available, otherwise manually toggle
    if (toggleMenu) {
      toggleMenu();
    } else {
      if (showMenu) {
        closeMenu();
      } else {
        openMenu();
      }
    }
  };

  return (
    <View style={styles.layoutContainer}>
      <Animated.View style={{ width: sidebarWidth }}>
        <SideNavigation animatedValue={anim} />
      </Animated.View>
      
      <View style={styles.contentArea}>
        <TouchableOpacity 
          activeOpacity={0.8}
          style={styles.floatingExpandBtn} 
          onPress={handleToggle}>

          <Animated.View style={{ transform: [{ rotate: arrowRotation }] }}>
            <Icon 
              name="chevron-right"
              size={24} 
              color="#FFF"/>
          </Animated.View>
        </TouchableOpacity>
        
        <Slot />
      </View>
    </View>
  );
}

export default function DashboardLayout() {
  return (
    <UserNavigationProvider>
      <LayoutContent />
    </UserNavigationProvider>
  );
}

const styles = StyleSheet.create({
  layoutContainer: { 
    flex: 1, 
    flexDirection: 'row', 
    backgroundColor: '#FFF' 
  },

  contentArea: { 
    flex: 1, 
    backgroundColor: '#F8FAFC', 
    position: 'relative' 
  },

  floatingExpandBtn: {
    position: 'absolute',
    top: 380, 
    left: -13, 
    zIndex: 999,
    width: 25,
    height: 25,
    backgroundColor: '#10B981',
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
  }
});