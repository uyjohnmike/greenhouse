import { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    InteractionManager,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// --- MOCK DATA ---
const TABS = ['General Reports', 'Sensor Logs', 'Pest Logs'];

const LOG_DATA = [
    { id: 'GH-2023-001', tag: 'Plant Care Guidelines', desc: 'Ensure proper light levels and humidity.', water: 'Moderate', trend: 'arrow-right' },
    { id: 'GH-2023-002', tag: 'Pest Management', desc: 'Adjust temperature settings.', water: 'Moderate', trend: 'arrow-right' },
    { id: 'GH-2023-003', tag: 'Fungal Alert', desc: 'New ventilation system needed!', water: 'High', trend: 'arrow-up' },
    { id: 'GH-2023-004', tag: 'Nutrient Delivery', desc: 'Irrigation malfunctioning; fix immediately.', water: 'Moderate', trend: 'arrow-right' },
];

export default function Reports() {
    const [activeTab, setActiveTab] = useState('General Reports');
    const [layoutWidth, setLayoutWidth] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    const chartConfig = useMemo(() => ({
        backgroundGradientFrom: "#FFF",
        backgroundGradientTo: "#FFF",
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(180, 211, 51, ${opacity})`,
        labelColor: (opacity = 1) => `rgba(153, 153, 153, ${opacity})`, 
        propsForDots: { r: "0" },
        propsForBackgroundLines: { strokeDasharray: "5, 5", stroke: "#E0E0E0" },
        fillShadowGradient: "#10B981",
        fillShadowGradientOpacity: 0.2,
    }), []);

    const miniChartData = useMemo(() => ({
        labels: ["'19", "'20", "'21", "'22", "'23"],
        datasets: [{ data: [15, 45, 12, 70, 95] }]
    }), []);

    const handleLayout = (e) => {
        const newWidth = e.nativeEvent.layout.width;
        if (Math.abs(layoutWidth - newWidth) > 5) {
            setIsTransitioning(true);
            InteractionManager.runAfterInteractions(() => {
                setLayoutWidth(newWidth);
                setIsTransitioning(false);
            });
        }
    };

    const renderGeneralReports = () => (
        <View>
            {/* ENHANCED TOP STAT CARDS */}
            <View style={styles.topCardsRow}>
                {[{l: 'Temperature', v: '22°c', s: 'Vs last week', i: 'arrow-top-right', c: '#B4D333'},
                  {l: 'Soil Humidity', v: '12%', s: 'Vs last week', i: 'arrow-top-right', c: '#FF5C5C'},
                  {l: 'Pest Incidents', v: '4%', s: '96/100 closed', i: 'check-circle-outline', c: '#10B981'}].map((card, idx) => (
                    <View key={idx} style={styles.enhancedStatCard}>
                        <Text style={styles.statLabel} numberOfLines={1}>{card.l}</Text>
                        <View style={styles.valueRow}>
                            <Text style={styles.statValue}>{card.v}</Text>
                            <Icon name={card.i} size={18} color={card.c} />
                        </View>
                        <Text style={styles.statSub}>{card.s}</Text>
                    </View>
                ))}
            </View>

            {/* Charts Row */}
            <View style={styles.bottomChartsRow}>
                {/* PEST CHART (4 Boxes) */}
                <View style={[styles.whiteCard, { flex: 1, padding: 12 }]}>
                    <View style={styles.chartHeader}>
                        <Text style={styles.chartTitle}>Pests</Text>
                        <Text style={styles.chartFilter}>Healthy <Icon name="chevron-down" size={12}/></Text>
                    </View>
                    <View style={styles.chartFrame}>
                        {isTransitioning || layoutWidth === 0 ? (
                            <ActivityIndicator color="#10B981" />
                        ) : (
                            <LineChart 
                                data={miniChartData} 
                                width={layoutWidth * 0.42} 
                                height={160} 
                                chartConfig={chartConfig} 
                                bezier 
                                style={styles.chartStyle}
                            />
                        )}
                    </View>
                    <View style={styles.floatingStats}>
                        <View style={styles.floatBox}><Text style={styles.fVal}>10</Text><Text style={styles.fLbl}>Today</Text></View>
                        <View style={styles.floatBox}><Text style={styles.fVal}>25</Text><Text style={styles.fLbl}>Past</Text></View>
                        <View style={styles.floatBox}><Text style={styles.fVal}>30</Text><Text style={styles.fLbl}>Mo.</Text></View>
                        <View style={styles.floatBox}><Text style={styles.fVal}>90</Text><Text style={styles.fLbl}>All</Text></View>
                    </View>
                </View>

                {/* CROPS CHART (3 Corrected Boxes) */}
                <View style={[styles.whiteCard, { flex: 1, padding: 12 }]}>
                    <View style={styles.chartHeader}>
                        <Text style={styles.chartTitle}>Crops</Text>
                        <Text style={styles.chartFilter}>Yearly <Icon name="chevron-down" size={12}/></Text>
                    </View>
                    <View style={styles.chartFrame}>
                        {isTransitioning || layoutWidth === 0 ? (
                            <ActivityIndicator color="#10B981" />
                        ) : (
                            <LineChart 
                                data={miniChartData} 
                                width={layoutWidth * 0.42} 
                                height={160} 
                                chartConfig={chartConfig} 
                                bezier 
                                style={styles.chartStyle}
                            />
                        )}
                    </View>
                    <View style={styles.floatingStats}>
                        <View style={styles.floatBox}><Text style={styles.fVal}>2,000</Text><Text style={styles.fLbl}>Today</Text></View>
                        <View style={styles.floatBox}><Text style={styles.fVal}>45k</Text><Text style={styles.fLbl}>Mo.</Text></View>
                        <View style={styles.floatBox}><Text style={styles.fVal}>100k</Text><Text style={styles.fLbl}>All</Text></View>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderLogs = () => (
        <View style={styles.whiteCard}>
            {LOG_DATA.map((item, index) => (
                <View key={index} style={[styles.tableRow, index === LOG_DATA.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.tagWrapper}><Text style={styles.tagText}>{item.tag}</Text></View>
                        <Text style={styles.cellId}>{item.id}</Text>
                        <Text style={styles.cellDesc} numberOfLines={1}>{item.desc}</Text>
                    </View>
                    <View style={styles.waterCell}>
                        <Icon name={item.trend} size={14} color="#333" />
                        <Text style={styles.waterText}>{item.water}</Text>
                    </View>
                </View>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={{ flex: 1 }} onLayout={handleLayout}>
                <View style={styles.header}>
                    <Text style={styles.mainTitle} numberOfLines={1}>
                        {activeTab === 'General Reports' ? 'Reports' : activeTab === 'Sensor Logs' ? "Sensor's Reports" : 'Pest Reports'}
                    </Text>
                    <View style={styles.tabBar}>
                        {TABS.map(tab => (
                            <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabItem, activeTab === tab && styles.activeTab]}>
                                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    {activeTab === 'General Reports' ? renderGeneralReports() : renderLogs()}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    header: { paddingHorizontal: 25, paddingTop: 20 },
    mainTitle: { fontSize: 32, fontWeight: '800', color: '#1E293B', marginBottom: 10 },
    tabBar: { flexDirection: 'row', gap: 20 },
    tabItem: { paddingBottom: 10 },
    activeTab: { borderBottomWidth: 3, borderBottomColor: '#10B981' },
    tabText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
    activeTabText: { color: '#1E293B' },
    content: { padding: 25 },

    whiteCard: { 
        backgroundColor: '#FFF', 
        borderRadius: 16, 
        padding: 15, 
        marginBottom: 20,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
    },

    topCardsRow: { flexDirection: 'row', marginBottom: 25, gap: 10 },
    enhancedStatCard: { 
        flex: 1, 
        backgroundColor: '#FFF', 
        padding: 12, 
        borderRadius: 14, 
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    statLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
    valueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    statValue: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
    statSub: { fontSize: 10, color: '#94A3B8', marginTop: 4, fontWeight: '500' },

    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 15, color: '#1E293B' },
    
    bottomChartsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 15 },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    chartTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    chartFilter: { fontSize: 11, color: '#94A3B8', fontWeight: '700' },
    chartFrame: { height: 140, justifyContent: 'center', alignItems: 'center' },
    chartStyle: { marginLeft: -20 },
    
    floatingStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25, gap: 6 },
    floatBox: { 
        backgroundColor: '#F8FAFC', 
        paddingVertical: 8, 
        borderRadius: 8, 
        borderWidth: 1, 
        borderColor: '#F1F5F9', 
        alignItems: 'center', 
        flex: 1, 
    },
    fVal: { fontWeight: '900', fontSize: 12, color: '#0F172A' },
    fLbl: { fontSize: 8, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },

    tableRow: { flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
    cellId: { fontSize: 13, fontWeight: '700', color: '#333' },
    tagWrapper: { backgroundColor: '#F1F5F9', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginBottom: 4 },
    tagText: { fontSize: 9, fontWeight: '800', color: '#475569' },
    cellDesc: { fontSize: 11, color: '#64748B' },
    waterCell: { alignItems: 'flex-end', minWidth: 60 },
    waterText: { fontSize: 11, fontWeight: '700', color: '#1E293B' }
});