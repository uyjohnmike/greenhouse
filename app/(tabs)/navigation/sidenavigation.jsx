import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NGROK_URL } from "../../../ngrok_camera";
import { useUserNavigation } from '../UserNavigationContext';

const SideNavigation = ({ animatedValue }) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { activeTab, setActiveTab } = useUserNavigation();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  // State for notification badge
  const [notificationCount, setNotificationCount] = useState(0);
  
  // State to track if sidebar is collapsed
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Helper function to check if a date is today
  const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Fetch Sensor Logs and Pest Logs to check for today's logs
  const fetchTodayLogs = async () => {
    try {
      const today = new Date();
      const todayStr = formatDateKey(today);
      let totalNewLogs = 0;

      // Fetch Sensor Logs
      try {
        const sensorResponse = await fetch(`${NGROK_URL}/api/getallsensorlogs`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        const sensorData = await sensorResponse.json();
        
        // Count today's sensor logs
        const todaySensorLogs = sensorData.filter(log => {
          const logDate = new Date(log.created_at);
          return formatDateKey(logDate) === todayStr;
        });
        totalNewLogs += todaySensorLogs.length;
      } catch (e) {
        console.error("Sensor Logs Fetch Error:", e);
      }

      // Fetch Pest Logs
      try {
        const pestResponse = await fetch(`${NGROK_URL}/api/getallpestlogs`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        const pestData = await pestResponse.json();
        
        // Count today's pest logs
        const todayPestLogs = pestData.filter(log => {
          const logDate = new Date(log.created_at);
          return formatDateKey(logDate) === todayStr;
        });
        totalNewLogs += todayPestLogs.length;
      } catch (e) {
        console.error("Pest Logs Fetch Error:", e);
      }

      setNotificationCount(totalNewLogs);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  // Fetch logs when component mounts
  useEffect(() => {
    fetchTodayLogs();
    
    // Optional: Refresh every 30 seconds to check for new logs
    const interval = setInterval(() => {
      fetchTodayLogs();
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // --- AUTO COLLAPSE LOGIC ---
  useEffect(() => {
    const shouldCollapse = width < 1000; 
    setIsCollapsed(shouldCollapse);
    
    Animated.timing(animatedValue, {
      toValue: shouldCollapse ? 0 : 1,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [width]);

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
    
    // Reset notification count when navigating to Reports
    if (item.label === 'Reports') {
      setNotificationCount(0);
    }
  };

  const handleLogout = () => {
    setShowLogoutModal(false);
    
    // Reset active tab to Dashboard
    setActiveTab('Dashboard');
    
    // Clear any user data/storage if needed
    // Example: AsyncStorage.removeItem('userToken');
    // Example: AsyncStorage.removeItem('userData');
    
    // Replace the entire navigation history with the login page
    router.replace('/(tabs)');
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <>
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
            const showBadge = item.label === 'Reports' && notificationCount > 0;

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
                  <Icon 
                    name={isActive ? item.icon.replace('-outline', '') : item.icon} 
                    size={22} 
                    color={isActive ? '#10B981' : '#94A3B8'}
                  />
                  {/* Badge on Icon when collapsed */}
                  {showBadge && isCollapsed && (
                    <View style={styles.badgeOnIcon}>
                      <Text style={styles.badgeText}>
                        {notificationCount > 99 ? '99+' : notificationCount}
                      </Text>
                    </View>
                  )}
                </View>

                <Animated.Text 
                  numberOfLines={1} 
                  style={[
                    styles.navText, 
                    isActive && styles.activeText, 
                    { opacity: contentOpacity }
                  ]}
                >
                  {item.label}
                </Animated.Text>

                {/* Badge on Text when expanded */}
                {showBadge && !isCollapsed && (
                  <View style={styles.badgeOnText}>
                    <Text style={styles.badgeText}>
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Text>
                  </View>
                )}
                      
                {isActive && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={() => setShowLogoutModal(true)}
          >
            <View style={styles.iconContainer}>
              <Icon name="logout-variant" size={22} color="#F87171" />
            </View>
            <Animated.Text style={[styles.logoutText, { opacity: contentOpacity }]}>
              Logout
            </Animated.Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Beautiful Logout Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showLogoutModal}
        onRequestClose={handleCancelLogout}
      >
        <Pressable style={styles.modalOverlay} onPress={handleCancelLogout}>
          <View style={styles.modalContainer}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              {/* Animated Icon */}
              <View style={styles.modalIconContainer}>
                <View style={styles.iconCircle}>
                  <Icon name="logout-variant" size={50} color="#F87171" />
                </View>
              </View>

              {/* Title */}
              <Text style={styles.modalTitle}>Logout Confirmation</Text>
              
              {/* Message */}
              <Text style={styles.modalMessage}>
                Are you sure you want to logout from your account? You will need to login again to access your dashboard.
              </Text>

              {/* Buttons */}
              <View style={styles.modalButtons}>
                <Pressable 
                  style={({ pressed }) => [
                    styles.modalButton,
                    styles.cancelButton,
                    pressed && styles.buttonPressed
                  ]} 
                  onPress={handleCancelLogout}
                >
                  <Icon name="close" size={20} color="#64748B" />
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>

                <Pressable 
                  style={({ pressed }) => [
                    styles.modalButton,
                    styles.confirmButton,
                    pressed && styles.buttonPressed
                  ]} 
                  onPress={handleLogout}
                >
                  <Icon name="check" size={20} color="#FFF" />
                  <Text style={styles.confirmButtonText}>Yes, Logout</Text>
                </Pressable>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </>
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
    position: 'relative',
  },
  navText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 8,
  },
  activeText: {
    color: '#059669',
    fontWeight: '700',
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
  
  // Badge on Icon (when sidebar is collapsed - showing only icons)
  badgeOnIcon: {
    position: 'absolute',
    top: -8,
    right: 10,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  // Badge on Text (when sidebar is expanded - showing icons + text)
  badgeOnText: {
    position: 'absolute',
    top: -2,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    marginBottom: 20,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FECACA',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  confirmButton: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});

export default SideNavigation;