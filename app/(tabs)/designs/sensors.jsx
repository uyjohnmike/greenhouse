import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Central NGROK_URL import
import { CAMERA_URL, CAMERA_URL2, NGROK_URL } from "../../../ngrok_camera";

export default function Sensors() {
    const [activeTab, setActiveTab] = useState('Sensors');
    const [loading, setLoading] = useState(true);
    // Initialized with empty arrays to prevent mapping errors
    const [sensorData, setSensorData] = useState({ tempZones: [], soilZones: [] });
    const [recentReadings, setRecentReadings] = useState([]);
    const { width } = useWindowDimensions();
    const isSmall = width < 768;

    // Camera states
    const [cameraKey1, setCameraKey1] = useState(Date.now());
    const [cameraKey2, setCameraKey2] = useState(Date.now());
    const [refreshing1, setRefreshing1] = useState(false);
    const [refreshing2, setRefreshing2] = useState(false);
    const [cameraConnected1, setCameraConnected1] = useState(true);
    const [cameraConnected2, setCameraConnected2] = useState(true);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Auto refresh every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [tempRes, soilRes] = await Promise.all([
                fetch(`${NGROK_URL}/api/getalltemperature`, { headers: { 'ngrok-skip-browser-warning': 'true' } }),
                fetch(`${NGROK_URL}/api/getallsoilhumidity`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
            ]);

            const tempData = await tempRes.json();
            const soilData = await soilRes.json();

            const getTrendData = (curr, prev, type) => {
                if (curr === undefined || prev === undefined) return { text: "0", color: "#94A3B8" };
                
                const valCurr = parseFloat(curr);
                const valPrev = parseFloat(prev);
                const diff = (valCurr - valPrev).toFixed(1);
                const diffText = diff > 0 ? `+${diff}` : `${diff}`;

                if (parseFloat(diff) === 0) return { text: "0", color: "#94A3B8" };

                if (type === 'temp') {
                    return {
                        text: diffText,
                        color: valCurr > valPrev ? '#EF4444' : '#10B981'
                    };
                } else {
                    return {
                        text: diffText,
                        color: valCurr > valPrev ? '#10B981' : '#EF4444'
                    };
                }
            };

            // Map Temperature Data
            let tempZones = [];
            let tempValues = { t1: 0, t2: 0, t3: 0, t4: 0 };
            if (tempData && tempData.length >= 2) {
                const latestT = tempData[0];
                const prevT = tempData[1];
                const zones = ['t1', 't2', 't3', 't4'];
                const labels = ['Zone 1 - East', 'Zone 2 - North', 'Zone 3 - West', 'Zone 4 - South'];
                
                tempZones = zones.map((key, i) => {
                    const value = parseFloat(latestT[key] || 0);
                    tempValues[`t${i+1}`] = value;
                    return {
                        id: `temp-${key}`,
                        label: labels[i],
                        value: `${value.toFixed(1)}°C`,
                        trend: getTrendData(latestT[key], prevT[key], 'temp'),
                        iconColor: '#F97316',
                        rawValue: value
                    };
                });
            }

            // Map Soil Data
            let soilZones = [];
            let soilValues = { s1: 0, s2: 0, s3: 0, s4: 0 };
            if (soilData && soilData.length >= 2) {
                const latestS = soilData[0];
                const prevS = soilData[1];
                const zones = ['s1', 's2', 's3', 's4'];
                const labels = ['Zone 1 - East', 'Zone 2 - North', 'Zone 3 - West', 'Zone 4 - South'];

                soilZones = zones.map((key, i) => {
                    const value = parseFloat(latestS[key] || 0);
                    soilValues[`s${i+1}`] = value;
                    return {
                        id: `soil-${key}`,
                        label: labels[i],
                        value: `${value.toFixed(1)}%`,
                        trend: getTrendData(latestS[key], prevS[key], 'soil'),
                        iconColor: '#3B82F6',
                        rawValue: value
                    };
                });
            }

            setSensorData({ tempZones, soilZones });

            const readings = [];
            for (let i = 1; i <= 4; i++) {
                const tempValue = tempValues[`t${i}`] || 0;
                const soilValue = soilValues[`s${i}`] || 0;
                const isActive = tempValue > 0 || soilValue > 0;
                
                readings.push({
                    zone: i,
                    tempValue: tempValue,
                    soilValue: soilValue,
                    isActive: isActive
                });
            }
            setRecentReadings(readings);
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshCamera1 = () => {
        setRefreshing1(true);
        setCameraKey1(Date.now());
        setTimeout(() => setRefreshing1(false), 500);
    };

    const handleRefreshCamera2 = () => {
        setRefreshing2(true);
        setCameraKey2(Date.now());
        setTimeout(() => setRefreshing2(false), 500);
    };

    const getAlertLevel = (tempValue, soilValue) => {
        if (tempValue > 38 || tempValue < 5 || soilValue < 20) {
            return { level: 'CRITICAL', color: '#EF4444', icon: 'alert-circle', action: 'Immediate action needed' };
        }
        if (tempValue > 35 || tempValue < 12 || soilValue < 35) {
            return { level: 'WARNING', color: '#F59E0B', icon: 'alert', action: 'Monitor closely' };
        }
        if (tempValue >= 18 && tempValue <= 32 && soilValue >= 50) {
            return { level: 'OPTIMAL', color: '#10B981', icon: 'check-circle', action: 'All good' };
        }
        return { level: 'NORMAL', color: '#3B82F6', icon: 'information', action: 'Within range' };
    };

    const SensorCard = ({ item, typeIcon }) => {
        const trendText = item?.trend?.text || "0";
        const trendColor = item?.trend?.color || "#94A3B8";

        return (
            <View style={[styles.card, { width: isSmall ? '48%' : '23.5%' }]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconBox, { backgroundColor: `${item.iconColor}15` }]}>
                        <Icon name={typeIcon} size={18} color={item.iconColor} />
                    </View>
                </View>
                <Text style={styles.cardLabel}>{item.label}</Text>

                <View style={styles.trendRow}>
                    <Icon 
                        name={trendText.includes('+') ? "trending-up" : trendText.includes('-') ? "trending-down" : "trending-neutral"} 
                        size={12} 
                        color={trendColor} 
                    />
                    <Text style={[styles.cardTrend, { color: trendColor }]}>
                        {trendText}
                    </Text>
                </View>

                <Text style={styles.cardValue}>{item.value}</Text>
            </View>
        );
    };

    if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#10B981" /></View>;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.mainWrapper} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{activeTab}</Text>
                    <View style={styles.tabBar}>
                        {['Sensors', 'Camera'].map((tab) => (
                            <TouchableOpacity 
                                key={tab} 
                                onPress={() => setActiveTab(tab)}
                                style={[styles.tabItem, activeTab === tab && styles.activeTab]}>
                                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {activeTab === 'Camera' ? (
                    <View>
                        <View style={[styles.cameraGrid, { flexDirection: isSmall ? 'column' : 'row' }]}>
                            {/* Camera 1 */}
                            <View style={styles.cameraCard}>
                                <View style={styles.camHeader}>
                                    <View style={styles.camTitleRow}>
                                        {/* Green/Red status indicator */}
                                        <View style={[styles.camStatusDot, { backgroundColor: cameraConnected1 ? '#22C55E' : '#EF4444' }]} />
                                        <Text style={styles.camTitle}>Camera 1</Text>
                                    </View>
                                    <TouchableOpacity onPress={handleRefreshCamera1} style={styles.refreshBtn}>
                                        <Icon name="refresh" size={16} color="#94A3B8" />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.imageContainer}>
                                    {refreshing1 ? (
                                        <View style={styles.cameraLoading}>
                                            <ActivityIndicator color="#10B981" />
                                        </View>
                                    ) : (
                                        <Image 
                                            key={cameraKey1}
                                            source={{ uri: `${CAMERA_URL}?_=${cameraKey1}`, headers: { 'ngrok-skip-browser-warning': 'true' } }}
                                            style={styles.cameraImg}
                                            resizeMode="stretch"
                                            onError={() => setCameraConnected1(false)}
                                            onLoad={() => setCameraConnected1(true)}
                                        />
                                    )}
                                </View>
                            </View>

                            {/* Camera 2 */}
                            <View style={styles.cameraCard}>
                                <View style={styles.camHeader}>
                                    <View style={styles.camTitleRow}>
                                        {/* Green/Red status indicator */}
                                        <View style={[styles.camStatusDot, { backgroundColor: cameraConnected2 ? '#22C55E' : '#EF4444' }]} />
                                        <Text style={styles.camTitle}>Camera 2</Text>
                                    </View>
                                    <TouchableOpacity onPress={handleRefreshCamera2} style={styles.refreshBtn}>
                                        <Icon name="refresh" size={16} color="#94A3B8" />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.imageContainer}>
                                    {refreshing2 ? (
                                        <View style={styles.cameraLoading}>
                                            <ActivityIndicator color="#10B981" />
                                        </View>
                                    ) : (
                                        <Image 
                                            key={cameraKey2}
                                            source={{ uri: `${CAMERA_URL2}?_=${cameraKey2}`, headers: { 'ngrok-skip-browser-warning': 'true' } }}
                                            style={styles.cameraImg}
                                            resizeMode="stretch"
                                            onError={() => setCameraConnected2(false)}
                                            onLoad={() => setCameraConnected2(true)}
                                        />
                                    )}
                                </View>
                            </View>
                        </View>
                        <View style={styles.logBox}>
                            <Text style={styles.logTitle}>Greenhouse Camera Logs</Text>
                            <Text style={styles.logSubtitle}>Latest movement and system activity</Text>
                            
                            <View style={styles.tableHead}>
                                <Text style={[styles.th, styles.thFirst]}>Source</Text>
                                <Text style={[styles.th, styles.thSecond]}>Type</Text>
                                <Text style={[styles.th, styles.thThird]}>Timestamp</Text>
                                <Text style={[styles.th, styles.thFourth]}>Status</Text>
                            </View>
                            {['Cam 1', 'Cam 2'].map((cam, i) => (
                                <View key={i} style={styles.tableRow}>
                                    <Text style={[styles.td, styles.tdFirst]}>{cam}</Text>
                                    <Text style={[styles.td, styles.tdSecond]}>Video Feed</Text>
                                    <View style={[styles.tdStatus, styles.tdThird]}>
                                        <Text style={styles.tdTimeText}>{new Date().toLocaleTimeString()}</Text>
                                    </View>
                                    <View style={[styles.tdStatus, styles.tdFourth]}>
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>Active</Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : (
                    <View>
                        <View style={styles.sensorArea}>
                            <Text style={styles.sectionTitle}>Temperature</Text>
                            <View style={styles.grid}>
                                {sensorData.tempZones.map(item => <SensorCard key={item.id} item={item} typeIcon="thermometer" />)}
                            </View>
                            <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Soil Humidity</Text>
                            <View style={styles.grid}>
                                {sensorData.soilZones.map(item => <SensorCard key={item.id} item={item} typeIcon="water" />)}
                            </View>
                        </View>

                        <View style={styles.logBox}>
                            <Text style={styles.logTitle}>Recent Sensor Readings</Text>
                            <Text style={styles.logSubtitle}>Live data telemetry from all zones</Text>
                            
                            <View style={styles.tableHead}>
                                <Text style={[styles.th, styles.thFirst]}>Zone</Text>
                                <Text style={[styles.th, styles.thSecond]}>Type</Text>
                                <Text style={[styles.th, styles.thThird]}>Alert Level</Text>
                                <Text style={[styles.th, styles.thFourth]}>Status</Text>
                            </View>
                            {recentReadings.map((zone) => {
                                const alert = getAlertLevel(zone.tempValue, zone.soilValue);
                                return (
                                    <View key={zone.zone} style={styles.tableRow}>
                                        <Text style={[styles.td, styles.tdFirst]}>Zone {zone.zone}</Text>
                                        <Text style={[styles.td, styles.tdSecond]}>Climate</Text>
                                        <View style={[styles.tdStatus, styles.tdThird]}>
                                            <View style={[styles.alertBadge, { backgroundColor: `${alert.color}15` }]}>
                                                <Icon name={alert.icon} size={12} color={alert.color} />
                                                <Text style={[styles.alertText, { color: alert.color }]}>
                                                    {alert.level}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={[styles.tdStatus, styles.tdFourth]}>
                                            <View style={[styles.badge, !zone.isActive && styles.badgeInactive]}>
                                                <Text style={[styles.badgeText, !zone.isActive && styles.badgeTextInactive]}>
                                                    {zone.isActive ? 'Active' : 'Inactive'}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mainWrapper: { flex: 1, padding: 24 },
    header: { marginBottom: 10, marginTop: -20 },
    headerTitle: { fontSize: 36, fontWeight: '900', color: '#1E293B', marginBottom: 12 },
    tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    tabItem: { paddingBottom: 10, marginRight: 25, marginTop: -10 },
    activeTab: { borderBottomWidth: 3, borderBottomColor: '#10B981' },
    tabText: { fontSize: 14, fontWeight: '600', color: '#94A3B8' },
    activeTabText: { color: '#1E293B' },
    cameraGrid: { 
        flexDirection: 'row', 
        gap: 15, 
        marginBottom: 20,
        alignItems: 'stretch'
    }, 
    cameraCard: { 
        flex: 1, 
        backgroundColor: '#FFF', 
        borderRadius: 20, 
        padding: 12, 
        borderWidth: 1, 
        borderColor: '#F1F5F9',
        justifyContent: 'space-between'
    },
    camHeader: { 
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    camTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    camStatusDot: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    camTitle: { 
        fontSize: 16, 
        fontWeight: '700', 
        color: '#1E293B'
    },
    refreshBtn: {
        padding: 4
    },
    imageContainer: {
        width: '100%',
        aspectRatio: 16 / 9,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#F1F5F9'
    },
    cameraLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        height: '100%'
    },
    cameraImg: { 
        width: '100%',
        height: '100%',
        borderRadius: 12
    },
    sensorArea: { marginBottom: 20 }, 
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#64748B', marginBottom: 10, textTransform: 'uppercase' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    card: { backgroundColor: '#FFF', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#F1F5F9' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    iconBox: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    cardLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8' },
    cardValue: { fontSize: 22, fontWeight: '800', color: '#1E293B', marginTop: -25 },
    trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 10 },
    cardTrend: { fontSize: 10, fontWeight: '700' },
    logBox: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: 40 },
    logTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
    logSubtitle: { fontSize: 12, color: '#94A3B8', marginBottom: 15 },
    tableHead: { flexDirection: 'row', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    th: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textAlign: 'center' },
    thFirst: { flex: 0.8, textAlign: 'left' },
    thSecond: { flex: 0.8, textAlign: 'center' },  
    thThird: { flex: 1.2, textAlign: 'center' },
    thFourth: { flex: 0.8, textAlign: 'center' },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    td: { fontSize: 13, color: '#1E293B', fontWeight: '500', textAlign: 'center' },
    tdFirst: { flex: 0.8, textAlign: 'left' },
    tdSecond: { flex: 0.8, textAlign: 'center' },
    tdThird: { flex: 1.2, alignItems: 'center' },
    tdFourth: { flex: 0.8, alignItems: 'center' },
    tdStatus: { alignItems: 'center' },
    tdTimeText: { fontSize: 13, color: '#64748B', fontWeight: '500' },
    badge: { backgroundColor: '#F0FDF4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    badgeInactive: { backgroundColor: '#FEE2E2' },
    badgeText: { color: '#10B981', fontSize: 10, fontWeight: '800' },
    badgeTextInactive: { color: '#EF4444' },
    alertBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 4, 
        paddingHorizontal: 10, 
        paddingVertical: 4, 
        borderRadius: 20 
    },
    alertText: { 
        fontSize: 11, 
        fontWeight: '800' 
    }
});