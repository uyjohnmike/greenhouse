import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions
} from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { NGROK_URL } from "../../../ngrok_camera";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Helper function to format date consistently without timezone issues
const formatDateStr = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Custom Date Picker Component
const CustomDatePicker = ({ visible, onClose, onSelectDate, currentDate, availableDates }) => {
    const currentDateObj = currentDate instanceof Date ? currentDate : new Date(currentDate);
    const [selectedYear, setSelectedYear] = useState(currentDateObj.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDateObj.getMonth());
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };
    
    const getFirstDayOfMonth = (year, month) => {
        return new Date(year, month, 1).getDay();
    };
    
    const handleDateSelect = (day) => {
        const selectedDateObj = new Date(selectedYear, selectedMonth, day, 12, 0, 0);
        onSelectDate(selectedDateObj);
        onClose();
    };
    
    const isDateAvailable = (year, month, day) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return availableDates.includes(dateStr);
    };
    
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);
    const days = [];
    
    const today = new Date();
    const todayStr = formatDateStr(today);
    const currentDateStr = formatDateStr(currentDateObj);
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        days.push(<View key={`empty-${i}`} style={styles.calendarDayEmpty} />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const available = isDateAvailable(selectedYear, selectedMonth, day);
        const isCurrentDate = dateStr === currentDateStr;
        const isTodayDate = dateStr === todayStr;
        
        days.push(
            <TouchableOpacity
                key={day}
                style={[
                    styles.calendarDay,
                    isCurrentDate && styles.calendarDayCurrent,
                ]}
                onPress={() => available && handleDateSelect(day)}
                disabled={!available}
            >
                <Text style={[
                    styles.calendarDayText,
                    !available && styles.calendarDayTextDisabled,
                    isCurrentDate && styles.calendarDayTextCurrent,
                    isTodayDate && styles.calendarDayTextToday,
                ]}>
                    {day}
                </Text>
                {available && (
                    <View style={[
                        styles.dateUnderline,
                        isCurrentDate && styles.dateUnderlineCurrent,
                    ]} />
                )}
            </TouchableOpacity>
        );
    }
    
    if (!visible) return null;
    
    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.calendarContainer}>
                    <View style={styles.calendarHeader}>
                        <Text style={styles.calendarTitle}>Select Date</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Icon name="close" size={24} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.calendarSelector}>
                        <TouchableOpacity 
                            style={styles.selectorButton}
                            onPress={() => setSelectedMonth(Math.max(0, selectedMonth - 1))}
                        >
                            <Icon name="chevron-left" size={20} color="#64748B" />
                        </TouchableOpacity>
                        
                        <View style={styles.selectorCenter}>
                            <Text style={styles.selectorText}>{months[selectedMonth]} {selectedYear}</Text>
                        </View>
                        
                        <TouchableOpacity 
                            style={styles.selectorButton}
                            onPress={() => setSelectedMonth(Math.min(11, selectedMonth + 1))}
                        >
                            <Icon name="chevron-right" size={20} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.calendarWeekdays}>
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                            <Text key={day} style={styles.weekdayText}>{day}</Text>
                        ))}
                    </View>
                    
                    <View style={styles.calendarDays}>
                        {days}
                    </View>
                    
                    <View style={styles.calendarFooter}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendUnderline, { backgroundColor: '#2D2D2D' }]} />
                            <Text style={styles.legendText}>Has Data </Text>
                            <View style={[styles.legendUnderline, { backgroundColor: '#10B981' }]} />
                            <Text style={styles.legendText}>Date Selected</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const ClimateAnalytics = () => {
    const { width: windowWidth } = useWindowDimensions();
    const [data, setData] = useState([]);
    const [allData, setAllData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [chartLayouts, setChartLayouts] = useState({});
    const [hoverData, setHoverData] = useState({ temp: null, hum: null });
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [availableDates, setAvailableDates] = useState([]);
    
    // Initialize with today's date at noon to avoid timezone issues
    const today = new Date();
    const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
    const [selectedDate, setSelectedDate] = useState(todayNoon);
    const drawAnim = useRef(new Animated.Value(0)).current;

    const isSmall = windowWidth < 900;
    const isMobile = windowWidth < 768;
    const isVerySmall = windowWidth < 600;
    
    const GRAPH_HEIGHT = isVerySmall ? 140 : (isMobile ? 160 : 180); 
    const TOP_PADDING = 10;   
    const LEFT_MARGIN = 35;   
    const RIGHT_MARGIN = 10;  

    const START_HOUR = 7; 
    const END_HOUR = 17; 
    const TOTAL_HOURS_VISIBLE = END_HOUR - START_HOUR;

    const TIME_LABELS = [
        { label: "7AM", hr: 7 }, { label: "9AM", hr: 9 },
        { label: "11AM", hr: 11 }, { label: "1PM", hr: 13 },
        { label: "3PM", hr: 15 }, { label: "5PM", hr: 17 },
    ];

    useEffect(() => { 
        fetchAllMetrics(); 
    }, []);

    useEffect(() => {
        filterDataByDate();
    }, [selectedDate, allData]);

    const fetchAllMetrics = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${NGROK_URL}/api/getalltemperature`, {
                headers: { 'ngrok-skip-browser-warning': 'true' }
            });
            const result = await response.json();
            
            setAllData(result);
            
            const datesWithData = new Set();
            result.forEach(item => {
                const date = new Date(item.created_at);
                const dateStr = formatDateStr(date);
                datesWithData.add(dateStr);
            });
            setAvailableDates(Array.from(datesWithData).sort());
            
        } catch (error) { 
            console.error("Fetch Error:", error); 
        } finally {
            setLoading(false);
        }
    };

    const filterDataByDate = () => {
        if (allData.length === 0) return;
        
        setLoading(true);
        try {
            const selectedDateStr = formatDateStr(selectedDate);
            
            const filtered = allData.filter(item => {
                const dateObj = new Date(item.created_at);
                const itemDateStr = formatDateStr(dateObj);
                const hour = dateObj.getHours();
                return itemDateStr === selectedDateStr && hour >= START_HOUR && hour <= END_HOUR;
            }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            
            setData(filtered);
            drawAnim.setValue(0);
            Animated.timing(drawAnim, { toValue: 1, duration: 1500, useNativeDriver: false }).start();
        } catch (error) {
            console.error("Filter Error:", error);
        } finally {
            setLoading(false);
        }
    };

    // Get all high temperature records (temperature > 35°C)
    const getHighTempRecords = () => {
        return allData.filter(item => parseFloat(item.temperature) > 35)
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); // Sort by newest first
    };

    // Format time as HH:MM
    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    // Format date as MM/DD/YYYY
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
    };

    // Handle click on a sensor log
    const handleLogPress = (item) => {
        const dateObj = new Date(item.created_at);
        // Create date at noon to avoid timezone issues
        const newDate = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 12, 0, 0);
        setSelectedDate(newDate);
        // Close date picker if it's open
        setShowDatePicker(false);
    };

    const calculateStats = () => {
        if (data.length === 0) return null;
        
        const temps = data.map(d => parseFloat(d.temperature));
        const hums = data.map(d => parseFloat(d.airhumidity));
        
        const latestTemp = temps[temps.length - 1];
        const latestHum = hums[hums.length - 1];
        
        const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
        const avgHum = hums.reduce((a, b) => a + b, 0) / hums.length;
        
        const maxTemp = Math.max(...temps);
        const minTemp = Math.min(...temps);
        const maxHum = Math.max(...hums);
        const minHum = Math.min(...hums);
        
        return {
            temp: { latest: latestTemp, avg: avgTemp, max: maxTemp, min: minTemp },
            hum: { latest: latestHum, avg: avgHum, max: maxHum, min: minHum }
        };
    };

    const getCoordinateX = (hourVal, width) => {
        const usableWidth = width - (LEFT_MARGIN + RIGHT_MARGIN);
        const progress = (hourVal - START_HOUR) / TOTAL_HOURS_VISIBLE;
        return LEFT_MARGIN + (progress * usableWidth);
    };

    const getYPos = (val, max) => TOP_PADDING + (GRAPH_HEIGHT - (parseFloat(val) / max) * GRAPH_HEIGHT);

    const handleHover = (evt, type) => {
        const width = chartLayouts[type]?.width || 500;
        const xPos = Platform.OS === 'web' ? evt.nativeEvent.offsetX : evt.nativeEvent.locationX;
        let closest = null;
        let minDiff = Infinity;

        data.forEach(d => {
            const date = new Date(d.created_at);
            const h = date.getHours() + (date.getMinutes() / 60);
            const x = getCoordinateX(h, width);
            const diff = Math.abs(xPos - x);
            if (diff < minDiff && diff < 30) {
                minDiff = diff;
                closest = d;
            }
        });
        setHoverData(prev => ({ ...prev, [type]: closest }));
    };

    const formatDisplayDate = (date) => {
        if (!date) return '';
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    };

    const getSelectedDateString = () => {
        return selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    const StatsBox = ({ stats }) => {
        if (!stats) return null;
        
        return (
            <View style={[styles.statsContainer, isMobile && styles.statsContainerMobile]}>
                <View style={styles.statsCard}>
                    <View style={styles.statsHeader}>
                        <View style={[styles.statsIcon, { backgroundColor: '#EF444420' }]}>
                            <Icon name="thermometer" size={isVerySmall ? 12 : 14} color="#EF4444" />
                        </View>
                        <Text style={styles.statsTitle}>Temperature</Text>
                    </View>
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Latest</Text>
                            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.temp.latest.toFixed(1)}°C</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Average</Text>
                            <Text style={styles.statValue}>{stats.temp.avg.toFixed(1)}°C</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Max</Text>
                            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.temp.max.toFixed(1)}°C</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Min</Text>
                            <Text style={styles.statValue}>{stats.temp.min.toFixed(1)}°C</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.statsCard}>
                    <View style={styles.statsHeader}>
                        <View style={[styles.statsIcon, { backgroundColor: '#3B82F620' }]}>
                            <Icon name="water-percent" size={isVerySmall ? 12 : 14} color="#3B82F6" />
                        </View>
                        <Text style={styles.statsTitle}>Humidity</Text>
                    </View>
                    <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Latest</Text>
                            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.hum.latest.toFixed(1)}%</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Average</Text>
                            <Text style={styles.statValue}>{stats.hum.avg.toFixed(1)}%</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Max</Text>
                            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{stats.hum.max.toFixed(1)}%</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Min</Text>
                            <Text style={styles.statValue}>{stats.hum.min.toFixed(1)}%</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    const renderChart = (type, color, label, icon, maxVal, step) => {
        const key = type === 'temp' ? 'temperature' : 'airhumidity';
        const chartWidth = chartLayouts[type]?.width || 500;
        const currentHover = hoverData[type];

        const yLabels = [];
        for (let i = 0; i <= maxVal; i += step) yLabels.push(i);

        const points = data.map(d => {
            const date = new Date(d.created_at);
            const h = date.getHours() + (date.getMinutes() / 60);
            return { 
                x: getCoordinateX(h, chartWidth), 
                y: getYPos(d[key], maxVal),
                value: parseFloat(d[key])
            };
        });

        let dString = points.length > 0 ? `M ${points[0].x} ${points[0].y}` : "";
        for (let i = 1; i < points.length; i++) dString += ` L ${points[i].x} ${points[i].y}`;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconCircle, { backgroundColor: color + '20' }]}>
                        <Icon name={icon} size={isVerySmall ? 10 : 12} color={color} />
                    </View>
                    <Text style={styles.cardTitle}>{label}</Text>
                    {currentHover && (
                        <Text style={[styles.hoverInlineValue, { color }]}>
                            {parseFloat(currentHover[key]).toFixed(1)}{type === 'temp' ? '°C' : '%'}
                        </Text>
                    )}
                </View>

                <View 
                    style={styles.chartArea} 
                    onLayout={(e) => setChartLayouts(prev => ({ ...prev, [type]: e.nativeEvent.layout }))}
                >
                    <Svg height={GRAPH_HEIGHT + TOP_PADDING + 20} width="100%">
                        <Defs>
                            <LinearGradient id={`grad${type}`} x1="0" y1="0" x2="0" y2="1">
                                <Stop offset="0" stopColor={color} stopOpacity="0.2" />
                                <Stop offset="1" stopColor={color} stopOpacity="0" />
                            </LinearGradient>
                        </Defs>
                        
                        {yLabels.map(val => (
                            <G key={val}>
                                <Line 
                                    x1={LEFT_MARGIN} 
                                    y1={getYPos(val, maxVal)} 
                                    x2={chartWidth - RIGHT_MARGIN} 
                                    y2={getYPos(val, maxVal)} 
                                    stroke="#F1F5F9" 
                                    strokeWidth="0.5" 
                                />
                                <SvgText 
                                    x={LEFT_MARGIN - 8} 
                                    y={getYPos(val, maxVal) + 3} 
                                    fontSize={isVerySmall ? 7 : 8} 
                                    fill="#94A3B8" 
                                    textAnchor="end" 
                                    fontWeight="bold"
                                >
                                    {val}{type === 'temp' ? '°' : ''}
                                </SvgText>
                            </G>
                        ))}

                        {points.length > 1 && (
                            <>
                                <AnimatedPath 
                                    d={`${dString} V ${GRAPH_HEIGHT + TOP_PADDING} H ${points[0].x} Z`} 
                                    fill={`url(#grad${type})`} 
                                    opacity={drawAnim} 
                                />
                                <AnimatedPath d={dString} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
                            </>
                        )}

                        {points.map((point, index) => (
                            <Circle 
                                key={index}
                                cx={point.x} 
                                cy={point.y} 
                                r={isVerySmall ? 2 : 2.5} 
                                fill={color} 
                                stroke="#FFF" 
                                strokeWidth="1" 
                            />
                        ))}

                        {currentHover && (
                            <G>
                                <Line 
                                    x1={getCoordinateX(new Date(currentHover.created_at).getHours() + new Date(currentHover.created_at).getMinutes()/60, chartWidth)} 
                                    y1={TOP_PADDING} 
                                    x2={getCoordinateX(new Date(currentHover.created_at).getHours() + new Date(currentHover.created_at).getMinutes()/60, chartWidth)} 
                                    y2={GRAPH_HEIGHT + TOP_PADDING} 
                                    stroke={color} 
                                    strokeWidth="0.8" 
                                    strokeDasharray="3 2" 
                                />
                                <Circle 
                                    cx={getCoordinateX(new Date(currentHover.created_at).getHours() + new Date(currentHover.created_at).getMinutes()/60, chartWidth)} 
                                    cy={getYPos(currentHover[key], maxVal)} 
                                    r={isVerySmall ? 3 : 4} 
                                    fill={color} 
                                    stroke="#FFF" 
                                    strokeWidth="1.5" 
                                />
                                <Rect 
                                    x={getCoordinateX(new Date(currentHover.created_at).getHours() + new Date(currentHover.created_at).getMinutes()/60, chartWidth) - 30} 
                                    y={getYPos(currentHover[key], maxVal) - 35} 
                                    width="60" 
                                    height="28" 
                                    rx="6" 
                                    fill="#1E293B" 
                                />
                                <SvgText 
                                    x={getCoordinateX(new Date(currentHover.created_at).getHours() + new Date(currentHover.created_at).getMinutes()/60, chartWidth)} 
                                    y={getYPos(currentHover[key], maxVal) - 22} 
                                    fill="#FFF" 
                                    fontSize="9" 
                                    fontWeight="800" 
                                    textAnchor="middle"
                                >
                                    {parseFloat(currentHover[key]).toFixed(1)}{type === 'temp' ? '°C' : '%'}
                                </SvgText>
                                <SvgText 
                                    x={getCoordinateX(new Date(currentHover.created_at).getHours() + new Date(currentHover.created_at).getMinutes()/60, chartWidth)} 
                                    y={getYPos(currentHover[key], maxVal) - 12} 
                                    fill="#94A3B8" 
                                    fontSize="7" 
                                    textAnchor="middle"
                                >
                                    {new Date(currentHover.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </SvgText>
                            </G>
                        )}
                    </Svg>

                    <View 
                        style={StyleSheet.absoluteFill}
                        onPointerMove={(e) => handleHover(e, type)}
                        onPointerLeave={() => setHoverData(prev => ({ ...prev, [type]: null }))}
                        onStartShouldSetResponder={() => true}
                        onResponderMove={(e) => handleHover(e, type)}
                        onResponderRelease={() => setHoverData(prev => ({ ...prev, [type]: null }))}
                    />

                    <View style={styles.xAxisContainer}>
                        {TIME_LABELS.map((t) => (
                            <Text key={t.label} style={[styles.axisLabel, { 
                                position: 'absolute', 
                                left: getCoordinateX(t.hr, chartWidth) - (isVerySmall ? 10 : 12), 
                                textAlign: 'center', 
                                width: isVerySmall ? 20 : 24,
                            }]}>{t.label}</Text>
                        ))}
                    </View>
                </View>
            </View>
        );
    };

    const stats = calculateStats();
    const needsScrolling = isMobile || isVerySmall;
    const highTempRecords = getHighTempRecords();

    return (
        <>
            <SafeAreaView style={styles.container}>
                {needsScrolling ? (
                    <ScrollView 
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        showsHorizontalScrollIndicator={false}
                        nestedScrollEnabled={true}
                    >
                        <View style={styles.content}>
                            <View style={styles.topSection}>
                                <View>
                                    <Text style={styles.pageTitle}>Temperature Monitoring</Text>
                                    <Text style={styles.pageSub}>Daily Trend: 7:00 AM - 5:00 PM</Text>
                                    <Text style={styles.dateSubtitle}>{getSelectedDateString()}</Text>
                                </View>
                                <TouchableOpacity 
                                    style={styles.datePickerButton}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Icon name="calendar" size={20} color="#10B981" />
                                    <Text style={styles.datePickerButtonText}>
                                        {formatDisplayDate(selectedDate)}
                                    </Text>
                                    <Icon name="chevron-down" size={16} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            {!loading && data.length > 0 && <StatsBox stats={stats} />}

                            <View style={[styles.mainLayout, { flexDirection: isSmall ? 'column' : 'row' }]}>
                                <View style={[styles.sidePanel, isSmall ? { width: '100%', height: isVerySmall ? 250 : 300 } : { width: '28%' }]}>
                                    <Text style={styles.panelTitle}>High Temperature Alerts (35°C up)</Text>
                                    <Text style={styles.panelSubtitle}>Click any record to view that day's data</Text>
                                    <ScrollView 
                                        style={styles.logScrollView}
                                        showsVerticalScrollIndicator={false}
                                        showsHorizontalScrollIndicator={false}
                                        nestedScrollEnabled={true}
                                    >
                                        {highTempRecords.map((item, i) => {
                                            const date = new Date(item.created_at);
                                            const isSelected = formatDateStr(date) === formatDateStr(selectedDate);
                                            return (
                                                <TouchableOpacity 
                                                    key={i} 
                                                    style={[styles.alertBox, isSelected && styles.alertBoxSelected]}
                                                    onPress={() => handleLogPress(item)}
                                                >
                                                    <View style={styles.alertContent}>
                                                        <View style={styles.alertHeader}>
                                                            <Icon name="alert-circle" size={isVerySmall ? 10 : 12} color="#EF4444" />
                                                            <Text style={styles.alertTime}>{formatTime(item.created_at)}</Text>
                                                        </View>
                                                        <Text style={styles.alertText}>High Temp: {parseFloat(item.temperature).toFixed(1)}°C</Text>
                                                    </View>
                                                    <Text style={styles.alertDate}>{formatDate(item.created_at)}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                        {highTempRecords.length === 0 && (
                                            <Text style={styles.emptyText}>No high temperature records found.</Text>
                                        )}
                                    </ScrollView>
                                </View>

                                <View style={[styles.graphPanel, isSmall ? { width: '100%' } : { width: '70%' }]}>
                                    {loading ? (
                                        <View style={styles.loadingContainer}>
                                            <ActivityIndicator size="small" color="#10B981" />
                                        </View>
                                    ) : data.length === 0 ? (
                                        <View style={styles.noDataContainer}>
                                            <Icon name="calendar-blank" size={isVerySmall ? 24 : 32} color="#CBD5E1" />
                                            <Text style={styles.noDataText}>No data available for this date</Text>
                                            <Text style={styles.noDataSubtext}>Try selecting a different date</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.graphGap}>
                                            {renderChart('temp', '#EF4444', 'Temperature (°C)', 'thermometer', 45, 15)}
                                            {renderChart('hum', '#3B82F6', 'Air Humidity (%)', 'water-percent', 100, 25)}
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                    </ScrollView>
                ) : (
                    <View style={styles.content}>
                        <View style={styles.topSection}>
                            <View>
                                <Text style={styles.pageTitle}>Temperature Monitoring</Text>
                                <Text style={styles.pageSub}>Daily Trend: 7:00 AM - 5:00 PM</Text>
                                <Text style={styles.dateSubtitle}>{getSelectedDateString()}</Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.datePickerButton}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Icon name="calendar" size={20} color="#10B981" />
                                <Text style={styles.datePickerButtonText}>
                                    {formatDisplayDate(selectedDate)}
                                </Text>
                                <Icon name="chevron-down" size={16} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {!loading && data.length > 0 && <StatsBox stats={stats} />}

                        <View style={[styles.mainLayout, { flexDirection: isSmall ? 'column' : 'row' }]}>
                            <View style={[styles.sidePanel, isSmall ? { width: '100%', height: 300 } : { width: '28%' }]}>
                                <Text style={styles.panelTitle}>High Temperature Alerts (35°C up)</Text>
                                <Text style={styles.panelSubtitle}>Click any record to view that day's data</Text>
                                <ScrollView 
                                    style={styles.logScrollView}
                                    showsVerticalScrollIndicator={false}
                                    showsHorizontalScrollIndicator={false}
                                    nestedScrollEnabled={true}
                                >
                                    {highTempRecords.map((item, i) => {
                                        const date = new Date(item.created_at);
                                        const isSelected = formatDateStr(date) === formatDateStr(selectedDate);
                                        return (
                                            <TouchableOpacity 
                                                key={i} 
                                                style={[styles.alertBox, isSelected && styles.alertBoxSelected]}
                                                onPress={() => handleLogPress(item)}
                                            >
                                                <View style={styles.alertContent}>
                                                    <View style={styles.alertHeader}>
                                                        <Icon name="alert-circle" size={12} color="#EF4444" />
                                                        <Text style={styles.alertTime}>{formatTime(item.created_at)}</Text>
                                                    </View>
                                                    <Text style={styles.alertText}>High Temp: {parseFloat(item.temperature).toFixed(1)}°C</Text>
                                                </View>
                                                <Text style={styles.alertDate}>{formatDate(item.created_at)}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                    {highTempRecords.length === 0 && (
                                        <Text style={styles.emptyText}>No high temperature records found.</Text>
                                    )}
                                </ScrollView>
                            </View>

                            <View style={[styles.graphPanel, isSmall ? { width: '100%' } : { width: '70%' }]}>
                                {loading ? (
                                    <View style={styles.loadingContainer}>
                                        <ActivityIndicator size="small" color="#10B981" />
                                    </View>
                                ) : data.length === 0 ? (
                                    <View style={styles.noDataContainer}>
                                        <Icon name="calendar-blank" size={32} color="#CBD5E1" />
                                        <Text style={styles.noDataText}>No data available for this date</Text>
                                        <Text style={styles.noDataSubtext}>Try selecting a different date</Text>
                                    </View>
                                ) : (
                                    <View style={styles.graphGap}>
                                        {renderChart('temp', '#EF4444', 'Temperature (°C)', 'thermometer', 45, 15)}
                                        {renderChart('hum', '#3B82F6', 'Air Humidity (%)', 'water-percent', 100, 25)}
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                )}
            </SafeAreaView>

            <CustomDatePicker 
                visible={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                onSelectDate={setSelectedDate}
                currentDate={selectedDate}
                availableDates={availableDates}
            />
        </>
    );
};

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#F1F5F9',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        padding: 15,
    },
    topSection: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start', 
        marginBottom: 15,
        flexWrap: 'wrap',
        gap: 10,
    },
    pageTitle: { 
        fontSize: 20, 
        fontWeight: '800', 
        color: '#1E293B' 
    },
    pageSub: { 
        fontSize: 12, 
        color: '#64748B',
        marginTop: 2,
    },
    dateSubtitle: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2,
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    datePickerButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E293B',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 15,
    },
    statsContainerMobile: {
        flexDirection: 'column',
    },
    statsCard: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 14,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    statsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    statsIcon: {
        padding: 5,
        borderRadius: 8,
    },
    statsTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 6,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 3,
        textTransform: 'uppercase',
    },
    statValue: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1E293B',
    },
    mainLayout: { 
        flex: 1,
        width: '100%', 
        gap: 15,
        minHeight: 0,
    },
    sidePanel: { 
        backgroundColor: '#FFF', 
        borderRadius: 14, 
        padding: 12, 
        borderWidth: 1, 
        borderColor: '#F1F5F9',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    panelTitle: { 
        fontWeight: '800', 
        color: '#334155', 
        marginBottom: 4, 
        fontSize: 13 
    },
    panelSubtitle: {
        fontSize: 10,
        color: '#94A3B8',
        marginBottom: 10,
    },
    logScrollView: { 
        flex: 1,
    },
    graphPanel: { 
        flexGrow: 1,
        minHeight: 0,
    },
    graphGap: { 
        gap: 15,
        flex: 1,
    },
    loadingContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    noDataContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 14,
        gap: 10,
        padding: 20,
    },
    noDataText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#64748B',
    },
    noDataSubtext: {
        fontSize: 13,
        color: '#94A3B8',
    },
    card: { 
        backgroundColor: '#FFF', 
        borderRadius: 14, 
        padding: 10, 
        borderWidth: 1, 
        borderColor: '#F1F5F9',
        flex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    cardHeader: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 8, 
        marginBottom: 8 
    },
    iconCircle: { 
        padding: 5, 
        borderRadius: 8, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    cardTitle: { 
        fontSize: 12, 
        fontWeight: '700', 
        color: '#475569' 
    },
    hoverInlineValue: { 
        marginLeft: 'auto', 
        fontSize: 12, 
        fontWeight: '800' 
    },
    chartArea: { 
        position: 'relative',
        flex: 1,
    },
    xAxisContainer: { 
        height: 18, 
        width: '100%', 
        marginTop: 3,
        position: 'relative',
    },
    axisLabel: { 
        fontSize: 8,
        fontWeight: '700', 
        color: '#94A3B8' 
    },
    alertBox: { 
        backgroundColor: '#FEF2F2', 
        padding: 10, 
        borderRadius: 10, 
        marginBottom: 8, 
        borderWidth: 1, 
        borderColor: '#FEE2E2',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    alertBoxSelected: {
        backgroundColor: '#F0FDF4',
        borderColor: '#10B981',
        borderWidth: 2,
    },
    alertContent: {
        flex: 1,
    },
    alertHeader: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 5,
        marginBottom: 4,
    },
    alertTime: { 
        fontSize: 11, 
        color: '#991B1B', 
        fontWeight: '700' 
    },
    alertText: { 
        fontSize: 12, 
        color: '#991B1B', 
        fontWeight: '600' 
    },
    alertDate: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
        marginLeft: 10,
    },
    emptyText: { 
        color: '#94A3B8', 
        fontSize: 11, 
        textAlign: 'center', 
        marginTop: 10 
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarContainer: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        width: '90%',
        maxWidth: 400,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    calendarTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    calendarSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    selectorButton: {
        padding: 8,
    },
    selectorCenter: {
        flex: 1,
        alignItems: 'center',
    },
    selectorText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1E293B',
    },
    calendarWeekdays: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    weekdayText: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
    },
    calendarDays: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calendarDayEmpty: {
        width: '14.28%',
        aspectRatio: 1,
    },
    calendarDay: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    calendarDayCurrent: {
        backgroundColor: '#F0FDF4',
        borderRadius: 8,
    },
    calendarDayText: {
        fontSize: 14,
        color: '#1E293B',
        fontWeight: '500',
    },
    calendarDayTextDisabled: {
        color: '#CBD5E1',
    },
    calendarDayTextCurrent: {
        color: '#10B981',
        fontWeight: '700',
    },
    calendarDayTextToday: {
        color: '#1E293B',
        fontWeight: '500',
    },
    dateUnderline: {
        position: 'absolute',
        bottom: 4,
        width: 20,
        height: 2,
        backgroundColor: '#2D2D2D',
        borderRadius: 1,
    },
    dateUnderlineCurrent: {
        backgroundColor: '#10B981',
    },
    calendarFooter: {
        marginTop: 20,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    legendUnderline: {
        width: 20,
        height: 2,
        borderRadius: 1,
    },
    legendText: {
        fontSize: 12,
        color: '#64748B',
    },
});

export default ClimateAnalytics;