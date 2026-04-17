import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    useWindowDimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ADJUSTED NGROK IMPORT
import { NGROK_URL } from "../../../ngrok_camera";
import { setId } from "../index";

// Custom Alert Component
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

// Profile Change Confirmation Modal
const ProfileChangeModal = ({ visible, onClose, onConfirm, uploading }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.confirmOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.confirmContainer,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                }
              ]}
            >
              <View style={styles.confirmIconContainer}>
                <Icon name="camera" size={40} color="#6366F1" />
              </View>
              <Text style={styles.confirmTitle}>Change Profile Picture</Text>
              <Text style={styles.confirmMessage}>
                Are you sure you want to change your profile picture? This will replace your current image.
              </Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity 
                  style={styles.confirmCancelBtn} 
                  onPress={onClose}
                  disabled={uploading}
                >
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.confirmConfirmBtn, uploading && styles.confirmDisabled]} 
                  onPress={onConfirm}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.confirmConfirmText}>Change Picture</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Deactivate Account Confirmation Modal
const DeactivateAccountModal = ({ visible, onClose, onConfirm, deactivating }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal transparent visible={visible} animationType="none">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.confirmOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.deactivateModalContainer,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                }
              ]}
            >
              <View style={styles.deactivateIconContainer}>
                <Icon name="account-alert" size={48} color="#EF4444" />
              </View>
              <Text style={styles.deactivateTitle}>Deactivate Account</Text>
              <Text style={styles.deactivateMessage}>
                Are you sure you want to deactivate your account? This action cannot be undone.
              </Text>
              <Text style={styles.deactivateWarning}>
                Once deactivated, you will not be able to log in again. Your account will be disabled and all access will be revoked.
              </Text>
              <View style={styles.deactivateButtons}>
                <TouchableOpacity 
                  style={styles.deactivateCancelBtn} 
                  onPress={onClose}
                  disabled={deactivating}
                >
                  <Text style={styles.deactivateCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.deactivateConfirmBtn, deactivating && styles.deactivateDisabled]} 
                  onPress={onConfirm}
                  disabled={deactivating}
                >
                  {deactivating ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.deactivateConfirmText}>Yes, Deactivate</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Change Password Modal
