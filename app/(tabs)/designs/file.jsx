import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    useWindowDimensions
} from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CAMERA_URL, CAMERA_URL2, NGROK_URL } from "../../../ngrok_camera";
import { firstName } from "../index";

const AnimatedPath = Animated.createAnimatedComponent(Path);

const Dashboard = () => {
    const { width: windowWidth } = useWindowDimensions();
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // UI States for Actions and Modal
    const [selectedUser, setSelectedUser] = useState(null);
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [menuVisible, setMenuVisible] = useState(null); 
    
    const [insectModalVisible, setInsectModalVisible] = useState(false);
    const [dailyInsects, setDailyInsects] = useState([]);
    
    // Camera States
    const [activeCamera, setActiveCamera] = useState(NGROK_URL);
    const [cameraMenuVisible, setCameraMenuVisible] = useState(false);
    const [camLabel, setCamLabel] = useState("Cam 1");
    const [refreshingCamera, setRefreshingCamera] = useState(false);

    const [latestMetrics, setLatestMetrics] = useState({ 
        temp: "--", humidity: "--", soilHumidity: "--", npk: "--/--/--", waterLevel: "--",
        nitrogen: "--", phosphorus: "--", potassium: "--"
    });

    const [trends, setTrends] = useState({
        temp: { diff: 0, direction: 'stable' },
        humidity: { diff: 0, direction: 'stable' },
        soilHumidity: { diff: 0, direction: 'stable' },
        npk: { diff: 0, direction: 'stable' },
        waterLevel: { diff: 0, direction: 'stable' }
    });

    // Graph Modal States
    const [graphModalVisible, setGraphModalVisible] = useState(false);
    const [graphType, setGraphType] = useState(null);
    const [npkSelected, setNpkSelected] = useState('nitrogen');
    const [graphData, setGraphData] = useState([]);
    const [graphLoading, setGraphLoading] = useState(false);
    const [chartLayout, setChartLayout] = useState({ width: 0 });
    
    // Hover state for graph
    const [hoverData, setHoverData] = useState(null);
    const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });

    // Integrated Pepper Detection State
    const [detections, setDetections] = useState({
        unripe: { count: 0, diff: 0, dir: 'stable' },
        semiRipe: { count: 0, diff: 0, dir: 'stable' },
        ripe: { count: 0, diff: 0, dir: 'stable' },
        reject: { count: 0, diff: 0, dir: 'stable' },
        insects: 0
    });

    const barData = [
        { h: 30, active: false }, { h: 35, active: false }, { h: 40, active: false },
        { h: 55, active: false }, { h: 70, active: false }, { h: 90, active: true },
        { h: 95, active: false }, { h: 70, active: false }, { h: 50, active: false },
        { h: 40, active: false }, { h: 35, active: false }, { h: 30, active: false },
        { h: 32, active: false }, { h: 38, active: false }, { h: 42, active: false },
        { h: 55, active: true }, { h: 75, active: false }
    ];

    const animatedHeights = useRef(barData.map(() => new Animated.Value(0))).current;
    
    // Graph animation value
    const drawAnim = useRef(new Animated.Value(0)).current;

    // Graph constants
    const GRAPH_HEIGHT = 180;
    const TOP_PADDING = 15;
    const LEFT_MARGIN = 40;
    const RIGHT_MARGIN = 15;
    const START_HOUR = 7;
    const END_HOUR = 17;
    const TOTAL_HOURS_VISIBLE = END_HOUR - START_HOUR;
    
    const TIME_LABELS = [
        { label: "7AM", hr: 7 }, { label: "9AM", hr: 9 },
        { label: "11AM", hr: 11 }, { label: "1PM", hr: 13 },
        { label: "3PM", hr: 15 }, { label: "5PM", hr: 17 },
    ];

    useEffect(() => {
        const animations = barData.map((item, index) => {
            return Animated.timing(animatedHeights[index], {
                toValue: item.h,
                duration: 800,
                useNativeDriver: false,
                easing: Easing.out(Easing.exp)
            });
        });
        Animated.stagger(50, animations).start();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatHeaderDate = (date) => {
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        return `${date.toLocaleDateString('en-US', options)} | ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
    };

    const fetchLogs = async () => {
        try {
            const response = await fetch(`${NGROK_URL}/api/getalllogs`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            const data = await response.json();
            setLogs(data);
        } catch (error) { console.error("Error logs:", error); } finally { setLoadingLogs(false); }
    };

    const fetchPepperCounts = async () => {
        try {
            const pepperRes = await fetch(`${NGROK_URL}/api/getallbellpeppercount`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            const pepperData = await pepperRes.json();
            
            const insectRes = await fetch(`${NGROK_URL}/api/getallpestlogs`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            const insectData = await insectRes.json();

            const todayStr = new Date().toISOString().split('T')[0];
            
            const todayInsects = insectData.filter(item => item.created_at.startsWith(todayStr));
            setDailyInsects(todayInsects);

            const highestCountsMap = {};

            insectData.forEach(item => {
                if (item.created_at.startsWith(todayStr)) {
                    const name = item.insect_name.toLowerCase().trim();
                    const countValue = parseInt(item.counts) || 0;

                    if (!highestCountsMap[name] || countValue > highestCountsMap[name]) {
                        highestCountsMap[name] = countValue;
                    }
                }
            });

            const totalInsectCount = Object.values(highestCountsMap).reduce((sum, val) => sum + val, 0);

            if (pepperData?.length > 0) {
                const latest = pepperData[0];
                const prev = pepperData[1] || latest;

                const getDir = (curr, old) => curr > old ? 'up' : curr < old ? 'down' : 'stable';
                const getDiff = (curr, old) => Math.abs(curr - old);

                setDetections({
                    unripe: { 
                        count: parseInt(latest.unripe), 
                        diff: getDiff(parseInt(latest.unripe), parseInt(prev.unripe)), 
                        dir: getDir(parseInt(latest.unripe), parseInt(prev.unripe)) 
                    },
                    semiRipe: { 
                        count: parseInt(latest["semi-ripe"]), 
                        diff: getDiff(parseInt(latest["semi-ripe"]), parseInt(prev["semi-ripe"])), 
                        dir: getDir(parseInt(latest["semi-ripe"]), parseInt(prev["semi-ripe"])) 
                    },
                    ripe: { 
                        count: parseInt(latest.ripe), 
                        diff: getDiff(parseInt(latest.ripe), parseInt(prev.ripe)), 
                        dir: getDir(parseInt(latest.ripe), parseInt(prev.ripe)) 
                    },
                    reject: { 
                        count: parseInt(latest.reject), 
                        diff: getDiff(parseInt(latest.reject), parseInt(prev.reject)), 
                        dir: getDir(parseInt(latest.reject), parseInt(prev.reject)) 
                    },
                    insects: totalInsectCount
                });
            }
        } catch (e) { 
            console.error("Error counts:", e); 
        }
    };

    const fetchAirMetrics = async () => {
        try {
            const response = await fetch(`${NGROK_URL}/api/getalltemperature`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            const data = await response.json();
            if (data?.length > 0) {
                const latest = data[0], prev = data[1] || latest;
                const tDiff = (parseFloat(latest.temperature) - parseFloat(prev.temperature)).toFixed(1);
                const hDiff = (parseFloat(latest.airhumidity) - parseFloat(prev.airhumidity)).toFixed(0);
                setLatestMetrics(p => ({ ...p, temp: parseFloat(latest.temperature).toFixed(1), humidity: parseFloat(latest.airhumidity).toFixed(0) }));
                setTrends(t => ({ ...t, temp: { diff: Math.abs(tDiff), direction: tDiff > 0 ? 'up' : tDiff < 0 ? 'down' : 'stable' }, 
                                         humidity: { diff: Math.abs(hDiff), direction: hDiff > 0 ? 'up' : hDiff < 0 ? 'down' : 'stable' } }));
            }
        } catch (e) { console.error(e); }
    };

    const fetchSoilMetrics = async () => {
        try {
            const response = await fetch(`${NGROK_URL}/api/getallsoilhumidity`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            const data = await response.json();
            if (data?.length > 0) {
                const latest = data[0], prev = data[1] || latest;
                const sDiff = (parseFloat(latest.soilaverage) - parseFloat(prev.soilaverage)).toFixed(0);
                setLatestMetrics(p => ({ ...p, soilHumidity: parseFloat(latest.soilaverage).toFixed(0) }));
                setTrends(t => ({ ...t, soilHumidity: { diff: Math.abs(sDiff), direction: sDiff > 0 ? 'up' : sDiff < 0 ? 'down' : 'stable' } }));
            }
        } catch (e) { console.error(e); }
    };

    const fetchNPKMetrics = async () => {
        try {
            const response = await fetch(`${NGROK_URL}/api/getallnpk`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            const data = await response.json();
            if (data?.length > 0) {
                const latest = data[0];
                setLatestMetrics(p => ({ 
                    ...p, 
                    npk: `${parseFloat(latest.nitrogen).toFixed(0)}% / ${parseFloat(latest.phosphorus).toFixed(0)}% / ${parseFloat(latest.potassium).toFixed(0)}%`,
                    nitrogen: parseFloat(latest.nitrogen).toFixed(0),
                    phosphorus: parseFloat(latest.phosphorus).toFixed(0),
                    potassium: parseFloat(latest.potassium).toFixed(0)
                }));
                
                if (data.length > 1) {
                    const prev = data[1];
                    const nDiff = (parseFloat(latest.nitrogen) - parseFloat(prev.nitrogen)).toFixed(0);
                    setTrends(t => ({ ...t, npk: { diff: Math.abs(nDiff), direction: nDiff > 0 ? 'up' : nDiff < 0 ? 'down' : 'stable' } }));
                }
            }
        } catch (e) { console.error(e); }
    };

    const fetchWaterLevel = async () => {
        try {
            const response = await fetch(`${NGROK_URL}/api/getallwaterlevel`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            const data = await response.json();
            if (data?.length > 0) {
                const latest = data[0], prev = data[1] || latest;
                const wDiff = (parseFloat(latest.level) - parseFloat(prev.level)).toFixed(1);
                setLatestMetrics(p => ({ ...p, waterLevel: parseFloat(latest.level).toFixed(1) }));
                setTrends(t => ({ ...t, waterLevel: { diff: Math.abs(wDiff), direction: wDiff > 0 ? 'up' : wDiff < 0 ? 'down' : 'stable' } }));
            }
        } catch (e) { console.error(e); }
    };

    // Fetch graph data for the selected metric
    const fetchGraphData = async (type, npkType = null) => {
        setGraphLoading(true);
        const todayStr = new Date().toISOString().split('T')[0];
        
        try {
            let endpoint = '';
            let key = '';
            
            if (type === 'soil') {
                endpoint = `${NGROK_URL}/api/getallsoilhumidity`;
                key = 'soilaverage';
            } else if (type === 'npk') {
                endpoint = `${NGROK_URL}/api/getallnpk`;
                key = npkType;
            } else {
                endpoint = `${NGROK_URL}/api/getalltemperature`;
                key = type === 'temp' ? 'temperature' : 'airhumidity';
            }
            
            const response = await fetch(endpoint, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            const result = await response.json();
            
            const filtered = result.filter(item => {
                const dateObj = new Date(item.created_at);
                const itemDateStr = dateObj.toISOString().split('T')[0];
                const hour = dateObj.getHours();
                return itemDateStr === todayStr && hour >= START_HOUR && hour <= END_HOUR;
            }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            
            setGraphData(filtered);
            drawAnim.setValue(0);
            Animated.timing(drawAnim, { toValue: 1, duration: 1500, useNativeDriver: false }).start();
        } catch (error) {
            console.error("Fetch Error:", error);
        } finally {
            setGraphLoading(false);
        }
    };

    const handleMetricClick = (type, npkType = null) => {
        setGraphType(type);
        setHoverData(null);
        if (type === 'npk' && npkType) {
            setNpkSelected(npkType);
            fetchGraphData(type, npkType);
        } else if (type === 'soil') {
            fetchGraphData(type);
        } else {
            fetchGraphData(type);
        }
        setGraphModalVisible(true);
    };

    const handleNpkTabChange = (npkType) => {
        setNpkSelected(npkType);
        setHoverData(null);
        fetchGraphData('npk', npkType);
    };

    useEffect(() => {
        const refreshAll = () => { 
            fetchLogs(); 
            fetchAirMetrics(); 
            fetchSoilMetrics(); 
            fetchNPKMetrics(); 
            fetchWaterLevel(); 
            fetchPepperCounts();
        };
        refreshAll();
        const interval = setInterval(refreshAll, 30000);
        return () => clearInterval(interval);
    }, []);

    const getTimeAgo = (t) => {
        const diff = Math.floor((new Date() - new Date(t)) / 60000);
        return diff < 1 ? 'Just now' : diff < 60 ? `${diff}m ago` : diff < 1440 ? `${Math.floor(diff/60)}h ago` : new Date(t).toLocaleDateString();
    };

    // Graph helper functions
    const getCoordinateX = (hourVal, width) => {
        const usableWidth = width - (LEFT_MARGIN + RIGHT_MARGIN);
        const progress = (hourVal - START_HOUR) / TOTAL_HOURS_VISIBLE;
        return LEFT_MARGIN + (progress * usableWidth);
    };

    const getYPos = (val, max) => TOP_PADDING + (GRAPH_HEIGHT - (parseFloat(val) / max) * GRAPH_HEIGHT);

    // Handle hover on graph
    const handleGraphHover = (evt, chartWidth, maxVal, key) => {
        const xPos = Platform.OS === 'web' ? evt.nativeEvent.offsetX : evt.nativeEvent.locationX;
        let closest = null;
        let minDiff = Infinity;

        graphData.forEach(d => {
            const date = new Date(d.created_at);
            const h = date.getHours() + (date.getMinutes() / 60);
            const x = getCoordinateX(h, chartWidth);
            const diff = Math.abs(xPos - x);
            if (diff < minDiff && diff < 30) {
                minDiff = diff;
                closest = d;
            }
        });
        
        if (closest) {
            const date = new Date(closest.created_at);
            const h = date.getHours() + (date.getMinutes() / 60);
            const x = getCoordinateX(h, chartWidth);
            const y = getYPos(closest[key], maxVal);
            setHoverData(closest);
            setHoverPosition({ x, y });
        }
    };

    // Render chart for modal
    const renderModalChart = () => {
        const type = graphType;
        let color = '#6366F1';
        let label = '';
        let icon = 'chart-line';
        let maxVal = 100;
        let step = 20;
        let unit = '%';
        let key = '';
        
        if (type === 'temp') {
            color = '#EF4444';
            label = 'Temperature';
            icon = 'thermometer';
            maxVal = 45;
            step = 5;
            unit = '°C';
            key = 'temperature';
        } else if (type === 'hum') {
            color = '#3B82F6';
            label = 'Air Humidity';
            icon = 'water-percent';
            maxVal = 100;
            step = 20;
            unit = '%';
            key = 'airhumidity';
        } else if (type === 'soil') {
            color = '#F59E0B';
            label = 'Soil Humidity';
            icon = 'sprout';
            maxVal = 100;
            step = 20;
            unit = '%';
            key = 'soilaverage';
        } else if (type === 'npk') {
            if (npkSelected === 'nitrogen') {
                color = '#10B981';
                label = 'Nitrogen (N)';
                icon = 'leaf';
                maxVal = 100;
                step = 20;
                unit = '%';
                key = 'nitrogen';
            } else if (npkSelected === 'phosphorus') {
                color = '#8B5CF6';
                label = 'Phosphorus (P)';
                icon = 'flower';
                maxVal = 100;
                step = 20;
                unit = '%';
                key = 'phosphorus';
            } else {
                color = '#EC4899';
                label = 'Potassium (K)';
                icon = 'seed';
                maxVal = 100;
                step = 20;
                unit = '%';
                key = 'potassium';
            }
        }

        const chartWidth = chartLayout.width || (windowWidth - 80);
        
        const yLabels = [];
        for (let i = 0; i <= maxVal; i += step) yLabels.push(i);

        const points = graphData.map(d => {
            const date = new Date(d.created_at);
            const h = date.getHours() + (date.getMinutes() / 60);
            return { x: getCoordinateX(h, chartWidth), y: getYPos(d[key], maxVal) };
        });

        let dString = points.length > 0 ? `M ${points[0].x} ${points[0].y}` : "";
        for (let i = 1; i < points.length; i++) dString += ` L ${points[i].x} ${points[i].y}`;

        // Calculate stats
        const latestValue = graphData.length > 0 ? parseFloat(graphData[graphData.length - 1][key]).toFixed(1) : '--';
        const avgValue = graphData.length > 0 ? (graphData.reduce((sum, d) => sum + parseFloat(d[key]), 0) / graphData.length).toFixed(1) : '--';
        const maxValue = graphData.length > 0 ? Math.max(...graphData.map(d => parseFloat(d[key]))).toFixed(1) : '--';
        const minValue = graphData.length > 0 ? Math.min(...graphData.map(d => parseFloat(d[key]))).toFixed(1) : '--';

        return (
            <View>
                {/* Header with Title and Date */}
                <View style={styles.modalGraphHeader}>
                    <View style={styles.modalGraphTitleContainer}>
                        <View style={[styles.modalIconCircle, { backgroundColor: color + '15' }]}>
                            <Icon name={icon} size={18} color={color} />
                        </View>
                        <View>
                            <Text style={styles.modalGraphTitle}>{label}</Text>
                            <Text style={styles.modalGraphSubtitle}>7:00 AM - 5:00 PM</Text>
                        </View>
                    </View>
                    {hoverData && (
                        <View style={styles.hoverPreviewBadge}>
                            <Text style={styles.hoverPreviewTime}>
                                {new Date(hoverData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            <Text style={[styles.hoverPreviewValue, { color }]}>
                                {parseFloat(hoverData[key]).toFixed(1)}{unit}
                            </Text>
                        </View>
                    )}
                </View>

                {/* NPK Tabs */}
                {type === 'npk' && (
                    <View style={styles.npkTabsContainer}>
                        <TouchableOpacity 
                            style={[styles.npkTab, npkSelected === 'nitrogen' && styles.npkTabActive]}
                            onPress={() => handleNpkTabChange('nitrogen')}
                        >
                            <Text style={[styles.npkTabText, npkSelected === 'nitrogen' && styles.npkTabTextActive]}>Nitrogen (N)</Text>
                            {npkSelected === 'nitrogen' && <View style={styles.npkTabUnderline} />}
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.npkTab, npkSelected === 'phosphorus' && styles.npkTabActive]}
                            onPress={() => handleNpkTabChange('phosphorus')}
                        >
                            <Text style={[styles.npkTabText, npkSelected === 'phosphorus' && styles.npkTabTextActive]}>Phosphorus (P)</Text>
                            {npkSelected === 'phosphorus' && <View style={styles.npkTabUnderline} />}
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.npkTab, npkSelected === 'potassium' && styles.npkTabActive]}
                            onPress={() => handleNpkTabChange('potassium')}
                        >
                            <Text style={[styles.npkTabText, npkSelected === 'potassium' && styles.npkTabTextActive]}>Potassium (K)</Text>
                            {npkSelected === 'potassium' && <View style={styles.npkTabUnderline} />}
                        </TouchableOpacity>
                    </View>
                )}

                {/* Chart Area */}
                <View 
                    style={styles.modalChartContainer}
                    onLayout={(e) => setChartLayout({ width: e.nativeEvent.layout.width })}
                >
                    {chartLayout.width > 0 && (
                        <View>
                            <Svg height={GRAPH_HEIGHT + TOP_PADDING + 25} width={chartLayout.width}>
                                <Defs>
                                    <LinearGradient id={`modalGrad${type}${npkSelected}`} x1="0" y1="0" x2="0" y2="1">
                                        <Stop offset="0" stopColor={color} stopOpacity="0.3" />
                                        <Stop offset="1" stopColor={color} stopOpacity="0" />
                                    </LinearGradient>
                                </Defs>
                                
                                {/* Y-axis labels and grid lines */}
                                {yLabels.map(val => (
                                    <G key={val}>
                                        <Line 
                                            x1={LEFT_MARGIN} 
                                            y1={getYPos(val, maxVal)} 
                                            x2={chartLayout.width - RIGHT_MARGIN} 
                                            y2={getYPos(val, maxVal)} 
                                            stroke="#E2E8F0" 
                                            strokeWidth="0.5" 
                                            strokeDasharray="4 4"
                                        />
                                        <SvgText 
                                            x={LEFT_MARGIN - 8} 
                                            y={getYPos(val, maxVal) + 4} 
                                            fontSize={10} 
                                            fill="#94A3B8" 
                                            textAnchor="end" 
                                            fontWeight="600"
                                        >
                                            {val}{unit === '°C' ? '°' : ''}
                                        </SvgText>
                                    </G>
                                ))}

                                {/* X-axis time labels */}
                                {TIME_LABELS.map((t) => (
                                    <SvgText 
                                        key={t.label}
                                        x={getCoordinateX(t.hr, chartLayout.width)} 
                                        y={GRAPH_HEIGHT + TOP_PADDING + 15} 
                                        fontSize={9} 
                                        fill="#64748B" 
                                        textAnchor="middle" 
                                        fontWeight="600"
                                    >
                                        {t.label}
                                    </SvgText>
                                ))}

                                {/* Data line and area fill */}
                                {points.length > 1 && (
                                    <>
                                        <AnimatedPath 
                                            d={`${dString} V ${GRAPH_HEIGHT + TOP_PADDING} H ${points[0].x} Z`} 
                                            fill={`url(#modalGrad${type}${npkSelected})`} 
                                            opacity={drawAnim} 
                                        />
                                        <AnimatedPath 
                                            d={dString} 
                                            fill="none" 
                                            stroke={color} 
                                            strokeWidth="2.5" 
                                            strokeLinejoin="round"
                                            strokeLinecap="round"
                                        />
                                        {/* Data points */}
                                        {points.map((point, idx) => (
                                            <Circle
                                                key={idx}
                                                cx={point.x}
                                                cy={point.y}
                                                r="3"
                                                fill={color}
                                                stroke="#FFF"
                                                strokeWidth="1.5"
                                            />
                                        ))}
                                    </>
                                )}

                                {points.length === 0 && !graphLoading && (
                                    <SvgText x={chartLayout.width / 2} y={GRAPH_HEIGHT / 2} fontSize={12} fill="#94A3B8" textAnchor="middle">
                                        No data available for this date
                                    </SvgText>
                                )}

                                {/* Hover Tooltip */}
                                {hoverData && (
                                    <G>
                                        <Line 
                                            x1={hoverPosition.x} 
                                            y1={TOP_PADDING} 
                                            x2={hoverPosition.x} 
                                            y2={GRAPH_HEIGHT + TOP_PADDING} 
                                            stroke={color} 
                                            strokeWidth="1" 
                                            strokeDasharray="4 3" 
                                        />
                                        <Circle 
                                            cx={hoverPosition.x} 
                                            cy={hoverPosition.y} 
                                            r="5" 
                                            fill={color} 
                                            stroke="#FFF" 
                                            strokeWidth="2" 
                                        />
                                    </G>
                                )}
                            </Svg>

                            {/* Interactive Hover Layer */}
                            <View 
                                style={[StyleSheet.absoluteFill, { top: 0, left: 0, right: 0, bottom: 25 }]}
                                onPointerMove={(e) => handleGraphHover(e, chartLayout.width, maxVal, key)}
                                onPointerLeave={() => setHoverData(null)}
                                onStartShouldSetResponder={() => true}
                                onResponderMove={(e) => handleGraphHover(e, chartLayout.width, maxVal, key)}
                                onResponderRelease={() => setHoverData(null)}
                            />
                        </View>
                    )}
                </View>

                {/* Stats Cards */}
                {graphData.length > 0 && (
                    <View style={styles.modalStatsGrid}>
                        <View style={styles.modalStatCard}>
                            <Icon name="chart-line" size={14} color={color} />
                            <Text style={styles.modalStatCardLabel}>Latest</Text>
                            <Text style={[styles.modalStatCardValue, { color }]}>{latestValue}{unit}</Text>
                        </View>
                        <View style={styles.modalStatCard}>
                            <Icon name="chart-areaspline" size={14} color="#6366F1" />
                            <Text style={styles.modalStatCardLabel}>Average</Text>
                            <Text style={styles.modalStatCardValue}>{avgValue}{unit}</Text>
                        </View>
                        <View style={styles.modalStatCard}>
                            <Icon name="trending-up" size={14} color="#10B981" />
                            <Text style={styles.modalStatCardLabel}>Max</Text>
                            <Text style={styles.modalStatCardValue}>{maxValue}{unit}</Text>
                        </View>
                        <View style={styles.modalStatCard}>
                            <Icon name="trending-down" size={14} color="#EF4444" />
                            <Text style={styles.modalStatCardLabel}>Min</Text>
                            <Text style={styles.modalStatCardValue}>{minValue}{unit}</Text>
                        </View>
                    </View>
                )}

                {/* Data points info */}
                {graphData.length > 0 && (
                    <View style={styles.modalDataInfo}>
                        <Icon name="database" size={12} color="#94A3B8" />
                        <Text style={styles.modalDataInfoText}>{graphData.length} readings recorded</Text>
                    </View>
                )}
            </View>
        );
    };

    // ACTION HANDLERS
    const handleViewInfo = (user) => {
        setSelectedUser(user);
        setMenuVisible(null);
        setInfoModalVisible(true);
    };

    const handleRemoveLog = (index) => {
        setLogs(logs.filter((_, i) => i !== index));
        setMenuVisible(null);
    };

    const switchCamera = (camNumber, url) => {
        setActiveCamera(url);
        setCamLabel(`Cam ${camNumber}`);
        setCameraMenuVisible(false);
    };

    const handleRefreshCamera = () => {
        setRefreshingCamera(true);
        setTimeout(() => setRefreshingCamera(false), 500);
    };

    return (
        <View style={styles.container}>
            {/* INFORMATION MODAL */}
            <Modal transparent visible={infoModalVisible} animationType="fade">
                <TouchableWithoutFeedback onPress={() => setInfoModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.infoBox}>
                                <TouchableOpacity style={styles.closeBtn} onPress={() => setInfoModalVisible(false)}>
                                    <Icon name="close" size={20} color="#64748B" />
                                </TouchableOpacity>
                                
                                <Image 
                                    source={{ uri: `https://xvebncyvecfvocnqcxpk.supabase.co/storage/v1/object/public/images/${selectedUser?.profile}` }} 
                                    style={styles.modalAvatar}
                                    defaultSource={{ uri: `https://ui-avatars.com/api/?name=${selectedUser?.firstname}` }} 
                                />
                                
                                <Text style={styles.modalName}>{selectedUser?.firstname} {selectedUser?.lastname}</Text>
                                <Text style={styles.modalRole}>System User</Text>

                                <View style={styles.detailsContainer}>
                                    <DetailRow icon="email-outline" label="Email" value={selectedUser?.email} />
                                    <DetailRow icon="phone-outline" label="Phone" value={selectedUser?.phonenumber} />
                                    <DetailRow icon="map-marker-outline" label="Address" value={selectedUser?.address } />
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* GRAPH MODAL - With Hover Functionality */}
            <Modal transparent visible={graphModalVisible} animationType="fade">
                <TouchableWithoutFeedback onPress={() => setGraphModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.graphModalBox}>
                                <TouchableOpacity style={styles.graphCloseBtn} onPress={() => setGraphModalVisible(false)}>
                                    <Icon name="close" size={18} color="#64748B" />
                                </TouchableOpacity>

                                {graphLoading ? (
                                    <View style={styles.graphLoadingContainer}>
                                        <ActivityIndicator size="small" color="#6366F1" />
                                        <Text style={styles.graphLoadingText}>Loading chart...</Text>
                                    </View>
                                ) : (
                                    <ScrollView 
                                        showsVerticalScrollIndicator={false}
                                        contentContainerStyle={styles.graphScrollContent}
                                    >
                                        {renderModalChart()}
                                    </ScrollView>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <Modal transparent visible={insectModalVisible} animationType="fade">
                <TouchableWithoutFeedback onPress={() => setInsectModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback>
                            <View style={styles.infoBox}>
                                <TouchableOpacity style={styles.closeBtn} onPress={() => setInsectModalVisible(false)}>
                                    <Icon name="close" size={20} color="#64748B" />
                                </TouchableOpacity>

                                <View style={styles.pestIconCircle}>
                                    <Icon name="bug-check" size={32} color="#6366F1" />
                                </View>

                                <Text style={styles.modalName}>Daily Pest Report</Text>
                                <Text style={styles.modalRole}>{new Date().toLocaleDateString()}</Text>

                                <View style={[styles.detailsContainer, { marginTop: 20, width: '100%' }]}>
                                    <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
                                        {dailyInsects.length > 0 ? dailyInsects.map((bug, index) => (
                                            <View key={index} style={styles.pestDetailRow}>
                                                <View style={styles.detailIconBox}>
                                                    <Icon name="alert-decagram-outline" size={18} color="#6366F1" />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <Text style={styles.detailLabel}>{bug.insect_name.toUpperCase()}</Text>
                                                        <Text style={styles.pestCountBadge}>{bug.counts} Detected</Text>
                                                    </View>
                                                    <Text style={styles.detailValue} numberOfLines={2}>{bug.description}</Text>
                                                    <Text style={styles.pestTimeText}>
                                                        {new Date(bug.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </Text>
                                                </View>
                                            </View>
                                        )) : (
                                            <View style={{ alignItems: 'center', padding: 20 }}>
                                                <Icon name="shield-check" size={40} color="#10B981" />
                                                <Text style={[styles.detailValue, { marginTop: 10 }]}>Environment Clear</Text>
                                            </View>
                                        )}
                                    </ScrollView>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* REDESIGNED HEADER */}
            <View style={styles.topHeader}>
                <View style={styles.headerLeft}>
                    <View style={styles.welcomeRow}>
                        <Icon name="hand-wave-outline" size={22} color="#6366F1" />
                        <Text style={styles.headerGreeting}>Welcome back,</Text>
                    </View>
                    <Text style={styles.headerName}>{firstName}</Text>
                    <Text style={styles.headerDate}>{formatHeaderDate(currentTime)}</Text>
                </View>
                <View style={styles.headerRight}>
                    <View style={styles.dateBadge}>
                        <Icon name="calendar-blank" size={14} color="#6366F1" />
                        <Text style={styles.dateBadgeText}>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.metricsRow}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => handleMetricClick('temp')}>
                    <MetricCard label="Temp" value={`${latestMetrics.temp}°C`} icon="thermometer" color="#FF6B6B" trend={trends.temp} unit="°" />
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => handleMetricClick('hum')}>
                    <MetricCard label="Air Humidity" value={`${latestMetrics.humidity}%`} icon="water-percent" color="#4D96FF" trend={trends.humidity} unit="%" />
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => handleMetricClick('npk', 'nitrogen')}>
                    <MetricCard label="NPK Level" value={latestMetrics.npk} icon="flask" color="#10B981" trend={trends.npk} unit="%" />
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => handleMetricClick('soil')}>
                    <MetricCard label="Soil Humidity" value={`${latestMetrics.soilHumidity}%`} icon="sprout" color="#F59E0B" trend={trends.soilHumidity} unit="%" />
                </TouchableOpacity>
            </View>

            <View style={styles.mainGrid}>
                {/* LEFT COLUMN */}
                <View style={styles.leftCol}>
                    <View style={[styles.card, styles.cameraBox]}>
                        <View style={styles.bentoHeader}>
                            <View style={styles.titleWithIcon}>
                                <View style={styles.livePulse} />
                                <Text style={styles.bentoTitle}>Live Feed: {camLabel}</Text>
                            </View>
                            
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative', zIndex: 50 }}>
                                <TouchableOpacity onPress={handleRefreshCamera}>
                                    <Icon name="refresh" size={20} color="#94A3B8" />
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => setCameraMenuVisible(!cameraMenuVisible)}>
                                    <Icon name="dots-horizontal" size={20} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        {refreshingCamera ? (
                            <View style={[styles.cameraFeed, { justifyContent: 'center', alignItems: 'center' }]}>
                                <ActivityIndicator color="#6366F1" />
                            </View>
                        ) : (
                            <Image 
                                key={activeCamera} 
                                source={{ uri: activeCamera, headers: { 'ngrok-skip-browser-warning': 'true' } }} 
                                style={styles.cameraFeed} 
                                resizeMode="cover" 
                            />
                        )}

                        {cameraMenuVisible && (
                            <View style={styles.cameraDropdown}>
                                <TouchableOpacity 
                                    style={styles.dropdownItem} 
                                    onPress={() => switchCamera(1, CAMERA_URL)}
                                >
                                    <Icon name="video-outline" size={14} color={camLabel === "Cam 1" ? "#6366F1" : "#64748B"} />
                                    <Text style={[styles.dropdownItemText, camLabel === "Cam 1" && {color: '#6366F1'}]}>Camera 1</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.dropdownItem} 
                                    onPress={() => switchCamera(2, CAMERA_URL2)}
                                >
                                    <Icon name="video-outline" size={14} color={camLabel === "Cam 2" ? "#6366F1" : "#64748B"} />
                                    <Text style={[styles.dropdownItemText, camLabel === "Cam 2" && {color: '#6366F1'}]}>Camera 2</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    <View style={[styles.card, styles.cropsBox]}>
                        <View style={styles.bentoHeader}>
                            <Text style={styles.bentoTitle}>Crop Health</Text>
                            <View style={styles.dropdownMini}>
                                <Text style={styles.dropdownText}>Weekly</Text>
                                <Icon name="chevron-down" size={14} color="#94A3B8" />
                            </View>
                        </View>
                        
                        <View style={styles.barGraphContainer}>
                            {barData.map((item, index) => (
                                <View key={index} style={styles.barWrapper}>
                                    <Animated.View style={[
                                        styles.bar, 
                                        { 
                                          height: animatedHeights[index].interpolate({
                                            inputRange: [0, 100],
                                            outputRange: ['0%', '100%']
                                          }) 
                                        },
                                        item.active ? styles.barActive : styles.barInactive
                                    ]} />
                                </View>
                            ))}
                        </View>

                        <View style={styles.xAxisLabels}>
                            {['Mar 23', 'Mar 24', 'Mar 25', 'Mar 26'].map((d, i) => (
                                <Text key={i} style={styles.xLabelText}>{d}</Text>
                            ))}
                        </View>

                        <View style={styles.graphStats}>
                            <StatBox label="260" sub="Today" />
                            <StatBox label="2300" sub="Monthly" />
                            <StatBox label="4200" sub="Yearly" />
                        </View>
                    </View>
                </View>

                {/* RIGHT COLUMN */}
                <View style={styles.rightCol}>
                    <View style={[styles.card, styles.detectionCard]}>
                        <View style={styles.detectionHeader}>
                            <Text style={styles.detectionTitle}>Detection Analytics</Text>
                            <View style={styles.waterIndicator}>
                                <Icon name="water-outline" size={12} color="#4D96FF" />
                                <Text style={styles.waterValueText}>{latestMetrics.waterLevel}%</Text>
                            </View>
                        </View>
                        
                        <View style={styles.detectionMainGrid}>
                            <View style={styles.detectionGridRow}>
                                <DetectionItem label="Unripe" data={detections.unripe} color="#22C55E" icon="leaf" />
                                <DetectionItem label="Semi-Ripe" data={detections.semiRipe} color="#F59E0B" icon="leaf-circle" />
                            </View>
                            <View style={styles.detectionGridRow}>
                                <DetectionItem label="Ripe" data={detections.ripe} color="#EF4444" icon="leaf-circle" />
                                <DetectionItem label="Reject" data={detections.reject} color="#64748B" icon="close-octagon" />
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={styles.insectAlertBox} 
                            onPress={() => setInsectModalVisible(true)}
                        >
                            <View style={styles.insectIconBg}><Icon name="bug" size={18} color="#991B1B" /></View>
                            <View>
                                <Text style={styles.insectCountText}>{detections.insects} Insects Detected</Text>
                                <Text style={styles.insectSubText}>Critical Action Required</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.card2, styles.logsBox]}>
                        <Text style={styles.bentoTitle}>System Logs</Text>
                        {loadingLogs ? <ActivityIndicator size="small" color="#6366f1" style={{ marginTop: 20 }} /> : (
                            <ScrollView showsVerticalScrollIndicator={false} style={styles.logList}>
                                {logs.map((log, index) => (
                                    <View key={index} style={styles.logItem}>
                                        <Image source={{ uri: `https://xvebncyvecfvocnqcxpk.supabase.co/storage/v1/object/public/images/${log.profile}` }} style={styles.logAvatar} defaultSource={{ uri: `https://ui-avatars.com/api/?name=${log.firstname}` }} />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.logName} numberOfLines={1}>{log.fullName}</Text>
                                            <Text style={styles.logStatus}>{getTimeAgo(log.timestamp)}</Text>
                                        </View>
                                        
                                        <View style={{ position: 'relative', zIndex: 10 }}>
                                            <TouchableOpacity onPress={() => setMenuVisible(menuVisible === index ? null : index)}>
                                                <Icon name="dots-horizontal" size={20} color="#94A3B8" />
                                            </TouchableOpacity>

                                            {menuVisible === index && (
                                                <View style={styles.actionDropdown}>
                                                    <TouchableOpacity style={styles.dropdownItem} onPress={() => handleViewInfo(log)}>
                                                        <Icon name="information-outline" size={14} color="#64748B" />
                                                        <Text style={styles.dropdownItemText}>View Information</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity style={styles.dropdownItem} onPress={() => handleRemoveLog(index)}>
                                                        <Icon name="trash-can-outline" size={14} color="#EF4444" />
                                                        <Text style={[styles.dropdownItemText, { color: '#EF4444' }]}>Remove</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
};

// Helper Components
const DetailRow = ({ icon, label, value }) => (
    <View style={styles.detailRow}>
        <View style={styles.detailIconBox}><Icon name={icon} size={18} color="#6366F1" /></View>
        <View>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value}</Text>
        </View>
    </View>
);

const DetectionItem = ({ label, data, color, icon }) => {
    const trendIcon = data.dir === 'up' ? 'trending-up' : data.dir === 'down' ? 'trending-down' : 'trending-neutral';
    const trendColor = data.dir === 'up' ? '#10B981' : data.dir === 'down' ? '#EF4444' : '#94A3B8';
    return (
        <View style={styles.detItem}>
            <View style={styles.cardHeaderArea}>
                <View style={styles.detItemHeader}>
                    <Icon name={icon} size={14} color={color} />
                    <Text style={[styles.detItemLabel, {color: color}]}>{label}</Text>
                </View>
                <View style={styles.inlineTrend}>
                    <Icon name={trendIcon} size={12} color={trendColor} />
                    <Text style={[styles.detTrendText, {color: trendColor}]}>{data.dir === 'stable' ? '0' : data.diff}</Text>
                </View>
            </View>
            <View style={styles.detItemCenterContent}><Text style={styles.detItemCount}>{data.count}</Text></View>
        </View>
    );
};

const MetricCard = ({ label, value, icon, color, trend, unit }) => {
    const trendIcon = trend.direction === 'up' ? 'trending-up' : trend.direction === 'down' ? 'trending-down' : 'trending-neutral';
    let trendColor = trend.direction === 'stable' ? '#94A3B8' : (label === 'Temp' ? (trend.direction === 'up' ? '#EF4444' : '#10B981') : (trend.direction === 'up' ? '#10B981' : '#EF4444'));
    return (
        <View style={styles.metricCard}>
            <View style={styles.metricTopRight}>
                <Icon name={trendIcon} size={12} color={trendColor} />
                <Text style={[styles.trendText, {color: trendColor}]}>{trend.diff}{unit}</Text>
            </View>
            <View style={[styles.metricIconBox, {backgroundColor: `${color}15`}]}><Icon name={icon} size={20} color={color} /></View>
            <View style={{ flex: 1 }}><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricValue} numberOfLines={1}>{value}</Text></View>
        </View>
    );
};

const StatBox = ({ label, sub }) => (<View style={styles.statBox}><Text style={styles.statBoxLabel}>{label}</Text><Text style={styles.statBoxSub}>{sub}</Text></View>);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9', paddingHorizontal: 15, paddingVertical: 15 },
    topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    headerLeft: { flex: 1 },
    welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    headerGreeting: { fontSize: 14, color: '#64748B', fontWeight: '500' },
    headerName: { fontSize: 26, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5, marginBottom: 4 },
    headerDate: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    dateBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 6, 
        backgroundColor: '#FFF', 
        paddingHorizontal: 12, 
        paddingVertical: 8, 
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    dateBadgeText: { fontSize: 12, fontWeight: '600', color: '#1E293B' },
    metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 15 },
    metricCard: { flex: 1, backgroundColor: '#fff', padding: 10, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6, position: 'relative', elevation: 1 },
    metricIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    metricLabel: { color: '#64748B', fontWeight: '600', fontSize: 9 },
    metricValue: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
    metricTopRight: { position: 'absolute', top: 6, right: 6, flexDirection: 'row', alignItems: 'center', gap: 2 },
    trendText: { fontSize: 8, fontWeight: '800' },
    mainGrid: { flex: 1, flexDirection: 'row', gap: 12 },
    leftCol: { flex: 1.8, gap: 12 },
    rightCol: { flex: 1, gap: 12 },
    card: { backgroundColor: '#fff', borderRadius: 20, padding: 14 },
    card2: { backgroundColor: '#fff', borderRadius: 20, padding: 10 },
    cameraBox: { flex: 1.2 }, 
    cropsBox: { flex: 1, minHeight: 180 }, 
    bentoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    bentoTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', marginRight: 6 },
    titleWithIcon: { flexDirection: 'row', alignItems: 'center' },
    cameraFeed: { flex: 1, width: '100%', borderRadius: 12, backgroundColor: '#F1F5F9' },
    barGraphContainer: { height: 80, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%', marginTop: 5, paddingHorizontal: 2 },
    barWrapper: { flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', marginHorizontal: 1 },
    bar: { width: '55%', borderRadius: 12, minHeight: 2 },
    barInactive: { backgroundColor: '#2D2D2D' }, 
    barActive: { backgroundColor: '#22C55E' },   
    xAxisLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, marginBottom: 8, paddingHorizontal: 4 },
    xLabelText: { fontSize: 8, color: '#94A3B8', fontWeight: '600' },
    graphStats: { flexDirection: 'row', gap: 4 },
    statBox: { flex: 1, paddingVertical: 5, borderRadius: 8, backgroundColor: '#F8FAFC', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9' },
    statBoxLabel: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
    statBoxSub: { fontSize: 7, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700' },
    detectionCard: { flex: 1, padding: 15 }, 
    detectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    detectionTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    waterIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    waterValueText: { fontSize: 10, fontWeight: '700', color: '#4D96FF', marginLeft: 4 },
    detectionMainGrid: { flex: 1, gap: 8, marginBottom: 12 }, 
    detectionGridRow: { flex: 1, flexDirection: 'row', gap: 8 }, 
    detItem: { flex: 1, backgroundColor: '#F1F5F9', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', position: 'relative', justifyContent: 'center' },
    cardHeaderArea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    detItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    detItemLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
    inlineTrend: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    detTrendText: { fontSize: 10, fontWeight: '800' },
    detItemCenterContent: { alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    detItemCount: { fontSize: 24, fontWeight: '900', color: '#0F172A' },
    insectAlertBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 12 },
    insectIconBg: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
    insectCountText: { fontSize: 13, fontWeight: '700', color: '#991B1B' },
    insectSubText: { fontSize: 9, color: '#B91C1C', fontWeight: '600' },
    logsBox: { flex: 0.8 }, 
    logList: { flex: 1 },
    logItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    logAvatar: { width: 32, height: 32, borderRadius: 8 },
    logName: { fontSize: 12, fontWeight: '600', color: '#1E293B' },
    logStatus: { fontSize: 10, color: '#94A3B8' },
    dropdownMini: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', padding: 5, borderRadius: 6 },
    dropdownText: { fontSize: 10, color: '#64748B', fontWeight: '600' },
    actionDropdown: {
        position: 'absolute', right: 25, top: 0, backgroundColor: '#FFF', 
        borderRadius: 12, padding: 6, elevation: 10, zIndex: 1000,
        borderWidth: 1, borderColor: '#F1F5F9', minWidth: 150
    },
    cameraDropdown: {
        position: 'absolute', right: 0, top: 25, backgroundColor: '#FFF', 
        borderRadius: 12, padding: 6, elevation: 15, zIndex: 1000,
        borderWidth: 1, borderColor: '#F1F5F9', minWidth: 120
    },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, borderRadius: 8 },
    dropdownItemText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center' },
    infoBox: { 
        width: 320, backgroundColor: '#FFF', borderRadius: 24, padding: 25, 
        alignItems: 'center', position: 'relative', elevation: 20 
    },
    // Graph Modal Styles
    graphModalBox: {
        width: '92%',
        maxWidth: 550,
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 18,
        position: 'relative',
        elevation: 20,
        maxHeight: '85%',
    },
    graphScrollContent: {
        paddingBottom: 10,
    },
    graphCloseBtn: {
        position: 'absolute',
        right: 12,
        top: 12,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 20,
    },
    graphLoadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    graphLoadingText: {
        marginTop: 10,
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    modalGraphHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
        paddingRight: 20,
    },
    modalGraphTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    modalIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalGraphTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#1E293B',
    },
    modalGraphSubtitle: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '500',
        marginTop: 2,
    },
    hoverPreviewBadge: {
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        alignItems: 'flex-end',
    },
    hoverPreviewTime: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '600',
    },
    hoverPreviewValue: {
        fontSize: 14,
        fontWeight: '800',
    },
    modalChartContainer: {
        width: '100%',
        marginBottom: 16,
    },
    modalStatsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    modalStatCard: {
        flex: 1,
        minWidth: 80,
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 8,
        alignItems: 'center',
        gap: 4,
    },
    modalStatCardLabel: {
        fontSize: 9,
        color: '#64748B',
        fontWeight: '600',
    },
    modalStatCardValue: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
    },
    modalDataInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    modalDataInfoText: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '500',
    },
    npkTabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
    },
    npkTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
        position: 'relative',
    },
    npkTabActive: {
        backgroundColor: '#FFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    npkTabText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    npkTabTextActive: {
        color: '#6366F1',
    },
    npkTabUnderline: {
        position: 'absolute',
        bottom: -1,
        left: '20%',
        width: '60%',
        height: 2,
        backgroundColor: '#6366F1',
        borderRadius: 1,
    },
    closeBtn: { position: 'absolute', right: 15, top: 15, padding: 5, zIndex: 10 },
    modalAvatar: { width: 80, height: 80, borderRadius: 20, marginBottom: 15 },
    modalName: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
    modalRole: { fontSize: 12, color: '#6366F1', fontWeight: '700', marginBottom: 20, textTransform: 'uppercase' },
    detailsContainer: { width: '100%', gap: 15 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    detailIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },
    detailLabel: { fontSize: 10, color: '#64748B', fontWeight: '600' },
    detailValue: { fontSize: 13, color: '#1E293B', fontWeight: '700' },
    pestIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#6366F110',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        borderWidth: 2,
        borderColor: '#6366F120'
    },
    pestDetailRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    pestCountBadge: {
        fontSize: 10,
        fontWeight: '800',
        color: '#6366F1',
        backgroundColor: '#6366F115',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden'
    },
    pestTimeText: {
        fontSize: 9,
        color: '#94A3B8',
        fontWeight: '600',
        marginTop: 4
    },
});

export default Dashboard;