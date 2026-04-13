import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export default function UserDirectory() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAllUsers();
    }, []);

    const fetchAllUsers = async () => {
        setLoading(true);
        try {
            const NGROK_URL = "https://lorita-orthopnoeic-domitila.ngrok-free.dev";
            
            // The 'ngrok-skip-browser-warning' header is REQUIRED for ngrok links
            const response = await fetch(`${NGROK_URL}/api/getallusers`, {
                method: 'GET',
                headers: {
                    'ngrok-skip-browser-warning': 'true',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) throw new Error(`Status: ${response.status}`);

            const data = await response.json();
            setUsers(data);
            setError(null);
        } catch (err) {
            console.error("Fetch Error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const renderUserItem = ({ item }) => (
        <View style={styles.userCard}>
            <Image 
                source={{ uri: `https://ui-avatars.com/api/?name=${item.firstname}+${item.lastname}&background=random` }} 
                style={styles.avatar} 
            />
            <View style={styles.info}>
                <Text style={styles.name}>{item.firstname} {item.lastname}</Text>
                <Text style={styles.email}>{item.email}</Text>
                <View style={styles.badge}>
                    <Text style={styles.idText}>ID: {item.user_id}</Text>
                </View>
            </View>
            <TouchableOpacity style={styles.viewBtn}>
                <Icon name="chevron-right" size={24} color="#6366F1" />
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Connecting to Database...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.centered}>
                <Icon name="wifi-off" size={60} color="#EF4444" />
                <Text style={styles.errorText}>Connection Failed</Text>
                <Text style={styles.subError}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={fetchAllUsers}>
                    <Text style={styles.retryText}>Retry Connection</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>User Directory</Text>
                <Text style={styles.headerSub}>{users.length} Registered Users</Text>
            </View>
            
            <FlatList
                data={users}
                keyExtractor={(item) => item.user_id.toString()}
                renderItem={renderUserItem}
                contentContainerStyle={styles.listPadding}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    header: { padding: 24, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    headerTitle: { fontSize: 24, fontWeight: '800', color: '#0F172A' },
    headerSub: { fontSize: 14, color: '#64748B', marginTop: 4 },
    listPadding: { padding: 20 },
    userCard: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#FFF', 
        padding: 16, 
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    avatar: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#F1F5F9' },
    info: { flex: 1, marginLeft: 16 },
    name: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    email: { fontSize: 13, color: '#64748B', marginTop: 2 },
    badge: { 
        alignSelf: 'flex-start', 
        backgroundColor: '#EEF2FF', 
        paddingHorizontal: 8, 
        paddingVertical: 2, 
        borderRadius: 6, 
        marginTop: 6 
    },
    idText: { fontSize: 10, fontWeight: '700', color: '#6366F1' },
    separator: { height: 12 },
    loadingText: { marginTop: 12, color: '#64748B', fontWeight: '500' },
    errorText: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginTop: 16 },
    subError: { color: '#EF4444', marginTop: 4, fontSize: 12 },
    retryBtn: { marginTop: 20, backgroundColor: '#6366F1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    retryText: { color: '#FFF', fontWeight: '700' }
});