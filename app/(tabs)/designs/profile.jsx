import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ADJUSTED NGROK IMPORT
import { NGROK_URL } from "../../../ngrok_camera";
import { setId } from "../index";

export default function WebPremiumProfile() {
    const { width } = useWindowDimensions();
    const isLargeWeb = width > 1024;
    const isSmall = width < 650;

    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                        fullName: `${matchedUser.firstname} ${matchedUser.middlname || ''} ${matchedUser.lastname} ${matchedUser.suffix || ''}`.trim(),
                        id: `USR-2026-VAL-0${matchedUser.user_id}`,
                        firstName: matchedUser.firstname,
                        lastName: matchedUser.lastname,
                        middleName: matchedUser.middlname || "N/A",
                        suffix: (matchedUser.suffix === "f" || !matchedUser.suffix) ? "" : matchedUser.suffix,
                        age: matchedUser.age,
                        birthday: matchedUser.birthday,
                        gender: matchedUser.gender,
                        civilStatus: "Active", 
                        phone: matchedUser.phonenumber,
                        email: matchedUser.email,
                        address: matchedUser.address || "Valencia City, Bukidnon",
                        status: matchedUser.status === "Active" ? "Verified Account" : "Pending",
                        profileImg: profileImageUrl
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

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={[styles.webWrapper, { padding: isSmall ? 14 : 15 }]} showsVerticalScrollIndicator={false}>
                
                {/* TOP HEADER */}
                <View style={styles.glassHeader}>
                    <View style={[styles.headerContent, { 
                        flexDirection: isSmall ? 'column' : 'row', 
                        alignItems: isSmall ? 'center' : 'center'
                    }]}>
                        <View style={styles.avatarContainer}>
                           <Image source={{ uri: userData.profileImg }} style={styles.webAvatar} />
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

                        {/* FIXED BUTTON CONTAINER */}
                        <View style={[styles.headerActions, { 
                            marginTop: isSmall ? 25 : 0, 
                            width: isSmall ? '100%' : 'auto',
                            justifyContent: isSmall ? 'center' : 'flex-end',
                        }]}>
                            <TouchableOpacity style={styles.btnExport}>
                                <Icon name="download-outline" size={20} color="#475569" />
                                <Text style={styles.btnExportText}>Export</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.btnEdit}>
                                <Icon name="pencil-outline" size={20} color="#FFF" />
                                <Text style={styles.btnEditText}>Edit Profile</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* MAIN CONTENT GRID */}
                <View style={[styles.bentoGrid, { flexDirection: isLargeWeb ? 'row' : 'column' }]}>
                    <View style={styles.leftCol}>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Personal Identification</Text>
                            <View style={styles.tileGrid}>
                                <InfoTile icon="account-outline" label="First Name" value={userData.firstName} color="#6366F1" />
                                <InfoTile icon="account-details" label="Middle Name" value={userData.middleName} color="#6366F1" />
                                <InfoTile icon="account-circle-outline" label="Last Name" value={userData.lastName} color="#6366F1" />
                                <InfoTile icon="tag-outline" label="Suffix" value={userData.suffix || 'None'} color="#6366F1" />
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.tileGrid}>
                                <InfoTile icon="cake-variant" label="Birthday" value={userData.birthday} color="#EC4899" />
                                <InfoTile icon="calendar-clock" label="Age" value={`${userData.age} yrs`} color="#EC4899" />
                                <InfoTile icon="gender-male-female" label="Gender" value={userData.gender} color="#EC4899" />
                                <InfoTile icon="heart-outline" label="Civil Status" value={userData.civilStatus} color="#EC4899" />
                            </View>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Residential Address</Text>
                            <View style={styles.addressRow}>
                                <View style={styles.addressIcon}>
                                    <Icon name="map-marker-radius" size={24} color="#F59E0B" />
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
                                        <Text style={styles.tileValue}>{userData.phone}</Text>
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
                                <Text style={styles.statusLabel}>{userData.status}</Text>
                            </View>
                            <TouchableOpacity style={styles.securityItem}>
                                <Icon name="lock-reset" size={20} color="#64748B" />
                                <Text style={styles.securityText}>Change Password</Text>
                                <Icon name="chevron-right" size={20} color="#CBD5E1" />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.securityItem, { borderBottomWidth: 0 }]}>
                                <Icon name="delete-outline" size={20} color="#EF4444" />
                                <Text style={[styles.securityText, { color: '#EF4444' }]}>Deactivate Account</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </ScrollView>
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
    activeIndicator: { 
        position: 'absolute', bottom: 2, right: 2, 
        width: 22, height: 22, borderRadius: 11, 
        backgroundColor: '#10B981', borderWidth: 4, borderColor: '#FFF' 
    },
    headerInfo: { flex: 1 },
    userNameText: { fontWeight: '900', color: '#0F172A', letterSpacing: -0.5 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    roleBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginRight: 12 },
    roleText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
    userIdText: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
    
    // ACTION BUTTONS - FIXED COLLAPSE ISSUE
    headerActions: { 
        flexDirection: 'row', 
        gap: 12, 
        alignItems: 'center',
    },
    btnExport: { 
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC', 
        paddingHorizontal: 20, 
        paddingVertical: 12, 
        borderRadius: 14, 
        borderWidth: 1.5, 
        borderColor: '#E2E8F0',
    },
    btnExportText: { color: '#475569', fontWeight: '700', fontSize: 14, marginLeft: 8 },
    btnEdit: { 
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B', 
        paddingHorizontal: 20, 
        paddingVertical: 12, 
        borderRadius: 14,
    },
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
    statusLabel: { color: '#10B981', fontSize: 12, fontWeight: '800' },
    securityItem: { 
        flexDirection: 'row', alignItems: 'center', gap: 12, 
        paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' 
    },
    securityText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#475569' }
});