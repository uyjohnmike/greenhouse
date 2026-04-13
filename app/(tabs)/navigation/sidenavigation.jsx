import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react'; // Added useEffect
import { Animated, StyleSheet, TouchableOpacity, View, useWindowDimensions } from 'react-native'; // Added useWindowDimensions
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserNavigation } from '../UserNavigationContext';

const SideNavigation = ({ animatedValue }) => {
  const router = useRouter();
  const { width } = useWindowDimensions(); // Get current window width
  const { activeTab, setActiveTab } = useUserNavigation();
  const [hoveredItem, setHoveredItem] = useState(null);

  // --- AUTO COLLAPSE LOGIC ---
  useEffect(() => {
    // Threshold: 1000 pixels (standard for tablets/small desktops)
    const shouldCollapse = width < 1000; 
    
    Animated.timing(animatedValue, {
      toValue: shouldCollapse ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [width]); // Re-runs whenever the window is resized
  // ---------------------------

  const contentOpacity = animatedValue.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0, 0, 1],
  });

  const menuItems = [
    { label: 'Dashboard', icon: 'view-grid-outline', path: '../designs/dashboard' },
    { label: 'Sensors', icon: 'molecule', path: '../designs/sensors' },
    { label: 'Plants', icon: 'sprout-outline', path: '../designs/plants' },
    { label: 'Reports', icon: 'chart-box-outline', path: '../designs/reports' },
    { label: 'Temperature', icon: 'thermometer', path: '../designs/tempdesign' },
    { label: 'Profile', icon: 'account-circle-outline', path: '../designs/profile' },
  ];

  const handleNavigation = (item) => {
    setActiveTab(item.label);
    router.push(item.path);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.logoBox}>
          <Icon name="leaf" size={20} color="#FFF" />
        </View>
        <Animated.Text style={[styles.logoText, { opacity: contentOpacity }]}>GREENHOUSE</Animated.Text>
      </View>

      <View style={styles.navSection}>
        {menuItems.map((item) => {
          const isActive = activeTab === item.label;
          const isHovered = hoveredItem === item.label;

          return (
            <TouchableOpacity
              key={item.label}
              onPress={() => handleNavigation(item)}
              onMouseEnter={() => setHoveredItem(item.label)}
              onMouseLeave={() => setHoveredItem(null)}
              activeOpacity={0.7}
              style={[
                styles.navItem,
                isActive && styles.activeItem,
                !isActive && isHovered && styles.hoverItem
              ]}>

              <View style={styles.iconContainer}>
                <Icon name={isActive ? item.icon.replace('-outline', '') : item.icon} size={22} color={isActive ? '#10B981' : '#94A3B8'}/>
              </View>

              <Animated.Text numberOfLines={1} 
                style={[styles.navText, isActive && styles.activeText, { opacity: contentOpacity }]}>
                {item.label}
              </Animated.Text>
                    
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => router.replace('/(tabs)')}>
          <View style={styles.iconContainer}>
            <Icon name="logout-variant" size={22} color="#F87171" />
          </View>
          <Animated.Text style={[styles.logoutText, { opacity: contentOpacity }]}>
            Logout
          </Animated.Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 32,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 48,
  },
  logoBox: {
    width: 36,
    height: 36,
    backgroundColor: '#10B981',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginLeft: 14,
    letterSpacing: 1,
  },
  navSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
    position: 'relative',
  },
  activeItem: {
    backgroundColor: '#F0FDF4',
  },
  hoverItem: {
    backgroundColor: '#F8FAFC',
  },
  iconContainer: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 8,
  },
  activeText: {
    color: '#059669',
  },
  activeIndicator: {
    position: 'absolute',
    left: -16,
    width: 4,
    height: 20,
    backgroundColor: '#10B981',
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
  },
  logoutText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
});

export default SideNavigation;