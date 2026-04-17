import { useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Global access variables
export let setId = null;
export let firstName = null;
export let middleName = null;
export let lastName = null;

import { NGROK_URL } from "../../ngrok_camera";

// Compact Custom Alert Component
const CustomAlert = ({ visible, title, message, type, onClose, autoClose = false }) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      if (autoClose) {
        setTimeout(() => {
          handleClose();
        }, 2000);
      }
    } else {
      translateY.setValue(-100);
      opacity.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const getIconConfig = () => {
    switch (type) {
      case 'success':
        return { name: 'check-circle', color: '#52b788', bgColor: '#e8f5ed' };
      case 'error':
        return { name: 'close-circle', color: '#ff8a8a', bgColor: '#ffe8e8' };
      case 'warning':
        return { name: 'alert', color: '#f4a261', bgColor: '#fff3e8' };
      default:
        return { name: 'information', color: '#74c69d', bgColor: '#f0f7f4' };
    }
  };

  const iconConfig = getIconConfig();

  return (
    <Modal transparent visible={visible} animationType="none">
      <View style={styles.alertOverlay}>
        <Animated.View 
          style={[
            styles.alertContainer,
            {
              transform: [{ translateY }],
              opacity: opacity,
            }
          ]}
        >
          <View style={styles.alertContent}>
            <View style={[styles.alertIconCircle, { backgroundColor: iconConfig.bgColor }]}>
              <Icon name={iconConfig.name} size={24} color={iconConfig.color} />
            </View>
            <View style={styles.alertTextContainer}>
              <Text style={styles.alertTitle}>{title}</Text>
              <Text style={styles.alertMessage}>{message}</Text>
            </View>
            {!autoClose && (
              <TouchableOpacity 
                style={[styles.alertButton, { backgroundColor: iconConfig.color }]}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Text style={styles.alertButtonText}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Separate Login Form Component to prevent re-renders
const LoginForm = memo(({ 
  email, 
  setEmail, 
  password, 
  setPassword, 
  isLoading, 
  handleLogin, 
  handleBackToLanding,
  isLargeScreen 
}) => {
  const [focusedField, setFocusedField] = useState(null);

  return (
    <View style={[styles.mainCanvas, { maxWidth: isLargeScreen ? 1050 : 450 }]}>
      {isLargeScreen && (
        <View style={styles.glassVisualPanel}>
          <View style={styles.brandContainer}>
            <View style={styles.glassIcon}>
              <Icon name="seed-outline" size={36} color="#409167" />
            </View>
            <Text style={styles.brandName}>Piquillo<Text style={{fontWeight: '300'}}>MS</Text></Text>
            <Text style={styles.brandDesc}>Piquillo Monitoring System - Secure Operator Access</Text>
          </View>
          <View style={styles.dataGraphic}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={[styles.nodeLine, { width: `${100 - i * 20}%` }]} />
            ))}
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>AWAITING AUTHENTICATION</Text>
          </View>
        </View>
      )}

      <View style={styles.formPanel}>
        <TouchableOpacity onPress={handleBackToLanding} style={styles.backBtn}>
          <Icon name="arrow-left" size={18} color="#64748b" />
          <Text style={styles.backText}>SYSTEM OVERVIEW</Text>
        </TouchableOpacity>

        <View style={styles.formInner}>
          <Text style={styles.welcomeText}>Operator Login</Text>
          <Text style={styles.subText}>Secure access to node telemetry.</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>OPERATOR IDENTITY</Text>
            <View style={[styles.inputBox, focusedField === 'email' && styles.inputActive]}>
              <Icon name="account-outline" size={20} color={focusedField === 'email' ? "#52b788" : "#94a3b8"} />
              <TextInput 
                style={styles.textInput} 
                placeholder="email@piquillo.com" 
                value={email} 
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                placeholderTextColor="#cbd5e1"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ACCESS KEY</Text>
            <View style={[styles.inputBox, focusedField === 'pass' && styles.inputActive]}>
              <Icon name="shield-lock-outline" size={20} color={focusedField === 'pass' ? "#52b788" : "#94a3b8"} />
              <TextInput 
                style={styles.textInput} 
                placeholder="••••••••" 
                secureTextEntry 
                value={password} 
                onChangeText={setPassword}
                onFocus={() => setFocusedField('pass')}
                onBlur={() => setFocusedField(null)}
                placeholderTextColor="#cbd5e1"
              />
            </View>
            <View style={styles.forgotContainer}>
              <TouchableOpacity>
                <Text style={styles.forgot}>FORGOT?</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.primaryBtn} 
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.btnText}>SIGN IN</Text>
                <Icon name="chevron-right" size={20} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Icon name="check-decagram-outline" size={14} color="#94a3b8" />
            <Text style={styles.footerText}>ENCRYPTED CONNECTION ACTIVE</Text>
          </View>
        </View>
      </View>
    </View>
  );
});

