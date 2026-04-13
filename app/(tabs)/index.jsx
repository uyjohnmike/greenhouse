import { useRouter } from "expo-router";
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View
} from 'react-native';
import AwesomeAlert from 'react-native-awesome-alerts';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Ensure this path matches your file structure exactly
import { NGROK_URL } from "../../ngrok_camera";

export let setId = null;
export let firstName = null;
export let middleName = null;
export let lastName = null;

const NatureLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({
    title: '',
    message: '',
    confirmText: 'OK',  
    confirmColor: '#52b788',
    onConfirm: () => setShowAlert(false)
  });

  const router = useRouter();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 850;

  // FIXED: Simplified Alert Trigger to ensure navigation works
  const triggerAlert = (title, message, confirmText, color, isSuccess = false) => {
    setAlertConfig({
      title,
      message,
      confirmText,
      confirmColor: color,
      onConfirm: () => {
        setShowAlert(false);
        // If login was successful, navigate after closing the alert
        if (isSuccess) {
          router.replace('/(tabs)/designs/dashboard'); 
        }
      }
    });
    setShowAlert(true);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      triggerAlert("Identity Required", "Enter operator credentials.", "Got it", "#74c69d");
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
        setId = result.user.user_id; // Global ID set
        firstName = result.user.firstname;
        middleName = result.user.middlename;
        lastName = result.user.lastname; 

        // Call alert with success flag
        triggerAlert("Verified", "Uplink established. Entering terminal...", "Enter", "#409167", true);
      } else {
        triggerAlert("Denied", "Invalid access key or email.", "Retry", "#ff8a8a", false);
      }
    } catch (error) {
      console.error("Login Error:", error);
      triggerAlert("Offline", "Portal unreachable. Check server connection.", "OK", "#95d5b2", false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.pageWrapper}>
      <View style={[styles.blurBlob, { top: -100, right: -50, backgroundColor: '#d8f3dc' }]} />
      <View style={[styles.blurBlob, { bottom: -150, left: -50, backgroundColor: '#b7e4c7', width: 600, height: 600 }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={[styles.mainCanvas, { maxWidth: isLargeScreen ? 1050 : 450 }]}>
            
            {isLargeScreen && (
              <View style={styles.glassVisualPanel}>
                <View style={styles.brandContainer}>
                  <View style={styles.glassIcon}>
                    <Icon name="seed-outline" size={36} color="#409167" />
                  </View>
                  <Text style={styles.brandName}>EcoLogic<Text style={{fontWeight: '300'}}>OS</Text></Text>
                  <Text style={styles.brandDesc}>Autonomous Biosphere Management Terminal</Text>
                </View>

                <View style={styles.dataGraphic}>
                  {[1, 2, 3].map((i) => (
                    <View key={i} style={[styles.nodeLine, { width: `${100 - i * 20}%` }]} />
                  ))}
                </View>

                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>SYSTEM STATUS: OPTIMAL</Text>
                </View>
              </View>
            )}

            <View style={styles.formPanel}>
              <View style={styles.formInner}>
                <Text style={styles.welcomeText}>Operator Login</Text>
                <Text style={styles.subText}>Secure access to node telemetry.</Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>OPERATOR IDENTITY</Text>
                  <View style={[styles.inputBox, focusedField === 'email' && styles.inputActive]}>
                    <Icon name="account-outline" size={20} color={focusedField === 'email' ? "#52b788" : "#94a3b8"} />
                    <TextInput 
                      style={styles.textInput} 
                      placeholder="email@ecologic.os" 
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
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>ACCESS KEY</Text>
                    <TouchableOpacity><Text style={styles.forgot}>FORGOT?</Text></TouchableOpacity>
                  </View>
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
                      <Text style={styles.btnText}>PROCEED</Text>
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
        </ScrollView>
      </KeyboardAvoidingView>

      <AwesomeAlert
        show={showAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        showConfirmButton={true}
        confirmText={alertConfig.confirmText}
        confirmButtonColor={alertConfig.confirmColor}
        onConfirmPressed={alertConfig.onConfirm}
        closeOnHardwareBackPress={false}
        closeOnTouchOutside={false}
        titleStyle={{ fontSize: 22, fontWeight: 'bold', color: '#2d6a4f' }}
        messageStyle={{ fontSize: 16, textAlign: 'center' }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pageWrapper: { flex: 1, backgroundColor: '#f5faf7' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 25 },
  blurBlob: { position: 'absolute', borderRadius: 300, opacity: 0.6 },
  mainCanvas: { flexDirection: 'row', width: '100%', backgroundColor: '#ffffff', borderRadius: 50, overflow: 'hidden', borderWidth: 1, borderColor: '#e8f2ed', ...Platform.select({ web: { boxShadow: '0 40px 80px rgba(82, 183, 136, 0.08)' }, android: { elevation: 15 } }) },
  glassVisualPanel: { flex: 1, padding: 60, justifyContent: 'space-between', backgroundColor: 'rgba(247, 252, 249, 0.5)', borderRightWidth: 1.5, borderRightColor: '#f0f7f4' },
  glassIcon: { width: 65, height: 65, backgroundColor: '#fff', borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: '#e8f2ed' },
  brandName: { fontSize: 36, fontWeight: '900', color: '#2d6a4f', letterSpacing: -1.5 },
  brandDesc: { fontSize: 15, color: '#74c69d', fontWeight: '500', marginTop: 10, lineHeight: 22 },
  dataGraphic: { gap: 8, marginVertical: 30 },
  nodeLine: { height: 4, backgroundColor: '#d8f3dc', borderRadius: 2 },
  statusPill: { backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 14, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#edf5f1' },
  statusPillText: { fontSize: 10, fontWeight: '800', color: '#409167', letterSpacing: 1 },
  formPanel: { flex: 1.2, padding: 50, backgroundColor: '#fff' },
  formInner: { width: '100%', maxWidth: 380, alignSelf: 'center' },
  welcomeText: { fontSize: 32, fontWeight: '900', color: '#2d6a4f' },
  subText: { fontSize: 15, color: '#94a3b8', marginBottom: 40, marginTop: 5, fontWeight: '500' },
  inputGroup: { marginBottom: 25 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { fontSize: 10, fontWeight: '900', color: '#b7e4c7', letterSpacing: 1.5 },
  forgot: { fontSize: 10, fontWeight: '800', color: '#52b788' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fbfdfc', borderRadius: 20, height: 62, paddingHorizontal: 22, borderWidth: 1.5, borderColor: '#f0f7f4' },
  inputActive: { borderColor: '#b7e4c7', backgroundColor: '#fff' },
  textInput: { flex: 1, marginLeft: 15, fontSize: 16, color: '#2d6a4f', fontWeight: '600', ...Platform.select({ web: { outlineStyle: 'none' } }) },
  primaryBtn: { backgroundColor: '#52b788', height: 62, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  btnContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  footer: { marginTop: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  footerText: { color: '#cbd5e1', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }
});

export default NatureLogin;