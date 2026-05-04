import { useRouter } from "expo-router";
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
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

export let setId = null;
export let firstName = null;
export let middleName = null;
export let lastName = null;

import { NGROK_URL } from "../../ngrok_camera";

const PhoneMockup = ({ imageSource, rotation, offsetX, offsetY }) => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  
  const getPhoneSize = () => {
    if (width < 480) return { width: 120, height: 240 };
    if (width < 768) return { width: 140, height: 280 };
    return { width: 170, height: 340 };
  };
  
  const phoneSize = getPhoneSize();
  
  return (
    <View style={[styles.phoneWrapper, { 
      transform: [{ rotate: rotation }], 
      right: isSmallScreen ? offsetX * 0.5 : offsetX, 
      top: isSmallScreen ? offsetY * 0.5 : offsetY,
      width: phoneSize.width,
      height: phoneSize.height,
      marginRight: isSmallScreen ? 60 : 120,
      marginTop: isSmallScreen ? 5 : 10,
    }]}>
      <View style={[styles.phoneFrame, { borderRadius: isSmallScreen ? 20 : 28 }]}>
        <View style={[styles.phoneNotch, { width: isSmallScreen ? 50 : 80, transform: [{ translateX: isSmallScreen ? -25 : -40 }] }]} />
        <Image
          source={imageSource}
          style={styles.phoneImage}
          resizeMode="cover"
        />
        <View style={[styles.phoneHomeBar, { width: isSmallScreen ? 50 : 76, transform: [{ translateX: isSmallScreen ? -25 : -38 }] }]} />
      </View>
    </View>
  );
};