const GreenhouseLanding = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({
    title: '',
    message: '',
    type: 'info',
    autoClose: false
  });

  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 850;
  
  // Animation values
  const landingFadeAnim = useRef(new Animated.Value(1)).current;
  const loginFadeAnim = useRef(new Animated.Value(0)).current;
  const loginScaleAnim = useRef(new Animated.Value(0.95)).current;

  const router = useRouter();

  const showAlert = useCallback((title, message, type, autoClose = false) => {
    setAlertData({ title, message, type, autoClose });
    setAlertVisible(true);
  }, []);

  const hideAlert = useCallback(() => {
    setAlertVisible(false);
  }, []);

  const handleLogin = useCallback(async () => {
    if (!email || !password) {
      showAlert("Identity Required", "Enter operator credentials.", "warning");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${NGROK_URL}/api/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();

      if (response.status === 200) {
        // Check if user status is Active
        if (result.user.status === "Active") {
          // User is active - allow login
          setId = result.user.user_id;
          firstName = result.user.firstname;
          middleName = result.user.middlename;
          lastName = result.user.lastname;
          showAlert("✓ VERIFIED", "Login Successfully!", "success", true);
          // Navigate after alert auto-closes
          setTimeout(() => {
            router.replace('/(tabs)/designs/dashboard');
            setPassword('');
            setEmail('');
          }, 2000);
        } else if (result.user.status === "Inactive") {
          // Account is deactivated - show error
          showAlert("ACCOUNT DEACTIVATED", "Your account has been deactivated. Please contact administrator.", "error");
          setPassword('');
        } else {
          // Unknown status
          showAlert("ACCESS DENIED", "Unable to verify account status. Please contact support.", "error");
          setPassword('');
        }
      } else {
        showAlert("DENIED", "Invalid access key or email.", "error");
        setPassword('');
      }
    } catch (e) {
      showAlert("OFFLINE", "Portal unreachable. Check server connection.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [email, password, showAlert, router]);

  const handleEnterTerminal = useCallback(() => {
    Animated.parallel([
      Animated.timing(landingFadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(loginFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(loginScaleAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowLanding(false);
      setShowLogin(true);
    });
  }, [landingFadeAnim, loginFadeAnim, loginScaleAnim]);

  const handleBackToLanding = useCallback(() => {
    landingFadeAnim.setValue(0);
    loginFadeAnim.setValue(1);
    loginScaleAnim.setValue(1);
    
    Animated.parallel([
      Animated.timing(loginFadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(loginScaleAnim, {
        toValue: 0.95,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(landingFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowLogin(false);
      setShowLanding(true);
    });
  }, [landingFadeAnim, loginFadeAnim, loginScaleAnim]);

  // Landing Page Content Component
  const LandingContent = useCallback(() => (
    <Animated.View style={[styles.heroSection, { opacity: landingFadeAnim }]}>
      <View style={styles.tag}>
        <Text style={styles.tagText}>PREMIUM AGRI-TECH</Text>
      </View>
      <Text style={styles.heroTitle}>
        Piquillo<Text style={{ color: '#52b788' }}>MS</Text>
      </Text>
      <Text style={styles.heroSub}>
        Greenhouse Management System with IoT Integration and Cloud-Based Computing with 
        AI Powered Pest Detection and Plant Physical Appearance Monitoring
      </Text>

      <View style={styles.featureGrid}>
        <View style={styles.categoryBox}>
          <Icon name="thermometer" size={20} color="#52b788" />
          <Text style={styles.categoryTitle}>Climate</Text>
          <Text style={styles.categoryDesc}>Temp & Humidity</Text>
          <View style={styles.subFeatures}>
            <Text style={styles.subFeature}>• Temperature Sensor</Text>
            <Text style={styles.subFeature}>• Air Humidity</Text>
            <Text style={styles.subFeature}>• Auto Pump Control</Text>
          </View>
        </View>

        <View style={styles.categoryBox}>
          <Icon name="solar-power" size={20} color="#52b788" />
          <Text style={styles.categoryTitle}>Power System</Text>
          <Text style={styles.categoryDesc}>Solar & Battery</Text>
          <View style={styles.subFeatures}>
            <Text style={styles.subFeature}>• Solar Panel</Text>
            <Text style={styles.subFeature}>• Battery Backup</Text>
            <Text style={styles.subFeature}>• Inverter & Breakers</Text>
          </View>
        </View>

        <View style={styles.categoryBox}>
          <Icon name="water" size={20} color="#52b788" />
          <Text style={styles.categoryTitle}>Irrigation</Text>
          <Text style={styles.categoryDesc}>Water Control</Text>
          <View style={styles.subFeatures}>
            <Text style={styles.subFeature}>• Soil Humidity</Text>
            <Text style={styles.subFeature}>• Dual Water Pumps</Text>
            <Text style={styles.subFeature}>• Drum Insecticide Level</Text>
          </View>
        </View>

        <View style={styles.categoryBox}>
          <Icon name="leaf" size={20} color="#52b788" />
          <Text style={styles.categoryTitle}>Soil Health</Text>
          <Text style={styles.categoryDesc}>Nutrients</Text>
          <View style={styles.subFeatures}>
            <Text style={styles.subFeature}>• NPK Sensor</Text>
            <Text style={styles.subFeature}>• Soil Moisture</Text>
            <Text style={styles.subFeature}>• Nutrient Analysis</Text>
          </View>
        </View>

        <View style={styles.categoryBox}>
          <Icon name="cctv" size={20} color="#52b788" />
          <Text style={styles.categoryTitle}>Monitoring</Text>
          <Text style={styles.categoryDesc}>AI Vision</Text>
          <View style={styles.subFeatures}>
            <Text style={styles.subFeature}>• Pest Detection</Text>
            <Text style={styles.subFeature}>• Pepper Ripeness AI</Text>
            <Text style={styles.subFeature}>• Live Camera Feed</Text>
          </View>
        </View>

        <View style={styles.categoryBox}>
          <Icon name="chart-line" size={20} color="#52b788" />
          <Text style={styles.categoryTitle}>Analytics</Text>
          <Text style={styles.categoryDesc}>Reports</Text>
          <View style={styles.subFeatures}>
            <Text style={styles.subFeature}>• Sensor Logs</Text>
            <Text style={styles.subFeature}>• Crop Health Graph</Text>
            <Text style={styles.subFeature}>• Performance Trends</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.mainCta} 
        onPress={handleEnterTerminal}
        activeOpacity={0.8}
      >
        <Text style={styles.ctaText}>ENTER TERMINAL</Text>
        <Icon name="chevron-right" size={22} color="#fff" />
      </TouchableOpacity>
    </Animated.View>
  ), [landingFadeAnim, handleEnterTerminal]);

  return (
    <View style={styles.pageWrapper}>
      <View style={[styles.blurBlob, styles.blob1]} />
      <View style={[styles.blurBlob, styles.blob2]} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {showLanding && <LandingContent />}
          {showLogin && (
            <Animated.View 
              style={[
                styles.loginWrapper,
                {
                  opacity: loginFadeAnim,
                  transform: [{ scale: loginScaleAnim }]
                }
              ]}
            >
              <LoginForm 
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                isLoading={isLoading}
                handleLogin={handleLogin}
                handleBackToLanding={handleBackToLanding}
                isLargeScreen={isLargeScreen}
              />
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert 
        visible={alertVisible}
        title={alertData.title}
        message={alertData.message}
        type={alertData.type}
        onClose={hideAlert}
        autoClose={alertData.autoClose}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pageWrapper: { flex: 1, backgroundColor: '#f8fafc' },
  
  scrollContent: { 
    flexGrow: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 25,
  },
  
  loginWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  blurBlob: { position: 'absolute', borderRadius: 300, opacity: 0.6 },
  blob1: { top: -100, right: -50, backgroundColor: '#d8f3dc', width: 350, height: 350 },
  blob2: { bottom: -150, left: -50, backgroundColor: '#b7e4c7', width: 600, height: 600 },
  
  heroSection: { 
    alignItems: 'center', 
    maxWidth: 1100, 
    width: '100%',
    zIndex: 10,
  },
  tag: { backgroundColor: '#02442515', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, marginBottom: 10 },
  tagText: { color: '#0f172a', fontWeight: '800', fontSize: 9, letterSpacing: 1 },
  heroTitle: { fontSize: 44, fontWeight: '900', color: '#0f172a', textAlign: 'center', letterSpacing: -1.5 },
  heroSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 20, lineHeight: 20, maxWidth: 800 },
  
  featureGrid: { 
    flexDirection: 'row', 
    gap: 12, 
    marginVertical: 16, 
    flexWrap: 'wrap', 
    justifyContent: 'center',
    maxWidth: 1000
  },
  
  categoryBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    width: 260,
    minHeight: 150,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#e8f2ed',
  },
  
  categoryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 6,
    marginBottom: 2,
  },
  
  categoryDesc: {
    fontSize: 10,
    color: '#52b788',
    fontWeight: '600',
    marginBottom: 6,
  },
  
  subFeatures: {
    marginTop: 4,
    gap: 2,
  },
  
  subFeature: {
    fontSize: 9,
    color: '#64748b',
    lineHeight: 14,
  },
  
  mainCta: { 
    backgroundColor: '#1E293B', 
    paddingHorizontal: 32, 
    height: 48,
    borderRadius: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10, 
    elevation: 6, 
    marginTop: 16,
    marginBottom: 4,
  },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 },

  mainCanvas: { 
    flexDirection: 'row', 
    width: '100%', 
    backgroundColor: '#ffffff', 
    borderRadius: 50, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: '#e8f2ed',
    ...Platform.select({ web: { boxShadow: '0 40px 80px rgba(82, 183, 136, 0.08)' }, android: { elevation: 15 } })
  },
  
  glassVisualPanel: { 
    flex: 1, 
    padding: 60, 
    justifyContent: 'space-between', 
    backgroundColor: 'rgba(247, 252, 249, 0.5)', 
    borderRightWidth: 1.5, 
    borderRightColor: '#f0f7f4' 
  },
  
  brandContainer: { marginBottom: 16 },
  glassIcon: { 
    width: 65, 
    height: 65, 
    backgroundColor: '#fff', 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 25, 
    borderWidth: 1, 
    borderColor: '#e8f2ed' 
  },
  
  brandName: { fontSize: 36, fontWeight: '900', color: '#2d6a4f', letterSpacing: -1.5 },
  brandDesc: { fontSize: 15, color: '#74c69d', fontWeight: '500', marginTop: 10, lineHeight: 22 },
  
  dataGraphic: { gap: 8, marginVertical: 30 },
  nodeLine: { height: 4, backgroundColor: '#d8f3dc', borderRadius: 2 },
  
  statusPill: { 
    backgroundColor: '#fff', 
    paddingVertical: 10, 
    paddingHorizontal: 18, 
    borderRadius: 14, 
    alignSelf: 'flex-start', 
    borderWidth: 1, 
    borderColor: '#edf5f1' 
  },
  statusPillText: { fontSize: 10, fontWeight: '800', color: '#409167', letterSpacing: 1 },
  
  formPanel: { flex: 1.2, padding: 50, backgroundColor: '#fff' },
  formInner: { width: '100%', maxWidth: 380, alignSelf: 'center' },
  
  backBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backText: { color: '#64748b', fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },
  
  welcomeText: { fontSize: 32, fontWeight: '900', color: '#2d6a4f' },
  subText: { fontSize: 15, color: '#94a3b8', marginBottom: 40, marginTop: 5, fontWeight: '500' },
  
  inputGroup: { 
    marginBottom: 25,
    width: '100%',
  },
  label: { 
    fontSize: 10, 
    fontWeight: '900', 
    color: '#b7e4c7', 
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  forgotContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
    width: '100%',
  },
  forgot: { 
    fontSize: 10, 
    fontWeight: '800', 
    color: '#52b788',
  },
  
  inputBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fbfdfc', 
    borderRadius: 20, 
    height: 62, 
    paddingHorizontal: 22, 
    borderWidth: 1.5, 
    borderColor: '#f0f7f4',
    width: '100%',
  },
  inputActive: { borderColor: '#b7e4c7', backgroundColor: '#fff' },
  textInput: { 
    flex: 1, 
    marginLeft: 15, 
    fontSize: 16, 
    color: '#2d6a4f', 
    fontWeight: '600',
    ...Platform.select({ web: { outlineStyle: 'none' } })
  },
  
  primaryBtn: { 
    backgroundColor: '#1E293B', 
    height: 62, 
    borderRadius: 20, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 10,
    width: '100%',
  },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  
  footer: { 
    marginTop: 40, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8,
    width: '100%',
  },
  footerText: { color: '#cbd5e1', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },

  // Compact Alert Styles
  alertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  alertContainer: {
    width: '90%',
    maxWidth: 350,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  alertIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertTextContainer: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#2d6a4f',
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  alertButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});

export default GreenhouseLanding;