const ChangePasswordModal = ({ visible, onClose, userId, showAlert }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  const [step, setStep] = useState(1);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [oldPasswordFocused, setOldPasswordFocused] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Check if passwords match (for real-time validation)
  const doPasswordsMatch = newPassword === confirmPassword;
  const isPasswordValid = newPassword.length >= 6;
  const showConfirmError = confirmPassword.length > 0 && !doPasswordsMatch;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      setStep(1);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    } else {
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleProceed = async () => {
    if (!oldPassword) {
      setError('Please enter your current password');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${NGROK_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ 
          email: userId.email, 
          password: oldPassword 
        })
      });
      
      const result = await response.json();
      
      if (response.status === 200) {
        setStep(2);
        setError('');
      } else {
        setError('Incorrect password. Please try again.');
      }
    } catch (error) {
      console.error("Password verification error:", error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (!isPasswordValid) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (!doPasswordsMatch) {
      setError('New password and confirmation do not match');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`${NGROK_URL}/api/updateuser`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          user_id: userId.user_id,
          password: newPassword
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        showAlert("✓ PASSWORD UPDATED", "Your password has been changed successfully!", "success", true);
        setTimeout(() => {
          onClose();
          setStep(1);
          setOldPassword('');
          setNewPassword('');
          setConfirmPassword('');
        }, 2000);
      } else {
        setError(result.error || 'Failed to update password');
      }
    } catch (error) {
      console.error("Password update error:", error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.confirmOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.passwordModalContainer,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                }
              ]}
            >
              <View style={styles.passwordModalHeader}>
                <Text style={styles.passwordModalTitle}>Change Password</Text>
                <TouchableOpacity onPress={onClose} style={styles.passwordModalClose}>
                  <Icon name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.passwordModalContent}>
                {step === 1 ? (
                  <View>
                    <View style={styles.passwordIconContainer}>
                      <Icon name="lock-outline" size={48} color="#6366F1" />
                    </View>
                    <Text style={styles.passwordStepTitle}>Verify Your Identity</Text>
                    <Text style={styles.passwordStepSubtitle}>
                      Please enter your current password to continue
                    </Text>
                    
                    <View style={[styles.passwordInputWrapper, oldPasswordFocused && styles.passwordInputWrapperFocused]}>
                      <Icon name="lock-outline" size={20} color={oldPasswordFocused ? "#6366F1" : "#94A3B8"} style={styles.passwordInputIcon} />
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Current Password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={true}
                        value={oldPassword}
                        onChangeText={setOldPassword}
                        onFocus={() => setOldPasswordFocused(true)}
                        onBlur={() => setOldPasswordFocused(false)}
                      />
                    </View>
                    
                    {error ? <Text style={styles.passwordError}>{error}</Text> : null}
                    
                    <TouchableOpacity 
                      style={styles.passwordProceedBtn}
                      onPress={handleProceed}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.passwordProceedBtnText}>Proceed</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <View style={styles.passwordIconContainer}>
                      <Icon name="shield-check-outline" size={48} color="#10B981" />
                    </View>
                    <Text style={styles.passwordStepTitle}>Create New Password</Text>
                    <Text style={styles.passwordStepSubtitle}>
                      Choose a strong password that you haven't used before
                    </Text>
                    
                    <View style={[styles.passwordInputWrapper, newPasswordFocused && styles.passwordInputWrapperFocused]}>
                      <Icon name="lock-outline" size={20} color={newPasswordFocused ? "#6366F1" : "#94A3B8"} style={styles.passwordInputIcon} />
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="New Password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={true}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        onFocus={() => setNewPasswordFocused(true)}
                        onBlur={() => setNewPasswordFocused(false)}
                      />
                      {isPasswordValid && newPassword.length > 0 && (
                        <Icon name="check-circle" size={20} color="#10B981" />
                      )}
                    </View>
                    
                    <View style={[
                      styles.passwordInputWrapper, 
                      confirmPasswordFocused && styles.passwordInputWrapperFocused,
                      showConfirmError && styles.passwordInputWrapperError
                    ]}>
                      <Icon name="lock-check-outline" size={20} color={
                        confirmPasswordFocused ? "#6366F1" : (showConfirmError ? "#EF4444" : "#94A3B8")
                      } style={styles.passwordInputIcon} />
                      <TextInput
                        style={styles.passwordInput}
                        placeholder="Confirm New Password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={true}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        onFocus={() => setConfirmPasswordFocused(true)}
                        onBlur={() => setConfirmPasswordFocused(false)}
                      />
                      {confirmPassword.length > 0 && (
                        doPasswordsMatch ? (
                          <Icon name="check-circle" size={20} color="#10B981" />
                        ) : (
                          <Icon name="close-circle" size={20} color="#EF4444" />
                        )
                      )}
                    </View>
                    
                    {showConfirmError && (
                      <Text style={styles.passwordMatchError}>Passwords do not match</Text>
                    )}
                    
                    {error ? <Text style={styles.passwordError}>{error}</Text> : null}
                    
                    <View style={styles.passwordRequirements}>
                      <Text style={styles.passwordReqTitle}>Password requirements:</Text>
                      <Text style={[styles.passwordReqItem, newPassword.length >= 6 && styles.passwordReqMet]}>
                        • At least 6 characters
                      </Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={[
                        styles.passwordChangeBtn, 
                        (!doPasswordsMatch || !isPasswordValid || !newPassword || !confirmPassword) && styles.passwordChangeBtnDisabled
                      ]} 
                      onPress={handleChangePassword}
                      disabled={loading || !doPasswordsMatch || !isPasswordValid || !newPassword || !confirmPassword}
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.passwordChangeBtnText}>Change Password</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default function WebPremiumProfile() {
    const { width } = useWindowDimensions();
    const isLargeWeb = width > 1024;
    const isSmall = width < 650;

    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Edit mode states
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [updating, setUpdating] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    
    // Profile picture states
    const [profileChangeModalVisible, setProfileChangeModalVisible] = useState(false);
    const [uploadingProfile, setUploadingProfile] = useState(false);
    
    // Change Password states
    const [passwordModalVisible, setPasswordModalVisible] = useState(false);
    
    // Deactivate Account states
    const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);
    const [deactivating, setDeactivating] = useState(false);
    
    // Alert states
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertData, setAlertData] = useState({
        title: '',
        message: '',
        type: 'info',
        autoClose: false
    });
    
    // Animation value for modal
    const modalScale = useState(new Animated.Value(0))[0];
    const modalOpacity = useState(new Animated.Value(0))[0];
    const overlayOpacity = useState(new Animated.Value(0))[0];

    const fileInputRef = useRef(null);

    const showAlert = (title, message, type, autoClose = false) => {
        setAlertData({ title, message, type, autoClose });
        setAlertVisible(true);
    };

    const hideAlert = () => {
        setAlertVisible(false);
    };

    useEffect(() => {
        const fetchUserData = async () => {
            setLoading(true);
            try {
                const response = await fetch(`${NGROK_URL}/api/getallusers`, {
                    method: 'GET',
                    headers: {
                        'ngrok-skip-browser-warning': 'true',
                        'Accept': 'application/json'
                    }
                });

                if (!response.ok) throw new Error("Failed to fetch users");
                const allUsers = await response.json();
                const matchedUser = allUsers.find(u => String(u.user_id) === String(setId));

                if (matchedUser) {
                    const SUPABASE_PROJECT_ID = "xvebncyvecfvocnqcxpk";
                    const BUCKET = "images";
                    const fileName = matchedUser.profile;
                    
                    const profileImageUrl = fileName 
                        ? `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/${BUCKET}/${fileName}`
                        : `https://ui-avatars.com/api/?name=${matchedUser.firstname}+${matchedUser.lastname}&background=6366F1&color=fff`;

                    setUserData({
                        user_id: matchedUser.user_id,
                        fullName: `${matchedUser.firstname} ${matchedUser.middlname || ''} ${matchedUser.lastname} ${matchedUser.suffix || ''}`.trim(),
                        id: `USR-2026-VAL-0${matchedUser.user_id}`,
                        firstname: matchedUser.firstname,
                        lastname: matchedUser.lastname,
                        middlname: matchedUser.middlname || "",
                        suffix: (matchedUser.suffix === "f" || !matchedUser.suffix) ? "" : matchedUser.suffix,
                        age: matchedUser.age,
                        birthday: matchedUser.birthday,
                        gender: matchedUser.gender,
                        civilStatus: "Active", 
                        phonenumber: matchedUser.phonenumber,
                        email: matchedUser.email,
                        address: matchedUser.address || "Valencia City, Bukidnon",
                        status: matchedUser.status === "Active" ? "Verified Account" : "Deactivated Account",
                        profileImg: profileImageUrl,
                        profileFileName: fileName
                    });
                } else {
                    setError(`User ID ${setId} not found.`);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    const handleChangeProfilePicture = () => {
        setProfileChangeModalVisible(true);
    };

    const handleChangePassword = () => {
        setPasswordModalVisible(true);
    };

    const handleDeactivateAccount = () => {
        setDeactivateModalVisible(true);
    };

    const confirmDeactivateAccount = async () => {
        setDeactivating(true);
        
        try {
            const response = await fetch(`${NGROK_URL}/api/updateuser`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    user_id: userData.user_id,
                    status: "Inactive"
                })
            });

            const result = await response.json();

            if (response.ok) {
                // Update local userData
                setUserData(prev => ({
                    ...prev,
                    status: "Deactivated Account"
                }));
                
                showAlert("⚠️ ACCOUNT DEACTIVATED", "Your account has been deactivated. You will not be able to log in again.", "warning", true);
                
                setTimeout(() => {
                    setDeactivateModalVisible(false);
                }, 2000);
            } else {
                showAlert("DEACTIVATION FAILED", result.error || "Failed to deactivate account", "error");
            }
        } catch (error) {
            console.error("Deactivation error:", error);
            showAlert("CONNECTION ERROR", "Network error. Please try again.", "error");
        } finally {
            setDeactivating(false);
        }
    };

    const triggerFileInput = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showAlert("Invalid File", "Please select a valid image file (JPEG, PNG, GIF, WEBP)", "error");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showAlert("File Too Large", "Please select an image smaller than 5MB", "error");
            return;
        }

        await uploadProfilePicture(file);
    };

    const uploadProfilePicture = async (file) => {
        setUploadingProfile(true);
        setProfileChangeModalVisible(false);
        
        try {
            const formData = new FormData();
            formData.append('profile', file);
            formData.append('user_id', userData.user_id.toString());

            const response = await fetch(`${NGROK_URL}/api/updateprofile`, {
                method: 'POST',
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                },
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                setUserData(prev => ({
                    ...prev,
                    profileImg: result.profileImageUrl,
                    profileFileName: result.profileFileName
                }));
                showAlert("✓ PROFILE UPDATED", "Your profile picture has been changed successfully!", "success", true);
            } else {
                showAlert("UPDATE FAILED", result.error || "Failed to update profile picture", "error");
            }
        } catch (error) {
            console.error("Upload error:", error);
            showAlert("CONNECTION ERROR", "Network error. Please try again.", "error");
        } finally {
            setUploadingProfile(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const confirmChangePicture = () => {
        setProfileChangeModalVisible(false);
        setTimeout(() => {
            triggerFileInput();
        }, 300);
    };

    const handleEditProfile = () => {
        setEditingUser({
            user_id: userData.user_id,
            firstname: userData.firstname,
            lastname: userData.lastname,
            middlname: userData.middlname,
            suffix: userData.suffix,
            birthday: userData.birthday,
            gender: userData.gender,
            phonenumber: userData.phonenumber,
            email: userData.email,
            address: userData.address,
            age: userData.age,
        });
        setEditModalVisible(true);
        setIsClosing(false);
        
        Animated.parallel([
            Animated.spring(modalScale, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(modalOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(overlayOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start();
    };

    const handleSaveUpdate = async () => {
        setUpdating(true);
        try {
            const response = await fetch(`${NGROK_URL}/api/updateuser`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    user_id: editingUser.user_id,
                    firstname: editingUser.firstname,
                    lastname: editingUser.lastname,
                    middlname: editingUser.middlname,
                    suffix: editingUser.suffix,
                    birthday: editingUser.birthday,
                    gender: editingUser.gender,
                    phonenumber: editingUser.phonenumber,
                    email: editingUser.email,
                    address: editingUser.address,
                    age: parseInt(editingUser.age),
                    status: userData.status === "Verified Account" ? "Active" : "Inactive"
                })
            });

            const result = await response.json();

            if (response.ok) {
                setUserData(prev => ({
                    ...prev,
                    fullName: `${editingUser.firstname} ${editingUser.middlname || ''} ${editingUser.lastname} ${editingUser.suffix || ''}`.trim(),
                    firstname: editingUser.firstname,
                    lastname: editingUser.lastname,
                    middlname: editingUser.middlname,
                    suffix: editingUser.suffix,
                    birthday: editingUser.birthday,
                    gender: editingUser.gender,
                    phonenumber: editingUser.phonenumber,
                    email: editingUser.email,
                    address: editingUser.address,
                    age: editingUser.age,
                }));
                showAlert("✓ PROFILE UPDATED", "Your information has been successfully updated!", "success", true);
                setTimeout(() => {
                    closeModal();
                }, 2000);
            } else {
                showAlert("UPDATE FAILED", result.error || "Failed to update profile", "error");
                setUpdating(false);
            }
        } catch (error) {
            console.error("Update error:", error);
            showAlert("CONNECTION ERROR", "Network error. Please try again.", "error");
            setUpdating(false);
        }
    };

    const closeModal = () => {
        if (isClosing) return;
        setIsClosing(true);
        
        Animated.parallel([
            Animated.spring(modalScale, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
            Animated.timing(modalOpacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(overlayOpacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            })
        ]).start(() => {
            setEditModalVisible(false);
            setEditingUser(null);
            setUpdating(false);
            setIsClosing(false);
        });
    };

    const handleCancelEdit = () => {
        closeModal();
    };

    const handleOverlayPress = () => {
        if (!isClosing) {
            closeModal();
        }
    };

    const InfoTile = ({ icon, label, value, color }) => (
        <View style={[styles.infoTile, { flexBasis: isSmall ? '100%' : '47%' }]}>
            <View style={[styles.tileIconFrame, { backgroundColor: color + '15' }]}>
                <Icon name={icon} size={20} color={color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.tileLabel}>{label}</Text>
                <Text style={styles.tileValue} numberOfLines={1}>{value || '---'}</Text>
            </View>
        </View>
    );

    const renderFormFields = () => (
        <>
            <View style={styles.formRow}>
                <View style={styles.formHalf}>
                    <Text style={styles.inputLabel}>First Name</Text>
                    <TextInput
                        style={styles.input}
                        value={editingUser?.firstname}
                        onChangeText={(text) => setEditingUser(prev => ({ ...prev, firstname: text }))}
                        placeholder="Enter first name"
                        placeholderTextColor="#94A3B8"
                    />
                </View>
                <View style={styles.formHalf}>
                    <Text style={styles.inputLabel}>Middle Name</Text>
                    <TextInput
                        style={styles.input}
                        value={editingUser?.middlname}
                        onChangeText={(text) => setEditingUser(prev => ({ ...prev, middlname: text }))}
                        placeholder="Enter middle name"
                        placeholderTextColor="#94A3B8"
                    />
                </View>
            </View>
            <View style={styles.formRow}>
                <View style={styles.formHalf}>
                    <Text style={styles.inputLabel}>Last Name</Text>
                    <TextInput
                        style={styles.input}
                        value={editingUser?.lastname}
                        onChangeText={(text) => setEditingUser(prev => ({ ...prev, lastname: text }))}
                        placeholder="Enter last name"
                        placeholderTextColor="#94A3B8"
                    />
                </View>
                <View style={styles.formHalf}>
                    <Text style={styles.inputLabel}>Suffix</Text>
                    <TextInput
                        style={styles.input}
                        value={editingUser?.suffix}
                        onChangeText={(text) => setEditingUser(prev => ({ ...prev, suffix: text }))}
                        placeholder="e.g., Jr., Sr., III"
                        placeholderTextColor="#94A3B8"
                    />
                </View>
            </View>
            <View style={styles.formRow}>
                <View style={styles.formHalf}>
                    <Text style={styles.inputLabel}>Birthday</Text>
                    <TextInput
                        style={styles.input}
                        value={editingUser?.birthday}
                        onChangeText={(text) => setEditingUser(prev => ({ ...prev, birthday: text }))}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#94A3B8"
                    />
                </View>
                <View style={styles.formHalf}>
                    <Text style={styles.inputLabel}>Age</Text>
                    <TextInput
                        style={styles.input}
                        value={editingUser?.age?.toString()}
                        onChangeText={(text) => setEditingUser(prev => ({ ...prev, age: text }))}
                        placeholder="Enter age"
                        placeholderTextColor="#94A3B8"
                        keyboardType="numeric"
                    />
                </View>
            </View>
            <View style={styles.formRow}>
                <View style={styles.formHalf}>
                    <Text style={styles.inputLabel}>Gender</Text>
                    <View style={styles.genderRow}>
                        <TouchableOpacity
                            style={[styles.genderOption, editingUser?.gender === 'Male' && styles.genderOptionActive]}
                            onPress={() => setEditingUser(prev => ({ ...prev, gender: 'Male' }))}
                        >
                            <Text style={[styles.genderText, editingUser?.gender === 'Male' && styles.genderTextActive]}>Male</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.genderOption, editingUser?.gender === 'Female' && styles.genderOptionActive]}
                            onPress={() => setEditingUser(prev => ({ ...prev, gender: 'Female' }))}
                        >
                            <Text style={[styles.genderText, editingUser?.gender === 'Female' && styles.genderTextActive]}>Female</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.formHalf}>
                    <Text style={styles.inputLabel}>Phone Number</Text>
                    <TextInput
                        style={styles.input}
                        value={editingUser?.phonenumber}
                        onChangeText={(text) => setEditingUser(prev => ({ ...prev, phonenumber: text }))}
                        placeholder="Enter phone number"
                        placeholderTextColor="#94A3B8"
                        keyboardType="phone-pad"
                    />
                </View>
            </View>
            <View style={styles.formRow}>
                <View style={styles.formFull}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <TextInput
                        style={styles.input}
                        value={editingUser?.email}
                        onChangeText={(text) => setEditingUser(prev => ({ ...prev, email: text }))}
                        placeholder="Enter email"
                        placeholderTextColor="#94A3B8"
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>
            </View>
            <View style={styles.formRow}>
                <View style={styles.formFull}>
                    <Text style={styles.inputLabel}>Address</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={editingUser?.address}
                        onChangeText={(text) => setEditingUser(prev => ({ ...prev, address: text }))}
                        placeholder="Enter address"
                        placeholderTextColor="#94A3B8"
                        multiline
                        numberOfLines={3}
                    />
                </View>
            </View>
        </>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#6366F1" />
            </View>
        );
    }

    if (error || !userData) {
        return (
            <View style={styles.centered}>
                <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>{error || "User data missing"}</Text>
            </View>
        );
    }

    // Determine status label color
    const statusColor = userData.status === "Verified Account" ? "#10B981" : "#EF4444";

    return (
        <SafeAreaView style={styles.container}>
            <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
            />

            <ScrollView contentContainerStyle={[styles.webWrapper, { padding: isSmall ? 14 : 15 }]} showsVerticalScrollIndicator={false}>
                <View style={styles.glassHeader}>
                    <View style={[styles.headerContent, { 
                        flexDirection: isSmall ? 'column' : 'row', 
                        alignItems: isSmall ? 'center' : 'center'
                    }]}>
                        <View style={styles.avatarContainer}>
                            <Image source={{ uri: userData.profileImg }} style={styles.webAvatar} />
                            {uploadingProfile && (
                                <View style={styles.uploadOverlay}>
                                    <ActivityIndicator size="large" color="#FFF" />
                                </View>
                            )}
                            <View style={styles.activeIndicator} />
                        </View>
                        
                        <View style={[styles.headerInfo, { marginLeft: isSmall ? 0 : 24, marginTop: isSmall ? 15 : 0, alignItems: isSmall ? 'center' : 'flex-start' }]}>
                            <Text style={[styles.userNameText, { fontSize: isSmall ? 22 : 28 }]}>{userData.fullName}</Text>
                            <View style={styles.badgeRow}>
                                <View style={styles.roleBadge}>
                                    <Text style={styles.roleText}>PLANT MANAGER</Text>
                                </View>
                                <Text style={styles.userIdText}>{userData.id}</Text>
                            </View>
                        </View>

                        <View style={[styles.headerActions, { 
                            marginTop: isSmall ? 25 : 0, 
                            width: isSmall ? '100%' : 'auto',
                            justifyContent: isSmall ? 'center' : 'flex-end',
                        }]}>
                            <TouchableOpacity style={styles.btnChangeProfile} onPress={handleChangeProfilePicture}>
                                <Icon name="camera-outline" size={20} color="#6366F1" />
                                <Text style={styles.btnChangeProfileText}>Change Photo</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.btnEdit} onPress={handleEditProfile}>
                                <Icon name="pencil-outline" size={20} color="#FFF" />
                                <Text style={styles.btnEditText}>Edit Profile</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={[styles.bentoGrid, { flexDirection: isLargeWeb ? 'row' : 'column' }]}>
                    <View style={styles.leftCol}>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Personal Identification</Text>
                            <View style={styles.tileGrid}>
                                <InfoTile icon="account-outline" label="First Name" value={userData.firstname} color="#6366F1" />
                                <InfoTile icon="account-details" label="Middle Name" value={userData.middlname || "N/A"} color="#6366F1" />
                                <InfoTile icon="account-circle-outline" label="Last Name" value={userData.lastname} color="#6366F1" />
                                <InfoTile icon="tag-outline" label="Suffix" value={userData.suffix || 'None'} color="#6366F1" />
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.tileGrid}>
                                <InfoTile icon="cake-variant" label="Birthday" value={userData.birthday} color="#6366F1" />
                                <InfoTile icon="calendar-clock" label="Age" value={`${userData.age} yrs`} color="#6366F1" />
                                <InfoTile icon="gender-male-female" label="Gender" value={userData.gender} color="#6366F1" />
                                <InfoTile icon="heart-outline" label="Civil Status" value={userData.civilStatus} color="#6366F1" />
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Residential Address</Text>
                            <View style={styles.addressRow}>
                                <View style={styles.addressIcon}>
                                    <Icon name="map-marker-radius" size={24} color="#10B981" />
                                </View>
                                <Text style={styles.addressText}>{userData.address}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.rightCol}>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Contact Information</Text>
                            <View style={styles.contactList}>
                                <View style={styles.contactTileItem}>
                                    <View style={[styles.tileIconFrame, { backgroundColor: '#10B98115' }]}>
                                        <Icon name="phone-outline" size={20} color="#10B981" />
                                    </View>
                                    <View>
                                        <Text style={styles.tileLabel}>Mobile</Text>
                                        <Text style={styles.tileValue}>{userData.phonenumber}</Text>
                                    </View>
                                </View>
                                <View style={styles.contactTileItem}>
                                    <View style={[styles.tileIconFrame, { backgroundColor: '#10B98115' }]}>
                                        <Icon name="email-outline" size={20} color="#10B981" />
                                    </View>
                                    <View>
                                        <Text style={styles.tileLabel}>Email</Text>
                                        <Text style={styles.tileValue}>{userData.email}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.card, styles.securityCard]}>
                            <View style={styles.securityHeader}>
                                <Text style={styles.cardTitle}>Security</Text>
                                <Text style={[styles.statusLabel, { color: statusColor }]}>{userData.status}</Text>
                            </View>
                            <TouchableOpacity style={styles.securityItem} onPress={handleChangePassword}>
                                <Icon name="lock-reset" size={20} color="#64748B" />
                                <Text style={styles.securityText}>Change Password</Text>
                                <Icon name="chevron-right" size={20} color="#CBD5E1" />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.securityItem, { borderBottomWidth: 0 }]} onPress={handleDeactivateAccount}>
                                <Icon name="delete-outline" size={20} color="#EF4444" />
                                <Text style={[styles.securityText, { color: '#EF4444' }]}>Deactivate Account</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <Modal visible={editModalVisible} transparent={true} animationType="none" onRequestClose={handleCancelEdit}>
                <TouchableWithoutFeedback onPress={handleOverlayPress}>
                    <Animated.View style={[styles.modalOverlay, { opacity: overlayOpacity }]}>
                        <TouchableWithoutFeedback>
                            <Animated.View style={[styles.modalContainer, { width: isSmall ? '95%' : '90%', maxWidth: isSmall ? '95%' : 800, transform: [{ scale: modalScale }], opacity: modalOpacity }]}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Edit Profile</Text>
                                    <TouchableOpacity onPress={handleCancelEdit} style={styles.modalCloseBtn}>
                                        <Icon name="close" size={24} color="#64748B" />
                                    </TouchableOpacity>
                                </View>
                                {isSmall ? (
                                    <ScrollView showsVerticalScrollIndicator={true} style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                                        {renderFormFields()}
                                    </ScrollView>
                                ) : (
                                    <View style={styles.modalContent}>
                                        {renderFormFields()}
                                    </View>
                                )}
                                <View style={styles.modalFooter}>
                                    <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelEdit}>
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.saveBtn, updating && styles.saveBtnDisabled]} onPress={handleSaveUpdate} disabled={updating}>
                                        {updating ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
                        </TouchableWithoutFeedback>
                    </Animated.View>
                </TouchableWithoutFeedback>
            </Modal>

            <ProfileChangeModal visible={profileChangeModalVisible} onClose={() => setProfileChangeModalVisible(false)} onConfirm={confirmChangePicture} uploading={uploadingProfile} />

            <ChangePasswordModal visible={passwordModalVisible} onClose={() => setPasswordModalVisible(false)} userId={{ user_id: userData.user_id, email: userData.email }} showAlert={showAlert} />

            <DeactivateAccountModal visible={deactivateModalVisible} onClose={() => setDeactivateModalVisible(false)} onConfirm={confirmDeactivateAccount} deactivating={deactivating} />

            <CustomAlert visible={alertVisible} title={alertData.title} message={alertData.message} type={alertData.type} onClose={hideAlert} autoClose={alertData.autoClose} />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    webWrapper: { alignSelf: 'center', width: '100%', maxWidth: 1200 },
    glassHeader: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 28,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        elevation: 3,
    },
    headerContent: { justifyContent: 'space-between' },
    avatarContainer: { position: 'relative' },
    webAvatar: { width: 90, height: 90, borderRadius: 28, backgroundColor: '#F1F5F9' },
    uploadOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeIndicator: { position: 'absolute', bottom: 2, right: 2, width: 22, height: 22, borderRadius: 11, backgroundColor: '#10B981', borderWidth: 4, borderColor: '#FFF' },
    headerInfo: { flex: 1 },
    userNameText: { fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    roleBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginRight: 12 },
    roleText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
    userIdText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
    
    headerActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    btnChangeProfile: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0' },
    btnChangeProfileText: { color: '#6366F1', fontWeight: '700', fontSize: 14, marginLeft: 8 },
    btnEdit: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
    btnEditText: { color: '#FFF', fontWeight: '700', fontSize: 14, marginLeft: 8 },

    bentoGrid: { gap: 20 },
    leftCol: { flex: 2, gap: 20 },
    rightCol: { flex: 1, gap: 20 },
    card: { backgroundColor: '#FFF', borderRadius: 22, padding: 24, borderWidth: 1, borderColor: '#E2E8F0' },
    cardTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 18 },
    divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 15 },
    tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    infoTile: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    tileIconFrame: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    tileLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase' },
    tileValue: { fontSize: 14, fontWeight: '700', color: '#334155', marginTop: 1 },
    contactList: { gap: 18 },
    contactTileItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFC', padding: 14, borderRadius: 14 },
    addressIcon: { width: 48, height: 48, backgroundColor: '#FFF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 1 },
    addressText: { flex: 1, fontSize: 14, color: '#475569', fontWeight: '500', lineHeight: 20 },
    securityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    statusLabel: { fontSize: 12, fontWeight: '800' },
    securityItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 12, 
        paddingVertical: 16,
        borderBottomWidth: 0,
    },
    securityText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#475569' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContainer: { backgroundColor: '#FFF', borderRadius: 24, maxHeight: '90%', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
    modalCloseBtn: { padding: 4 },
    modalScroll: { maxHeight: '70%' },
    modalScrollContent: { paddingHorizontal: 20, paddingVertical: 8 },
    modalContent: { paddingHorizontal: 20, paddingVertical: 8 },
    formRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
    formHalf: { flex: 1 },
    formFull: { flex: 1 },
    inputLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6, textTransform: 'uppercase' },
    input: { backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
    textArea: { textAlignVertical: 'top', minHeight: 80 },
    genderRow: { flexDirection: 'row', gap: 12 },
    genderOption: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#F8FAFC' },
    genderOptionActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    genderText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
    genderTextActive: { color: '#FFF' },
    modalFooter: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#FFF' },
    cancelBtnText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
    saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#1E293B' },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

    confirmOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
    confirmContainer: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, width: '85%', maxWidth: 400, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10 },
    confirmIconContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#6366F115', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
    confirmTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 8, textAlign: 'center' },
    confirmMessage: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
    confirmButtons: { flexDirection: 'row', gap: 12, width: '100%' },
    confirmCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#FFF' },
    confirmCancelText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
    confirmConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#6366F1' },
    confirmConfirmText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
    confirmDisabled: { opacity: 0.7 },

    // Deactivate Account Modal Styles
    deactivateModalContainer: { backgroundColor: '#FFF', borderRadius: 24, width: '90%', maxWidth: 450, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10, overflow: 'hidden' },
    deactivateIconContainer: { alignItems: 'center', marginTop: 24, marginBottom: 16 },
    deactivateTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B', textAlign: 'center', marginBottom: 12 },
    deactivateMessage: { fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 16, paddingHorizontal: 20, lineHeight: 20 },
    deactivateWarning: { fontSize: 13, color: '#EF4444', textAlign: 'center', marginBottom: 24, paddingHorizontal: 20, lineHeight: 18, backgroundColor: '#FEF2F2', padding: 12, borderRadius: 8, marginHorizontal: 20 },
    deactivateButtons: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    deactivateCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', backgroundColor: '#FFF' },
    deactivateCancelText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
    deactivateConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#EF4444' },
    deactivateConfirmText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
    deactivateDisabled: { opacity: 0.7 },

    passwordModalContainer: { backgroundColor: '#FFF', borderRadius: 24, width: '90%', maxWidth: 450, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 20, elevation: 10, overflow: 'hidden' },
    passwordModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    passwordModalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
    passwordModalClose: { padding: 4 },
    passwordModalContent: { padding: 24 },
    passwordIconContainer: { alignItems: 'center', marginBottom: 20 },
    passwordStepTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', textAlign: 'center', marginBottom: 8 },
    passwordStepSubtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 24 },
    passwordInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1.5, borderColor: '#E2E8F0', paddingHorizontal: 14, marginBottom: 16 },
    passwordInputWrapperFocused: { borderColor: '#6366F1', backgroundColor: '#FFF', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    passwordInputWrapperError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
    passwordInputIcon: { marginRight: 10 },
    passwordInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#1E293B', outlineStyle: 'none' },
    passwordError: { color: '#EF4444', fontSize: 12, marginBottom: 16, textAlign: 'center' },
    passwordMatchError: { color: '#EF4444', fontSize: 12, marginBottom: 16, textAlign: 'left', marginTop: -8 },
    passwordProceedBtn: { backgroundColor: '#1E293B', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
    passwordProceedBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    passwordChangeBtn: { backgroundColor: '#1E293B', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
    passwordChangeBtnDisabled: { backgroundColor: '#94A3B8', opacity: 0.5 },
    passwordChangeBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    passwordRequirements: { backgroundColor: '#F0FDF4', padding: 12, borderRadius: 8, marginBottom: 16 },
    passwordReqTitle: { fontSize: 12, fontWeight: '600', color: '#166534', marginBottom: 6 },
    passwordReqItem: { fontSize: 11, color: '#64748B', marginLeft: 8, marginBottom: 2 },
    passwordReqMet: { color: '#10B981', textDecorationLine: 'line-through' },

    alertOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-start', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 50 : 30, pointerEvents: 'box-none' },
    alertContainer: { width: '90%', maxWidth: 350, backgroundColor: '#fff', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
    alertContent: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    alertIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    alertTextContainer: { flex: 1 },
    alertTitle: { fontSize: 14, fontWeight: '900', color: '#2d6a4f', marginBottom: 2 },
    alertMessage: { fontSize: 12, color: '#64748b', lineHeight: 16 },
    alertButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    alertButtonText: { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
});