const PhoneMockups = () => {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 768;
  const isVerySmallScreen = width < 480;
  
  return (
    <View style={styles.phoneMockupsContainer}>
      <View style={[styles.phonesWrapper, { height: isSmallScreen ? 250 : 360 }]}>
        <PhoneMockup
          imageSource={require('../../appimages/dashboardapp.jpg')}
          rotation={isVerySmallScreen ? "8deg" : "15deg"}
          offsetX={isVerySmallScreen ? -30 : -60}
          offsetY={isVerySmallScreen ? -5 : -10}
        />
        <PhoneMockup
          imageSource={require('../../appimages/image2.jpg')}
          rotation={isVerySmallScreen ? "-8deg" : "-15deg"}
          offsetX={isVerySmallScreen ? 30 : 60}
          offsetY={isVerySmallScreen ? -5 : -10}
        />
        <PhoneMockup
          imageSource={require('../../appimages/image1.jpg')}
          rotation="0deg"
          offsetX={0}
          offsetY={0}
        />
      </View>

      <View style={[styles.phoneBottomSection, { marginLeft: isSmallScreen ? 20 : 100 }]}>
        <View style={[styles.statsGrid, { gap: isSmallScreen ? 6 : 10, marginTop: isSmallScreen ? 60 : 0, }]}>
          <View style={[styles.statCard, { padding: isSmallScreen ? 6 : 10, maxWidth: isSmallScreen ? 100 : 130 }]}>
            <View style={[styles.statIconBox, { width: isSmallScreen ? 28 : 36, height: isSmallScreen ? 28 : 36 }]}>
              <Icon name="clock-outline" size={isSmallScreen ? 16 : 20} color="#52b788" />
            </View>
            <Text style={[styles.statValue, { fontSize: isSmallScreen ? 9 : 11 }]}>7AM to 5PM</Text>
            <Text style={[styles.statName, { fontSize: isSmallScreen ? 8 : 10 }]}>Monitoring</Text>
          </View>

          <View style={[styles.statCard, { padding: isSmallScreen ? 6 : 10, maxWidth: isSmallScreen ? 100 : 130 }]}>
            <View style={[styles.statIconBox, { width: isSmallScreen ? 28 : 36, height: isSmallScreen ? 28 : 36 }]}>
              <Icon name="bug-outline" size={isSmallScreen ? 16 : 20} color="#52b788" />
            </View>
            <Text style={[styles.statValue, { fontSize: isSmallScreen ? 9 : 11 }]}>AI</Text>
            <Text style={[styles.statName, { fontSize: isSmallScreen ? 8 : 10 }]}>Pest Detection</Text>
          </View>

          <View style={[styles.statCard, { padding: isSmallScreen ? 6 : 10, maxWidth: isSmallScreen ? 100 : 130 }]}>
            <View style={[styles.statIconBox, { width: isSmallScreen ? 28 : 36, height: isSmallScreen ? 28 : 36 }]}>
              <Icon name="wifi-strength-4" size={isSmallScreen ? 16 : 20} color="#52b788" />
            </View>
            <Text style={[styles.statValue, { fontSize: isSmallScreen ? 9 : 11 }]}>IoT</Text>
            <Text style={[styles.statName, { fontSize: isSmallScreen ? 8 : 10 }]}>Sensors</Text>
          </View>
        </View>

        <View style={[styles.bottomDivider, { marginVertical: isSmallScreen ? 6 : 10 }]} />

        <View style={[styles.trustSection, { gap: isSmallScreen ? 6 : 12 }]}>
          <View style={[styles.trustBadge, { paddingHorizontal: isSmallScreen ? 8 : 12, paddingVertical: isSmallScreen ? 4 : 6 }]}>
            <Icon name="check-circle" size={isSmallScreen ? 8 : 12} color="#52b788" />
            <Text style={[styles.trustText, { fontSize: isSmallScreen ? 7 : 9 }]}>100% Cloud Native</Text>
          </View>
          <View style={[styles.trustBadge, { paddingHorizontal: isSmallScreen ? 8 : 12, paddingVertical: isSmallScreen ? 4 : 6 }]}>
            <Icon name="check-circle" size={isSmallScreen ? 8 : 12} color="#52b788" />
            <Text style={[styles.trustText, { fontSize: isSmallScreen ? 7 : 9 }]}>Enterprise Grade</Text>
          </View>
          <View style={[styles.trustBadge, { paddingHorizontal: isSmallScreen ? 8 : 12, paddingVertical: isSmallScreen ? 4 : 6 }]}>
            <Icon name="check-circle" size={isSmallScreen ? 8 : 12} color="#52b788" />
            <Text style={[styles.trustText, { fontSize: isSmallScreen ? 7 : 9 }]}>Zero Downtime</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

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
  const [showStructure, setShowStructure] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({
    title: '',
    message: '',
    type: 'info',
    autoClose: false
  });

  const { width, height } = useWindowDimensions();
  const isLargeScreen = width >= 850;
  const isSmallScreen = width < 768;
  const isVerySmallScreen = width < 480;
  const isCompactScreen = height <= 700;

  const landingFadeAnim = useRef(new Animated.Value(1)).current;
  const loginFadeAnim = useRef(new Animated.Value(0)).current;
  const loginScaleAnim = useRef(new Animated.Value(0.95)).current;
  const structureFadeAnim = useRef(new Animated.Value(0)).current;
  const structureScaleAnim = useRef(new Animated.Value(0.95)).current;

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
        if (result.user.status === "Active") {
          setId = result.user.user_id;
          firstName = result.user.firstname;
          middleName = result.user.middlename;
          lastName = result.user.lastname;
          showAlert("✓ VERIFIED", "Login Successfully!", "success", true);
          setTimeout(() => {
            router.replace('/(tabs)/designs/dashboard');
            setPassword('');
            setEmail('');
          }, 2000);
        } else if (result.user.status === "Inactive") {
          showAlert("ACCOUNT DEACTIVATED", "Your account has been deactivated. Please contact administrator.", "error");
          setPassword('');
        } else {
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
      setShowStructure(false);
    });
  }, [landingFadeAnim, loginFadeAnim, loginScaleAnim]);

  const handleShowStructure = useCallback(() => {
    Animated.parallel([
      Animated.timing(landingFadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(structureFadeAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(structureScaleAnim, {
        toValue: 1,
        duration: 500,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowLanding(false);
      setShowStructure(true);
      setShowLogin(false);
    });
  }, [landingFadeAnim, structureFadeAnim, structureScaleAnim]);

  const handleBackToLanding = useCallback(() => {
    landingFadeAnim.setValue(0);
    loginFadeAnim.setValue(1);
    loginScaleAnim.setValue(1);
    structureFadeAnim.setValue(1);
    structureScaleAnim.setValue(1);
    
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
      Animated.timing(structureFadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(structureScaleAnim, {
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
      setShowStructure(false);
      setShowLanding(true);
    });
  }, [landingFadeAnim, loginFadeAnim, loginScaleAnim, structureFadeAnim, structureScaleAnim]);

  const features = [
    { icon: "thermometer", title: "Climate", desc: "Temp & Humidity", items: ["Temperature Sensor", "Air Humidity", "Auto Pump Control"] },
    { icon: "solar-power", title: "Power System", desc: "Solar & Battery", items: ["Solar Panel", "Battery Backup", "Inverter & Breakers"] },
    { icon: "water", title: "Irrigation", desc: "Water Control", items: ["Soil Humidity", "Dual Water Pumps", "Drum Insecticide Level"] },
    { icon: "leaf", title: "Soil Health", desc: "Nutrients", items: ["NPK Sensor", "Soil Moisture", "Nutrient Analysis"] },
    { icon: "cctv", title: "Monitoring", desc: "AI Vision", items: ["Pest Detection", "Pepper Ripeness AI", "Live Camera Feed"] },
    { icon: "chart-line", title: "Analytics", desc: "Reports", items: ["Sensor Logs", "Crop Health Graph", "Performance Trends"] }
  ];

  const rows = [];
  for (let i = 0; i < features.length; i += 3) {
    rows.push(features.slice(i, i + 3));
  }

  const LandingContent = useCallback(() => (
    <Animated.View style={[styles.heroSection, { 
      opacity: landingFadeAnim,
      flexDirection: isSmallScreen ? 'column' : 'row',
      gap: isSmallScreen ? 20 : 30,
    }]}>
      <View style={[styles.heroContent, { paddingVertical: isSmallScreen ? 10 : 20 }]}>
        <View style={styles.tag}>
          <Text style={[styles.tagText, { fontSize: isSmallScreen ? 7 : 9 }]}>PREMIUM AGRI-TECH</Text>
        </View>
        <Text style={[styles.heroTitle, { fontSize: isSmallScreen ? 32 : 44 }]}>
          Piquillo<Text style={{ color: '#52b788' }}>MS</Text>
        </Text>
        <Text style={[styles.heroSub, { fontSize: isSmallScreen ? 11 : 13, maxWidth: isSmallScreen ? '100%' : 520 }]}>
          Greenhouse Management System with IoT Integration and Cloud-Based Computing with AI-Based 
          Pest Detection and Piquillo Pepper Ripeness Classification
        </Text>

        <View style={styles.featureGrid}>
          {rows.map((row, rowIndex) => (
            <View key={rowIndex} style={[styles.featureRow, { gap: isSmallScreen ? 10 : 14, marginBottom: isSmallScreen ? 10 : 14 }]}>
              {row.map((feature, colIndex) => (
                <View key={colIndex} style={[styles.categoryBox, { 
                  width: isSmallScreen ? '100%' : 180,
                  minWidth: isSmallScreen ? 'auto' : 160,
                  padding: isSmallScreen ? 10 : 12,
                  minHeight: isSmallScreen ? 'auto' : 150,
                }]}>
                  <Icon name={feature.icon} size={isSmallScreen ? 18 : 22} color="#52b788" />
                  <Text style={[styles.categoryTitle, { fontSize: isSmallScreen ? 12 : 14 }]}>{feature.title}</Text>
                  <Text style={[styles.categoryDesc, { fontSize: isSmallScreen ? 8 : 9 }]}>{feature.desc}</Text>
                  <View style={styles.subFeatures}>
                    {feature.items.map((item, idx) => (
                      <Text key={idx} style={[styles.subFeature, { fontSize: isSmallScreen ? 8 : 9 }]}>• {item}</Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={[styles.buttonGroup, { gap: isSmallScreen ? 10 : 12 }]}>
          <TouchableOpacity 
            style={[styles.mainCta, { paddingHorizontal: isSmallScreen ? 20 : 28, height: isSmallScreen ? 42 : 46 }]} 
            onPress={handleEnterTerminal}
            activeOpacity={0.8}
          >
            <Text style={[styles.ctaText, { fontSize: isSmallScreen ? 11 : 13 }]}>ENTER TERMINAL</Text>
            <Icon name="chevron-right" size={isSmallScreen ? 16 : 18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.structureBtn, { paddingHorizontal: isSmallScreen ? 16 : 22, height: isSmallScreen ? 42 : 46 }]} 
            onPress={handleShowStructure}
            activeOpacity={0.8}
          >
            <Icon name="floor-plan" size={isSmallScreen ? 16 : 18} color="#fff" />
            <Text style={[styles.structureBtnText, { fontSize: isSmallScreen ? 10 : 12 }]}>STRUCTURAL DESIGN</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!isVerySmallScreen && (
        <View style={[styles.phoneSideContainer, { minHeight: isSmallScreen ? 400 : 500 }]}>
          <PhoneMockups />
        </View>
      )}
    </Animated.View>
  ), [landingFadeAnim, handleEnterTerminal, handleShowStructure, isSmallScreen, isVerySmallScreen]);

  const StructureContent = useCallback(() => (
    <Animated.View 
      style={[
        styles.structureContainer,
        {
          opacity: structureFadeAnim,
          transform: [{ scale: structureScaleAnim }]
        }
      ]}
    >
      <View style={[styles.structureCard, isCompactScreen && styles.structureCardCompact, { 
        padding: isSmallScreen ? 16 : 28,
        margin: isSmallScreen ? 10 : 0,
      }]}>
        <TouchableOpacity onPress={handleBackToLanding} style={styles.backBtnStructure}>
          <Icon name="arrow-left" size={16} color="#64748b" />
          <Text style={[styles.backTextStructure, { fontSize: isSmallScreen ? 10 : 11 }]}>BACK TO OVERVIEW</Text>
        </TouchableOpacity>
        
        <View style={styles.structureHeader}>
          <Icon name="floor-plan" size={isSmallScreen ? 24 : 28} color="#52b788" />
          <Text style={[styles.structureTitle, isCompactScreen && styles.structureTitleCompact, { fontSize: isSmallScreen ? 24 : 28 }]}>Structural Design</Text>
          <Text style={[styles.structureSubtitle, isCompactScreen && styles.structureSubtitleCompact, { fontSize: isSmallScreen ? 10 : 12 }]}>Greenhouse Architecture & Material Specifications</Text>
        </View>
        
        <View style={[styles.structureImageContainer, isCompactScreen && styles.structureImageContainerCompact, { padding: isSmallScreen ? 10 : 16 }]}>
          <Image 
            source={require('../../appimages/structure.jpg')}
            style={[styles.structureImage, isCompactScreen && styles.structureImageCompact, { height: isSmallScreen ? 220 : 350 }]}
            resizeMode="contain"
          />
        </View>
        
        <View style={[styles.materialsSection, isCompactScreen && styles.materialsSectionCompact]}>
          <Text style={[styles.materialsTitle, isCompactScreen && styles.materialsTitleCompact, { fontSize: isSmallScreen ? 13 : 16 }]}>Construction Materials</Text>
          <View style={[styles.materialsGrid, isCompactScreen && styles.materialsGridCompact, { gap: isSmallScreen ? 8 : 14 }]}>
            <View style={[styles.materialItem, isCompactScreen && styles.materialItemCompact, { 
              minWidth: isSmallScreen ? 110 : 140,
              paddingHorizontal: isSmallScreen ? 10 : 18,
              paddingVertical: isSmallScreen ? 8 : 12,
            }]}>
              <Icon name="cube" size={isSmallScreen ? 16 : 20} color="#8B5A2B" />
              <Text style={[styles.materialName, isCompactScreen && styles.materialNameCompact, { fontSize: isSmallScreen ? 10 : 12 }]}>Wood Frame</Text>
              <Text style={[styles.materialDesc, isCompactScreen && styles.materialDescCompact, { fontSize: isSmallScreen ? 7 : 9 }]}>Premium treated lumber</Text>
            </View>
            <View style={[styles.materialItem, isCompactScreen && styles.materialItemCompact, { 
              minWidth: isSmallScreen ? 110 : 140,
              paddingHorizontal: isSmallScreen ? 10 : 18,
              paddingVertical: isSmallScreen ? 8 : 12,
            }]}>
              <Icon name="sun-wireless" size={isSmallScreen ? 16 : 20} color="#52b788" />
              <Text style={[styles.materialName, isCompactScreen && styles.materialNameCompact, { fontSize: isSmallScreen ? 10 : 12 }]}>UV Plastic</Text>
              <Text style={[styles.materialDesc, isCompactScreen && styles.materialDescCompact, { fontSize: isSmallScreen ? 7 : 9 }]}>UV-protected polycarbonate</Text>
            </View>
            <View style={[styles.materialItem, isCompactScreen && styles.materialItemCompact, { 
              minWidth: isSmallScreen ? 110 : 140,
              paddingHorizontal: isSmallScreen ? 10 : 18,
              paddingVertical: isSmallScreen ? 8 : 12,
            }]}>
              <Icon name="fan" size={isSmallScreen ? 16 : 20} color="#4A90D9" />
              <Text style={[styles.materialName, isCompactScreen && styles.materialNameCompact, { fontSize: isSmallScreen ? 10 : 12 }]}>Open Net Sides</Text>
              <Text style={[styles.materialDesc, isCompactScreen && styles.materialDescCompact, { fontSize: isSmallScreen ? 7 : 9 }]}>Ventilation & airflow</Text>
            </View>
            <View style={[styles.materialItem, isCompactScreen && styles.materialItemCompact, { 
              minWidth: isSmallScreen ? 110 : 140,
              paddingHorizontal: isSmallScreen ? 10 : 18,
              paddingVertical: isSmallScreen ? 8 : 12,
            }]}>
              <Icon name="home-variant-outline" size={isSmallScreen ? 16 : 20} color="#3498db" />
              <Text style={[styles.materialName, isCompactScreen && styles.materialNameCompact, { fontSize: isSmallScreen ? 10 : 12 }]}>Dimensional</Text>
              <Text style={[styles.materialDesc, isCompactScreen && styles.materialDescCompact, { fontSize: isSmallScreen ? 7 : 9 }]}>548 cm / 243 cm / 243 cm</Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  ), [structureFadeAnim, structureScaleAnim, handleBackToLanding, isCompactScreen, isSmallScreen]);

  return (
    <View style={styles.pageWrapper}>
      <View style={[styles.blurBlob, styles.blob1]} />
      <View style={[styles.blurBlob, styles.blob2]} />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={[styles.scrollContent, { padding: isSmallScreen ? 10 : 20 }]} showsVerticalScrollIndicator={false}>
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
                setPassword={setPassword}
                password={password}
                isLoading={isLoading}
                handleLogin={handleLogin}
                handleBackToLanding={handleBackToLanding}
                isLargeScreen={isLargeScreen}
              />
            </Animated.View>
          )}
          {showStructure && <StructureContent />}
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
  },
  
  loginWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  blurBlob: { position: 'absolute', borderRadius: 300, opacity: 0.5 },
  blob1: { top: -150, right: -80, backgroundColor: '#d8f3dc', width: 280, height: 280 },
  blob2: { bottom: -180, left: -80, backgroundColor: '#b7e4c7', width: 450, height: 450 },
  
  heroSection: {
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1300,
    width: '100%',
    zIndex: 10,
  },
  
  heroContent: {
    flex: 1,
    alignItems: 'center',
  },
  
  phoneSideContainer: {
    flex: 0.9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  tag: { backgroundColor: '#52b78818', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#d8f3dc' },
  tagText: { color: '#2d6a4f', fontWeight: '800', letterSpacing: 1.2 },
  heroTitle: { fontWeight: '900', color: '#0f172a', textAlign: 'center', letterSpacing: -1, marginBottom: 8 },
  heroSub: { color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 20, lineHeight: 20, paddingVertical: 0 },
  
  featureGrid: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 20,
  },
  
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    flexWrap: 'wrap',
  },
  
  categoryBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    flex: 1,
    maxWidth: 190,
    elevation: 2,
    shadowColor: '#52b788',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#d8f3dc',
    borderTopWidth: 3,
    borderTopColor: '#52b788',
    position: 'relative',
    overflow: 'hidden',
  },
  
  categoryTitle: {
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
    marginBottom: 2,
  },

  categoryDesc: {
    color: '#52b788',
    fontWeight: '600',
    marginBottom: 6,
  },

  subFeatures: {
    marginTop: 4,
    gap: 2,
  },

  subFeature: {
    color: '#64748b',
    lineHeight: 12,
  },
  
  buttonGroup: {
    flexDirection: 'row',
    marginTop: 20,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },

  mainCta: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 4,
  },
  ctaText: { color: '#fff', fontWeight: '800', letterSpacing: 0.8 },

  structureBtn: {
    backgroundColor: '#52b788',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 4,
  },
  structureBtnText: { color: '#fff', fontWeight: '700', letterSpacing: 0.6 },

  structureContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  structureCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    maxWidth: 1000,
    width: '100%',
    elevation: 6,
    shadowColor: '#52b788',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    borderWidth: 1,
    borderColor: '#e8f2ed',
  },
  structureCardCompact: {
    padding: 16,
  },
  backBtnStructure: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  backTextStructure: {
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  structureHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  structureTitle: {
    fontWeight: '900',
    color: '#2d6a4f',
    marginTop: 8,
    letterSpacing: -0.5,
  },
  structureTitleCompact: {
    marginTop: 4,
  },
  structureSubtitle: {
    color: '#74c69d',
    fontWeight: '500',
    marginTop: 4,
  },
  structureSubtitleCompact: {},
  structureImageContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e8f2ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  structureImageContainerCompact: {
    marginBottom: 10,
  },
  structureImage: {
    width: '100%',
    borderRadius: 12,
  },
  structureImageCompact: {},
  materialsSection: {
    marginBottom: 0,
  },
  materialsSectionCompact: {},
  materialsTitle: {
    fontWeight: '800',
    color: '#2d6a4f',
    textAlign: 'center',
    marginBottom: 14,
  },
  materialsTitleCompact: {
    marginBottom: 8,
  },
  materialsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  materialsGridCompact: {},
  materialItem: {
    alignItems: 'center',
    backgroundColor: '#f0f7f4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d8f3dc',
  },
  materialItemCompact: {},
  materialName: {
    fontWeight: '800',
    color: '#2d6a4f',
    marginTop: 8,
    marginBottom: 2,
  },
  materialNameCompact: {
    marginTop: 4,
  },
  materialDesc: {
    color: '#74c69d',
    fontWeight: '500',
    textAlign: 'center',
  },
  materialDescCompact: {},
  specsSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: '#e8f2ed',
  },
  specsSectionCompact: {
    padding: 8,
    gap: 6,
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#e8f2ed',
  },
  specItemCompact: {
    paddingVertical: 3,
  },
  specLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    width: 90,
  },
  specLabelCompact: {
    fontSize: 10,
    width: 80,
  },
  specValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2d6a4f',
    flex: 1,
  },
  specValueCompact: {
    fontSize: 10,
  },

  phoneMockupsContainer: {
    position: 'relative',
    width: '100%',
    paddingVertical: 15,
  },

  phonesWrapper: {
    position: 'relative',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    marginHorizontal: -45,
  },

  phoneBottomSection: {
    marginTop: 12,
  },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },

  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: '#e8f2ed',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },

  statIconBox: {
    backgroundColor: '#f0f7f4',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#d8f3dc',
  },

  statValue: {
    fontWeight: '900',
    color: '#2d6a4f',
    marginBottom: 2,
    textAlign: 'center',
  },

  statName: {
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 2,
    lineHeight: 12,
  },

  bottomDivider: {
    height: 1,
    backgroundColor: '#e8f2ed',
    marginHorizontal: 20,
  },

  trustSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    flexWrap: 'wrap',
  },

  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0f7f4',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d8f3dc',
  },

  trustText: {
    fontWeight: '700',
    color: '#2d6a4f',
  },
  
  phoneWrapper: {
    position: 'absolute',
  },
  
  phoneFrame: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#1e293b',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    backgroundColor: '#fff',
  },
  
  phoneNotch: {
    position: 'absolute',
    top: 0,
    left: '50%',
    height: 18,
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    zIndex: 10,
  },
  
  phoneImage: {
    width: '100%',
    height: '100%',
  },
  
  phoneHomeBar: {
    position: 'absolute',
    bottom: 5,
    left: '50%',
    height: 3,
    backgroundColor: '#475569',
    borderRadius: 2,
    zIndex: 10,
  },

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