import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CAMERA_URL, CAMERA_URL2, NGROK_URL } from "../../../ngrok_camera";
import { firstName } from "../index";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Helper function to format date consistently without timezone issues
const formatDateStr = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper function for week number calculation - FIXED to use ISO week standard
const getWeekNumber = (date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
};

// Helper function to check if date is today
const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

// Helper function to calculate mode (most frequent value)
const calculateMode = (values) => {
    if (values.length === 0) return 0;
    
    const frequency = {};
    let maxFreq = 0;
    let mode = values[0];
    
    values.forEach(value => {
        frequency[value] = (frequency[value] || 0) + 1;
        if (frequency[value] > maxFreq) {
            maxFreq = frequency[value];
            mode = value;
        }
    });
    
    return mode;
};

// Helper function to check if time is within a specific range
const isTimeInRange = (date, startHour, startMinute, endHour, endMinute) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    const startInMinutes = startHour * 60 + startMinute;
    const endInMinutes = endHour * 60 + endMinute;
    return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
};

// Helper function to get data for a specific hour with fallback logic
const getDataForHour = (todayData, targetHour) => {
    if (targetHour === 16) {
        // First try: 4:00 PM to 4:39 PM
        const primaryData = todayData.filter(item => {
            const date = new Date(item.created_at);
            return isTimeInRange(date, 16, 0, 16, 39);
        });
        
        if (primaryData.length > 0) {
            // Get the most recent data from primary range
            const bestData = primaryData.reduce((latest, current) => {
                return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
            });
            const total = (parseInt(bestData.unripe) || 0) + 
                         (parseInt(bestData['semi-ripe']) || 0) + 
                         (parseInt(bestData.ripe) || 0);
            return total * 15;
        }
        
        // Second try: 4:00 PM to 3:40 PM (looking back to 3:40 PM)
        const fallbackData = todayData.filter(item => {
            const date = new Date(item.created_at);
            // Check if time is between 3:40 PM and 4:00 PM
            return isTimeInRange(date, 15, 40, 16, 0);
        });
        
        if (fallbackData.length > 0) {
            // Get the most recent data from fallback range
            const bestData = fallbackData.reduce((latest, current) => {
                return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
            });
            const total = (parseInt(bestData.unripe) || 0) + 
                         (parseInt(bestData['semi-ripe']) || 0) + 
                         (parseInt(bestData.ripe) || 0);
            return total * 15;
        }
        
        // No data found - return 0
        return 0;
    } else if (targetHour === 17) {
        // For 5:00 PM, use range 4:40 PM to 5:30 PM
        const data5PM = todayData.filter(item => {
            const date = new Date(item.created_at);
            return isTimeInRange(date, 16, 40, 17, 30);
        });
        if (data5PM.length > 0) {
            const bestData = data5PM.reduce((latest, current) => {
                return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
            });
            const total = (parseInt(bestData.unripe) || 0) + 
                         (parseInt(bestData['semi-ripe']) || 0) + 
                         (parseInt(bestData.ripe) || 0);
            return total * 15;
        }
        return 0;
    } else {
        // For other hours, use standard hour range
        const hourData = todayData.filter(item => {
            const date = new Date(item.created_at);
            const hours = date.getHours();
            return hours === targetHour;
        });
        if (hourData.length > 0) {
            const bestData = hourData.reduce((latest, current) => {
                return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
            });
            const total = (parseInt(bestData.unripe) || 0) + 
                         (parseInt(bestData['semi-ripe']) || 0) + 
                         (parseInt(bestData.ripe) || 0);
            return total * 15;
        }
        return 0;
    }
};

// Get current week number
const getCurrentWeekNumber = () => {
    return getWeekNumber(new Date());
};

// Crop Health Bar Graph Component - With Smooth Animations
const CropHealthBarGraph = ({ allBellPepperData, windowWidth }) => {
    const [activeFilter, setActiveFilter] = useState('Today');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const animatedValues = useRef([]);
    const [isAnimating, setIsAnimating] = useState(false);
    
    // Responsive sizes based on window width
    const isSmall = windowWidth < 500;
    const isMedium = windowWidth >= 500 && windowWidth < 900;
    const isLarge = windowWidth >= 900;

    const data = React.useMemo(() => {
        if (activeFilter === 'Today') {
            const todayData = allBellPepperData.filter(item => {
                const date = new Date(item.created_at);
                return isToday(date);
            });
            
            const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
            
            const result = hours.map(hour => {
                let valueInPesos = 0;
                
                if (hour === 16) {
                    // Special handling for 4:00 PM with fallback logic
                    valueInPesos = getDataForHour(todayData, 16);
                } else if (hour === 17) {
                    // For 5:00 PM, use range 4:40 PM to 5:30 PM
                    valueInPesos = getDataForHour(todayData, 17);
                } else {
                    // For other hours, use standard hour range
                    const hourData = todayData.filter(item => {
                        const date = new Date(item.created_at);
                        const hours = date.getHours();
                        return hours === hour;
                    });
                    if (hourData.length > 0) {
                        const bestData = hourData.reduce((latest, current) => {
                            return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
                        });
                        const total = (parseInt(bestData.unripe) || 0) + 
                                     (parseInt(bestData['semi-ripe']) || 0) + 
                                     (parseInt(bestData.ripe) || 0);
                        valueInPesos = total * 15;
                    }
                }
                
                let label = '';
                if (hour === 7) label = '7AM';
                else if (hour === 8) label = '8AM';
                else if (hour === 9) label = '9AM';
                else if (hour === 10) label = '10AM';
                else if (hour === 11) label = '11AM';
                else if (hour === 12) label = '12PM';
                else if (hour === 13) label = '1PM';
                else if (hour === 14) label = '2PM';
                else if (hour === 15) label = '3PM';
                else if (hour === 16) label = '4PM';
                else if (hour === 17) label = '5PM';
                
                return {
                    label: isSmall ? (hour === 12 ? '12P' : label.replace('AM', '').replace('PM', '')) : label,
                    value: valueInPesos,
                    hour
                };
            });

            return result.map((item, index) => {
                if (index === 0) return { ...item, highlight: true };
                const prevValue = result[index - 1].value;
                const currentValue = item.value;
                const highlight = currentValue > prevValue;
                return { ...item, highlight };
            });
        } else if (activeFilter === 'Daily') {
            const dailyValues = {};
            
            allBellPepperData.forEach(item => {
                const date = new Date(item.created_at);
                const dayKey = formatDateStr(date);
                
                if (!dailyValues[dayKey]) {
                    dailyValues[dayKey] = [];
                }
                
                const total = (parseInt(item.unripe) || 0) + 
                             (parseInt(item['semi-ripe']) || 0) + 
                             (parseInt(item.ripe) || 0);
                const valueInPesos = total * 15;
                
                if (valueInPesos > 0) {
                    dailyValues[dayKey].push(valueInPesos);
                }
            });

            const datesWithData = Object.keys(dailyValues)
                .sort()
                .reverse()
                .slice(0, isSmall ? 5 : 7);
            
            const result = datesWithData.map(dayKey => {
                const date = new Date(dayKey);
                const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
                const dayValues = dailyValues[dayKey] || [];
                const modeValue = calculateMode(dayValues);
                
                return {
                    label: isSmall ? monthDay.substring(0, 3) : monthDay,
                    value: modeValue,
                    dayKey,
                    fullDate: date
                };
            }).reverse();

            return result.map((item, index) => {
                if (index === 0) return { ...item, highlight: true };
                const prevValue = result[index - 1].value;
                const currentValue = item.value;
                const highlight = currentValue > prevValue;
                return { ...item, highlight };
            });
        } else {
            // WEEKLY VIEW - FIXED: Only show weeks that have data AND are not in the future
            const weeklyValues = {};
            const currentWeek = getCurrentWeekNumber();
            const currentYear = new Date().getFullYear();
            
            // Collect all data and group by week
            allBellPepperData.forEach(item => {
                const date = new Date(item.created_at);
                const weekNumber = getWeekNumber(date);
                const year = date.getFullYear();
                
                // Skip future dates (beyond current week)
                if (year > currentYear || (year === currentYear && weekNumber > currentWeek)) {
                    return;
                }
                
                const weekKey = `${year}-W${weekNumber}`;
                
                if (!weeklyValues[weekKey]) {
                    weeklyValues[weekKey] = {
                        weekNumber: weekNumber,
                        year: year,
                        values: []
                    };
                }
                
                const total = (parseInt(item.unripe) || 0) + 
                             (parseInt(item['semi-ripe']) || 0) + 
                             (parseInt(item.ripe) || 0);
                const valueInPesos = total * 15;
                
                if (valueInPesos > 0) {
                    weeklyValues[weekKey].values.push(valueInPesos);
                }
            });

            // Get only weeks that have data, sorted chronologically
            let result = [];
            const weeksWithData = Object.keys(weeklyValues).sort();
            
            weeksWithData.forEach(weekKey => {
                const weekInfo = weeklyValues[weekKey];
                const weekValues = weekInfo.values || [];
                const modeValue = calculateMode(weekValues);
                
                // Format label for display
                let displayLabel = `Week ${weekInfo.weekNumber}`;
                if (isSmall) {
                    displayLabel = `W${weekInfo.weekNumber}`;
                }
                
                result.push({
                    label: displayLabel,
                    value: modeValue,
                    weekKey: weekKey,
                    weekNumber: weekInfo.weekNumber,
                    year: weekInfo.year
                });
            });

            // If no data at all, show empty array
            if (result.length === 0) {
                return [];
            }

            // Apply highlight logic (compare with previous week's value)
            return result.map((item, index) => {
                if (index === 0) return { ...item, highlight: true };
                const prevValue = result[index - 1].value;
                const currentValue = item.value;
                const highlight = currentValue > prevValue;
                return { ...item, highlight };
            });
        }
    }, [activeFilter, allBellPepperData, isSmall]);

    const maxValue = React.useMemo(() => {
        if (data.length === 0) return 1000;
        const max = Math.max(...data.map(d => d.value));
        return max > 0 ? max : 1000;
    }, [data]);

    // Calculate target bar heights as percentages
    const getTargetBarHeight = (value) => {
        if (maxValue === 0) return 0;
        const percentage = (value / maxValue) * 100;
        return percentage;
    };

    // Initialize animated values when data changes
    useEffect(() => {
        // Create animated values for each bar
        if (animatedValues.current.length !== data.length) {
            animatedValues.current = data.map(() => new Animated.Value(0));
        }
        
        // Animate all bars to their target heights
        setIsAnimating(true);
        const animations = data.map((item, index) => {
            const targetHeight = getTargetBarHeight(item.value);
            return Animated.timing(animatedValues.current[index], {
                toValue: targetHeight,
                duration: 1500,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            });
        });
        
        Animated.parallel(animations).start(() => {
            setIsAnimating(false);
        });
    }, [data, maxValue]);

    // Get bar height style - FIXED to handle undefined animated values
    const getAnimatedBarHeightStyle = (animatedValue, index) => {
        // Safety check for undefined animated value
        if (!animatedValue || !animatedValue.interpolate) {
            return { height: '0%' };
        }
        return {
            height: animatedValue.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%']
            })
        };
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        
        if (showDropdown) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showDropdown]);

    // Handle filter change with animation
    const handleFilterChange = (filter) => {
        setActiveFilter(filter);
        setShowDropdown(false);
    };

    // Responsive bar pill width
    const barPillWidth = isSmall ? 11 : isMedium ? 14 : 19;
    const axisFontSize = isSmall ? 7 : isMedium ? 8 : 9;
    const labelFontSize = isSmall ? 6 : isMedium ? 7 : 8;
    const statFontSize = isSmall ? 10 : isMedium ? 11 : 12;
    const statLabelFontSize = isSmall ? 6 : isMedium ? 7 : 8;

    // If no data in weekly view, show message
    if (activeFilter === 'Weekly' && data.length === 0) {
        return (
            <View>
                <View style={styles.cropHealthHeader}>
                    <Text style={styles.cropHealthTitle}>Crop Health</Text>
                    <View ref={dropdownRef}>
                        <TouchableOpacity 
                            style={styles.cropDropdownMini} 
                            onPress={() => setShowDropdown(!showDropdown)}
                        >
                            <Text style={styles.cropDropdownText}>{activeFilter}</Text>
                            <Icon name="chevron-down" size={14} color="#64748B" />
                        </TouchableOpacity>

                        {showDropdown && (
                            <View style={[styles.cropDropdownMenu, { right: isSmall ? -10 : 0 }]}>
                                {['Today', 'Daily', 'Weekly'].map(f => (
                                    <TouchableOpacity 
                                        key={f} 
                                        style={styles.cropDropdownItem} 
                                        onPress={() => handleFilterChange(f)}
                                    >
                                        <Text style={[styles.cropDropdownItemText, activeFilter === f && {color: '#10B981'}]}>{f}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
                <View style={styles.noDataContainer}>
                    <Icon name="chart-line" size={40} color="#CBD5E1" />
                    <Text style={styles.noDataText}>No weekly data available</Text>
                </View>
            </View>
        );
    }

    return (
        <View>
            <View style={styles.cropHealthHeader}>
                <Text style={styles.cropHealthTitle}>Crop Health</Text>
                <View ref={dropdownRef}>
                    <TouchableOpacity 
                        style={styles.cropDropdownMini} 
                        onPress={() => setShowDropdown(!showDropdown)}
                    >
                        <Text style={styles.cropDropdownText}>{activeFilter}</Text>
                        <Icon name="chevron-down" size={14} color="#64748B" />
                    </TouchableOpacity>

                    {showDropdown && (
                        <View style={[styles.cropDropdownMenu, { right: isSmall ? -10 : 0 }]}>
                            {['Today', 'Daily', 'Weekly'].map(f => (
                                <TouchableOpacity 
                                    key={f} 
                                    style={styles.cropDropdownItem} 
                                    onPress={() => handleFilterChange(f)}
                                >
                                    <Text style={[styles.cropDropdownItemText, activeFilter === f && {color: '#10B981'}]}>{f}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.cropGraphContent}>
                <View style={[styles.cropYAxis, { width: isSmall ? 35 : isMedium ? 40 : 45 }]}>
                    <Text style={[styles.cropAxisText, { fontSize: axisFontSize }]}>₱{maxValue}</Text>
                    <Text style={[styles.cropAxisText, { fontSize: axisFontSize }]}>₱{Math.round(maxValue * 0.75)}</Text>
                    <Text style={[styles.cropAxisText, { fontSize: axisFontSize }]}>₱{Math.round(maxValue * 0.5)}</Text>
                    <Text style={[styles.cropAxisText, { fontSize: axisFontSize }]}>₱{Math.round(maxValue * 0.25)}</Text>
                    <Text style={[styles.cropAxisText, { fontSize: axisFontSize }]}>₱0</Text>
                </View>

                <View style={styles.cropBarsContainer}>
                    <View style={styles.cropBarsWrapper}>
                        {data.map((item, index) => (
                            <View key={index} style={styles.cropBarColumn}>
                                <View style={styles.cropBarWrapper}>
                                    <Animated.View 
                                        style={[
                                            styles.cropBarPill, 
                                            getAnimatedBarHeightStyle(animatedValues.current[index], index),
                                            { 
                                                backgroundColor: item.highlight ? '#22C55E' : '#2D2D2D',
                                                width: barPillWidth
                                            }
                                        ]} 
                                    />
                                </View>
                                {item.value > 0 && !isSmall && (
                                    <Text style={[styles.cropBarValue, { fontSize: labelFontSize }]}>₱{item.value}</Text>
                                )}
                            </View>
                        ))}
                    </View>
                    <View style={styles.cropXAxis}>
                        {data.map((item, index) => (
                            <Text key={index} style={[styles.cropXAxisText, { fontSize: labelFontSize }]}>{item.label}</Text>
                        ))}
                    </View>
                </View>
            </View>

            <View style={styles.cropStatsRow}>
                <View style={styles.cropStatBox}>
                    <Text style={[styles.cropStatValue, { fontSize: statFontSize }]}>₱{data.length > 0 ? data[data.length - 1]?.value || 0 : 0}</Text>
                    <Text style={[styles.cropStatLabel, { fontSize: statLabelFontSize }]}>Latest</Text>
                </View>
                <View style={styles.cropStatBox}>
                    <Text style={[styles.cropStatValue, { fontSize: statFontSize }]}>₱{data.length > 0 ? Math.max(...data.map(d => d.value)) : 0}</Text>
                    <Text style={[styles.cropStatLabel, { fontSize: statLabelFontSize }]}>Highest</Text>
                </View>
                <View style={styles.cropStatBox}>
                    <Text style={[styles.cropStatValue, { fontSize: statFontSize }]}>₱{data.length > 0 ? (data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(0) : 0}</Text>
                    <Text style={[styles.cropStatLabel, { fontSize: statLabelFontSize }]}>Average</Text>
                </View>
            </View>
        </View>
    );
};

const Dashboard = () => {
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const [logs, setLogs] = useState([]);
    const [loadingLogs, setLoadingLogs] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Responsive breakpoints
    const isSmall = windowWidth < 768;
    const isVerySmall = windowWidth < 500;
    const isMedium = windowWidth >= 768 && windowWidth < 1024;
    const isLarge = windowWidth >= 1024;
    
    // UI States for Actions and Modal
    const [selectedUser, setSelectedUser] = useState(null);
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [menuVisible, setMenuVisible] = useState(null); 
    const [hoveredLogIndex, setHoveredLogIndex] = useState(null);
    
    const [insectModalVisible, setInsectModalVisible] = useState(false);
    const [dailyInsects, setDailyInsects] = useState([]);
    
    // Camera States
    const [activeCamera, setActiveCamera] = useState(NGROK_URL);
    const [cameraMenuVisible, setCameraMenuVisible] = useState(false);
    const [camLabel, setCamLabel] = useState("Cam 1");
    const [refreshingCamera, setRefreshingCamera] = useState(false);
    const [cameraKey, setCameraKey] = useState(Date.now());

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
    const [hoverData, setHoverData] = useState(null);

    // Integrated Pepper Detection State
    const [detections, setDetections] = useState({
        unripe: { count: 0, diff: 0, dir: 'stable' },
        semiRipe: { count: 0, diff: 0, dir: 'stable' },
        ripe: { count: 0, diff: 0, dir: 'stable' },
        reject: { count: 0, diff: 0, dir: 'stable' },
        insects: 0
    });

    // Crop Health Data State
    const [allBellPepperData, setAllBellPepperData] = useState([]);

    // Graph animation value
    const drawAnim = useRef(new Animated.Value(0)).current;

    // Graph constants - responsive
    const GRAPH_HEIGHT = isVerySmall ? 150 : isSmall ? 160 : 180;
    const TOP_PADDING = isVerySmall ? 10 : 15;
    const LEFT_MARGIN = isVerySmall ? 30 : isSmall ? 35 : 40;
    const RIGHT_MARGIN = isVerySmall ? 10 : 15;
    const START_HOUR = 7;
    const END_HOUR = 17;
    const TOTAL_HOURS_VISIBLE = END_HOUR - START_HOUR;
    
    const TIME_LABELS = [
        { label: "7AM", hr: 7 }, { label: "9AM", hr: 9 },
        { label: "11AM", hr: 11 }, { label: "1PM", hr: 13 },
        { label: "3PM", hr: 15 }, { label: "5PM", hr: 17 },
    ];

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formatHeaderDate = (date) => {
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        const dateStr = date.toLocaleDateString('en-US', options);
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        return `${dateStr} | ${timeStr}`;
    };

    const formatTimeForDisplay = (dateString) => {
        const date = new Date(dateString);
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
        return `${hours}:${minutesStr}${ampm}`;
    };

    const fetchLogs = useCallback(async () => {
        try {
            const response = await fetch(`${NGROK_URL}/api/getalllogs`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            const data = await response.json();
            setLogs(prevLogs => {
                if (JSON.stringify(prevLogs) === JSON.stringify(data)) return prevLogs;
                return data;
            });
        } catch (error) { console.error("Error logs:", error); } finally { setLoadingLogs(false); }
    }, []);

    const fetchPepperCounts = useCallback(async () => {
        try {
            const pepperRes = await fetch(`${NGROK_URL}/api/getallbellpeppercount`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            const pepperData = await pepperRes.json();
            
            setAllBellPepperData(prevData => {
                if (JSON.stringify(prevData) === JSON.stringify(pepperData)) return prevData;
                return pepperData;
            });
            
            const insectRes = await fetch(`${NGROK_URL}/api/getallpestlogs`, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            const insectData = await insectRes.json();

            const todayStr = formatDateStr(new Date());
            
            const todayInsects = insectData.filter(item => {
                const itemDate = new Date(item.created_at);
                return formatDateStr(itemDate) === todayStr;
            });
            setDailyInsects(prevInsects => {
                if (JSON.stringify(prevInsects) === JSON.stringify(todayInsects)) return prevInsects;
                return todayInsects;
            });

            const highestCountsMap = {};

            insectData.forEach(item => {
                const itemDate = new Date(item.created_at);
                if (formatDateStr(itemDate) === todayStr) {
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

                setDetections(prevDetections => {
                    const newDetections = {
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
                    };
                    
                    if (JSON.stringify(prevDetections) === JSON.stringify(newDetections)) return prevDetections;
                    return newDetections;
                });
            }
        } catch (e) { 
            console.error("Error counts:", e); 
        }
    }, []);

    const fetchAirMetrics = useCallback(async () => {
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
    }, []);

    const fetchSoilMetrics = useCallback(async () => {
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
    }, []);

    const fetchNPKMetrics = useCallback(async () => {
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
    }, []);

    const fetchWaterLevel = useCallback(async () => {
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
    }, []);

    // Helper function to filter data for current date and hour range (7AM-5PM) with proper timezone handling
    const filterDataByDateAndHour = (data, date, key = null) => {
        const selectedDateStr = formatDateStr(date);
        
        return data.filter(item => {
            const dateObj = new Date(item.created_at);
            const itemDateStr = formatDateStr(dateObj);
            const hour = dateObj.getHours();
            // Include data from 7 AM to 5 PM (17:00)
            return itemDateStr === selectedDateStr && hour >= START_HOUR && hour <= END_HOUR;
        }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    };

    const fetchGraphData = async (type, npkType = null) => {
        setGraphLoading(true);
        setHoverData(null);
        const today = new Date();
        const todayNoon = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0);
        
        try {
            let endpoint = '';
            let key = '';
            
            if (type === 'soil') {
                endpoint = `${NGROK_URL}/api/getallsoilhumidity`;
                key = 'soilaverage';
            } else if (type === 'npk') {
                endpoint = `${NGROK_URL}/api/getallnpk`;
                key = npkType;
            } else if (type === 'water') {
                endpoint = `${NGROK_URL}/api/getallwaterlevel`;
                key = 'level';
            } else {
                endpoint = `${NGROK_URL}/api/getalltemperature`;
                key = type === 'temp' ? 'temperature' : 'airhumidity';
            }
            
            const response = await fetch(endpoint, { headers: { 'ngrok-skip-browser-warning': 'true' } });
            const result = await response.json();
            
            const filtered = filterDataByDateAndHour(result, todayNoon);
            
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
        if (type === 'npk' && npkType) {
            setNpkSelected(npkType);
            fetchGraphData(type, npkType);
        } else if (type === 'soil') {
            fetchGraphData(type);
        } else if (type === 'water') {
            fetchGraphData(type);
        } else {
            fetchGraphData(type);
        }
        setGraphModalVisible(true);
    };

    const handleNpkTabChange = (npkType) => {
        setNpkSelected(npkType);
        fetchGraphData('npk', npkType);
    };

    const isInitialMount = useRef(true);
    
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
        isInitialMount.current = false;
        
        const interval = setInterval(refreshAll, 30000);
        return () => clearInterval(interval);
    }, [fetchLogs, fetchAirMetrics, fetchSoilMetrics, fetchNPKMetrics, fetchWaterLevel, fetchPepperCounts]);

    const getTimeAgo = (t) => {
        const diff = Math.floor((new Date() - new Date(t)) / 60000);
        return diff < 1 ? 'Just now' : diff < 60 ? `${diff}m ago` : diff < 1440 ? `${Math.floor(diff/60)}h ago` : new Date(t).toLocaleDateString();
    };

    const getCoordinateX = (hourVal, width) => {
        const usableWidth = width - (LEFT_MARGIN + RIGHT_MARGIN);
        const progress = (hourVal - START_HOUR) / TOTAL_HOURS_VISIBLE;
        return LEFT_MARGIN + (progress * usableWidth);
    };

    const getYPos = (val, max) => TOP_PADDING + (GRAPH_HEIGHT - (parseFloat(val) / max) * GRAPH_HEIGHT);

    const handleHover = (evt, type, npkSelectedType, color) => {
        const chartWidth = chartLayout.width;
        const xPos = Platform.OS === 'web' ? evt.nativeEvent.offsetX : evt.nativeEvent.locationX;
        let closest = null;
        let minDiff = Infinity;

        let key = '';
        if (type === 'temp') key = 'temperature';
        else if (type === 'hum') key = 'airhumidity';
        else if (type === 'soil') key = 'soilaverage';
        else if (type === 'water') key = 'level';
        else if (type === 'npk') key = npkSelectedType;

        graphData.forEach(d => {
            const date = new Date(d.created_at);
            const h = date.getHours() + (date.getMinutes() / 60);
            const x = getCoordinateX(h, chartWidth);
            const diff = Math.abs(xPos - x);
            if (diff < minDiff && diff < 30) {
                minDiff = diff;
                closest = { ...d, key };
            }
        });
        setHoverData(closest);
    };

    const renderModalChart = () => {
        const type = graphType;
        let isTemp = false;
        let color = '#6366F1';
        let label = '';
        let icon = 'chart-line';
        let maxVal = 100;
        let step = 20;
        let unit = '%';
        let key = '';
        
        if (type === 'temp') {
            isTemp = true;
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
        } else if (type === 'water') {
            color = '#4D96FF';
            label = 'Water Level';
            icon = 'water';
            maxVal = 100;
            step = 20;
            unit = '%';
            key = 'level';
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

        const latestValue = graphData.length > 0 ? parseFloat(graphData[graphData.length - 1][key]).toFixed(1) : '--';
        const avgValue = graphData.length > 0 ? (graphData.reduce((sum, d) => sum + parseFloat(d[key]), 0) / graphData.length).toFixed(1) : '--';
        const maxValue = graphData.length > 0 ? Math.max(...graphData.map(d => parseFloat(d[key]))).toFixed(1) : '--';
        const minValue = graphData.length > 0 ? Math.min(...graphData.map(d => parseFloat(d[key]))).toFixed(1) : '--';

        return (
            <View>
                <View style={styles.modalGraphHeader}>
                    <View style={styles.modalGraphTitleContainer}>
                        <View style={[styles.modalIconCircle, { backgroundColor: color + '15' }]}>
                            <Icon name={icon} size={18} color={color} />
                        </View>
                        <View>
                            <Text style={styles.modalGraphTitle}>{label}</Text>
                            <Text style={styles.modalGraphSubtitle}>7:00 AM - 5:00 PM (Current Date)</Text>
                        </View>
                    </View>
                </View>

                {(type === 'npk' || type === 'water') && type !== 'temp' && type !== 'hum' && type !== 'soil' && (
                    <View style={styles.npkTabsContainer}>
                        {type === 'npk' ? (
                            <>
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
                            </>
                        ) : null}
                    </View>
                )}

                <View 
                    style={styles.modalChartContainer}
                    onLayout={(e) => setChartLayout({ width: e.nativeEvent.layout.width })}
                >
                    {chartLayout.width > 0 && (
                        <Svg height={GRAPH_HEIGHT + TOP_PADDING + 25} width={chartLayout.width}>
                            <Defs>
                                <LinearGradient id={`modalGrad${type}${npkSelected}`} x1="0" y1="0" x2="0" y2="1">
                                    <Stop offset="0" stopColor={color} stopOpacity="0.3" />
                                    <Stop offset="1" stopColor={color} stopOpacity="0" />
                                </LinearGradient>
                            </Defs>
                            
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

                            {hoverData && hoverData.key === key && (() => {
                                const date = new Date(hoverData.created_at);
                                const h = date.getHours() + (date.getMinutes() / 60);
                                const x = getCoordinateX(h, chartLayout.width);
                                const y = getYPos(hoverData[key], maxVal);
                                
                                return (
                                    <G>
                                        <Line 
                                            x1={x} 
                                            y1={TOP_PADDING} 
                                            x2={x} 
                                            y2={GRAPH_HEIGHT + TOP_PADDING} 
                                            stroke={color} 
                                            strokeWidth="1" 
                                            strokeDasharray="3 3" 
                                        />
                                        <Circle 
                                            cx={x} 
                                            cy={y} 
                                            r="5" 
                                            fill={color} 
                                            stroke="#FFF" 
                                            strokeWidth="2" 
                                        />
                                        <Rect 
                                            x={Math.max(LEFT_MARGIN, Math.min(x - 45, chartLayout.width - 100))}
                                            y={y - 45}
                                            width="90"
                                            height="35"
                                            rx="6"
                                            fill="#1E293B"
                                            opacity="0.95"
                                        />
                                        <SvgText 
                                            x={Math.max(LEFT_MARGIN + 45, Math.min(x, chartLayout.width - 55))}
                                            y={y - 30} 
                                            fill="#FFF" 
                                            fontSize="10" 
                                            fontWeight="800" 
                                            textAnchor="middle"
                                        >
                                            {parseFloat(hoverData[key]).toFixed(1)}{unit}
                                        </SvgText>
                                        <SvgText 
                                            x={Math.max(LEFT_MARGIN + 45, Math.min(x, chartLayout.width - 55))}
                                            y={y - 18} 
                                            fill="#94A3B8" 
                                            fontSize="8" 
                                            textAnchor="middle"
                                        >
                                            {formatTimeForDisplay(hoverData.created_at)}
                                        </SvgText>
                                    </G>
                                );
                            })()}

                            {points.length === 0 && !graphLoading && (
                                <SvgText x={chartLayout.width / 2} y={GRAPH_HEIGHT / 2} fontSize={12} fill="#94A3B8" textAnchor="middle">
                                    No data available for current date
                                </SvgText>
                            )}
                        </Svg>
                    )}
                    
                    {graphData.length > 0 && (
                        <View 
                            style={StyleSheet.absoluteFill}
                            onPointerMove={(e) => handleHover(e, type, npkSelected, color)}
                            onPointerLeave={() => setHoverData(null)}
                            onStartShouldSetResponder={() => true}
                            onResponderMove={(e) => handleHover(e, type, npkSelected, color)}
                            onResponderRelease={() => setHoverData(null)}
                        />
                    )}
                </View>

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

                {graphData.length > 0 && (
                    <View style={styles.modalDataInfo}>
                        <Icon name="database" size={12} color="#94A3B8" />
                        <Text style={styles.modalDataInfoText}>{graphData.length} readings recorded for today</Text>
                    </View>
                )}
            </View>
        );
    };

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
        setCameraKey(Date.now());
        setTimeout(() => setRefreshingCamera(false), 500);
    };

    const MainContent = React.useMemo(() => (
        <>
            <View style={[styles.topHeader, { paddingHorizontal: isVerySmall ? 10 : 15, paddingTop: isVerySmall ? 10 : 15 }]}>
                <View style={styles.headerLeft}>
                    <View style={styles.welcomeRow}>
                        <Icon name="hand-wave-outline" size={isVerySmall ? 18 : 22} color="#10B981" />
                        <Text style={[styles.headerGreeting, { fontSize: isVerySmall ? 12 : 14 }]}>Welcome back, {firstName}</Text>
                    </View>
                    <Text style={[styles.headerDate, { fontSize: isVerySmall ? 9 : 11 }]}>{formatHeaderDate(currentTime)}</Text>
                </View>
            </View>

            <View style={[styles.metricsRow, { paddingHorizontal: isVerySmall ? 10 : 15 }]}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => handleMetricClick('temp')}>
                    <MetricCard label="Temp" value={`${latestMetrics.temp}°C`} icon="thermometer" color="#FF6B6B" trend={trends.temp} unit="°" isVerySmall={isVerySmall} />
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => handleMetricClick('hum')}>
                    <MetricCard label="Air Humidity" value={`${latestMetrics.humidity}%`} icon="water-percent" color="#4D96FF" trend={trends.humidity} unit="%" isVerySmall={isVerySmall} />
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => handleMetricClick('npk', 'nitrogen')}>
                    <MetricCard label="NPK Level" value={latestMetrics.npk} icon="flask" color="#10B981" trend={trends.npk} unit="%" isVerySmall={isVerySmall} />
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => handleMetricClick('soil')}>
                    <MetricCard label="Soil Humidity" value={`${latestMetrics.soilHumidity}%`} icon="sprout" color="#F59E0B" trend={trends.soilHumidity} unit="%" isVerySmall={isVerySmall} />
                </TouchableOpacity>
            </View>

            <View style={[styles.mainGrid, { flexDirection: isSmall ? 'column' : 'row', gap: isSmall ? 12 : 12, paddingHorizontal: isVerySmall ? 10 : 15, paddingBottom: isVerySmall ? 10 : 15 }]}>
                <View style={[styles.leftCol, { width: isSmall ? '100%' : '1.8', flex: isSmall ? undefined : 1.8, gap: 12 }]}>
                    <View style={[styles.card, styles.cameraBox, { minHeight: isVerySmall ? 180 : isSmall ? 220 : 260, padding: isVerySmall ? 10 : 14 }]}>
                        <View style={styles.bentoHeader}>
                            <View style={styles.titleWithIcon}>
                                <View style={styles.livePulse} />
                                <Text style={[styles.bentoTitle, { fontSize: isVerySmall ? 13 : 15 }]}>Live Feed: {camLabel}</Text>
                            </View>
                            
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative', zIndex: 50 }}>
                                <TouchableOpacity onPress={handleRefreshCamera}>
                                    <Icon name="refresh" size={isVerySmall ? 16 : 20} color="#94A3B8" />
                                </TouchableOpacity>

                                <TouchableOpacity onPress={() => setCameraMenuVisible(!cameraMenuVisible)}>
                                    <Icon name="dots-horizontal" size={isVerySmall ? 16 : 20} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        {refreshingCamera ? (
                            <View style={[styles.cameraFeed, { justifyContent: 'center', alignItems: 'center', minHeight: isVerySmall ? 120 : 150 }]}>
                                <ActivityIndicator color="#10B981" />
                            </View>
                        ) : (
                            <Image 
                                key={cameraKey} 
                                source={{ uri: `${activeCamera}?_=${cameraKey}`, headers: { 'ngrok-skip-browser-warning': 'true' } }} 
                                style={[styles.cameraFeed, { minHeight: isVerySmall ? 120 : 150 }]} 
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

                    <View style={[styles.card, styles.cropsBox, { minHeight: isVerySmall ? 240 : isSmall ? 260 : 280, padding: isVerySmall ? 10 : 14 }]}>
                        <CropHealthBarGraph allBellPepperData={allBellPepperData} windowWidth={windowWidth} />
                    </View>
                </View>

                <View style={[styles.rightCol, { width: isSmall ? '100%' : '1', flex: isSmall ? undefined : 1, gap: 12 }]}>
                    <View style={[styles.card, styles.detectionCard, { padding: isVerySmall ? 10 : 15 }]}>
                        <View style={styles.detectionHeader}>
                            <Text style={[styles.detectionTitle, { fontSize: isVerySmall ? 12 : 14 }]}>Detection Analytics</Text>
                            {/* MADE WATER INDICATOR CLICKABLE */}
                            <TouchableOpacity 
                                style={styles.waterIndicator}
                                onPress={() => handleMetricClick('water')}
                                activeOpacity={0.7}
                            >
                                <Icon name="water-outline" size={isVerySmall ? 10 : 12} color="#4D96FF" />
                                <Text style={[styles.waterValueText, { fontSize: isVerySmall ? 9 : 10 }]}>{latestMetrics.waterLevel}%</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.detectionMainGrid}>
                            <View style={styles.detectionGridRow}>
                                <DetectionItem label="Unripe" data={detections.unripe} color="#22C55E" icon="leaf" isVerySmall={isVerySmall} />
                                <DetectionItem label="Semi-Ripe" data={detections.semiRipe} color="#F59E0B" icon="leaf-circle" isVerySmall={isVerySmall} />
                            </View>
                            <View style={styles.detectionGridRow}>
                                <DetectionItem label="Ripe" data={detections.ripe} color="#EF4444" icon="leaf-circle" isVerySmall={isVerySmall} />
                                <DetectionItem label="Reject" data={detections.reject} color="#64748B" icon="close-octagon" isVerySmall={isVerySmall} />
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={styles.insectAlertBox} 
                            onPress={() => setInsectModalVisible(true)}
                        >
                            <View style={styles.insectIconBg}><Icon name="bug" size={isVerySmall ? 14 : 18} color="#991B1B" /></View>
                            <View>
                                <Text style={[styles.insectCountText, { fontSize: isVerySmall ? 11 : 13 }]}>{detections.insects} Insects Detected</Text>
                                <Text style={[styles.insectSubText, { fontSize: isVerySmall ? 8 : 9 }]}>Critical Action Required</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.card2, styles.logsBox, { padding: isVerySmall ? 8 : 10 }]}>
                        <View style={styles.logsHeader}>
                            <Text style={[styles.bentoTitle, { fontSize: isVerySmall ? 13 : 15 }]}>System Logs</Text>
                            <View style={styles.logsHeaderBadge}>
                                <Icon name="account-clock" size={12} color="#22C55E" />
                                <Text style={styles.logsHeaderBadgeText}>{logs.length} Records</Text>
                            </View>
                        </View>
                        {loadingLogs ? (
                            <ActivityIndicator size="small" color="#10B981" style={{ marginTop: 20 }} />
                        ) : (
                            <ScrollView 
                                showsVerticalScrollIndicator={false}
                                showsHorizontalScrollIndicator={false}
                                style={styles.logList}
                                removeClippedSubviews={false}
                                maintainVisibleContentPosition={{
                                    minIndexForVisible: 0,
                                }}
                            >
                                {logs.map((log, index) => (
                                    <TouchableOpacity
                                        key={`${log.timestamp}-${log.fullName}-${log.email}-${index}`}
                                        activeOpacity={0.9}
                                        onMouseEnter={() => setHoveredLogIndex(index)}
                                        onMouseLeave={() => setHoveredLogIndex(null)}
                                        style={[
                                            styles.logItem,
                                            hoveredLogIndex === index && styles.logItemHovered,
                                            { paddingVertical: isVerySmall ? 10 : 12 }
                                        ]}
                                    >
                                        <View style={styles.logAvatarContainer}>
                                            <Image 
                                                source={{ 
                                                    uri: `https://xvebncyvecfvocnqcxpk.supabase.co/storage/v1/object/public/images/${log.profile}`
                                                }} 
                                                style={[styles.logAvatar, { width: isVerySmall ? 36 : 40, height: isVerySmall ? 36 : 40 }]} 
                                                defaultSource={{ 
                                                    uri: `https://ui-avatars.com/api/?name=${log.firstname}&background=22C55E&color=fff`
                                                }} 
                                            />
                                            <View style={[styles.logStatusDot, { backgroundColor: '#22C55E' }]} />
                                        </View>
                                        <View style={styles.logContent}>
                                            <View style={styles.logNameRow}>
                                                <Text style={[styles.logName, { fontSize: isVerySmall ? 11 : 13 }]} numberOfLines={1}>
                                                    {log.fullName}
                                                </Text>
                                                <View style={styles.logActionIcon}>
                                                    <TouchableOpacity 
                                                        onPress={() => setMenuVisible(menuVisible === index ? null : index)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Icon name="dots-horizontal" size={isVerySmall ? 18 : 20} color="#94A3B8" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <Text style={[styles.logStatus, { fontSize: isVerySmall ? 9 : 11 }]}>
                                                {getTimeAgo(log.timestamp)}
                                            </Text>
                                        </View>

                                        {menuVisible === index && (
                                            <View style={styles.actionDropdown}>
                                                <TouchableOpacity 
                                                    style={styles.dropdownItem} 
                                                    onPress={() => handleViewInfo(log)}
                                                >
                                                    <Icon name="information-outline" size={14} color="#64748B" />
                                                    <Text style={styles.dropdownItemText}>View Information</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </View>
        </>
    ), [
        isVerySmall, isSmall, currentTime, latestMetrics, trends, 
        detections, allBellPepperData, windowWidth, logs, loadingLogs, 
        menuVisible, cameraKey, activeCamera, camLabel, refreshingCamera,
        cameraMenuVisible, hoveredLogIndex
    ]);

    return (
        <View style={styles.container}>
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
                                        showsHorizontalScrollIndicator={false}
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
                                    <ScrollView 
                                        style={{ maxHeight: 250 }}
                                        showsVerticalScrollIndicator={false}
                                        showsHorizontalScrollIndicator={false}
                                    >
                                        {dailyInsects.length > 0 ? dailyInsects.map((bug, index) => (
                                            <View key={`${bug.created_at}-${bug.insect_name}-${index}`} style={styles.pestDetailRow}>
                                                <View style={styles.detailIconBox}>
                                                    <Icon name="alert-decagram-outline" size={18} color="#6366F1" />
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 5 }}>
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

            {isSmall ? (
                <ScrollView 
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContentContainer}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                >
                    {MainContent}
                </ScrollView>
            ) : (
                <View style={styles.noScrollContainer}>
                    {MainContent}
                </View>
            )}
        </View>
    );
};

const DetailRow = ({ icon, label, value }) => (
    <View style={styles.detailRow}>
        <View style={styles.detailIconBox}><Icon name={icon} size={18} color="#6366F1" /></View>
        <View>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={styles.detailValue}>{value || 'Not provided'}</Text>
        </View>
    </View>
);

const DetectionItem = ({ label, data, color, icon, isVerySmall }) => {
    const trendIcon = data.dir === 'up' ? 'trending-up' : data.dir === 'down' ? 'trending-down' : 'trending-neutral';
    const trendColor = data.dir === 'up' ? '#10B981' : data.dir === 'down' ? '#EF4444' : '#94A3B8';
    return (
        <View style={[styles.detItem, { minWidth: isVerySmall ? 100 : 120, padding: isVerySmall ? 8 : 10 }]}>
            <View style={styles.cardHeaderArea}>
                <View style={styles.detItemHeader}>
                    <Icon name={icon} size={isVerySmall ? 10 : 14} color={color} />
                    <Text style={[styles.detItemLabel, { color: color, fontSize: isVerySmall ? 7 : 9 }]}>{label}</Text>
                </View>
                <View style={styles.inlineTrend}>
                    <Icon name={trendIcon} size={isVerySmall ? 8 : 12} color={trendColor} />
                    <Text style={[styles.detTrendText, { color: trendColor, fontSize: isVerySmall ? 8 : 10 }]}>{data.dir === 'stable' ? '0' : data.diff}</Text>
                </View>
            </View>
            <View style={styles.detItemCenterContent}><Text style={[styles.detItemCount, { fontSize: isVerySmall ? 18 : 24 }]}>{data.count}</Text></View>
        </View>
    );
};

const MetricCard = ({ label, value, icon, color, trend, unit, isVerySmall }) => {
    const trendIcon = trend.direction === 'up' ? 'trending-up' : trend.direction === 'down' ? 'trending-down' : 'trending-neutral';
    let trendColor = trend.direction === 'stable' ? '#94A3B8' : (label === 'Temp' ? (trend.direction === 'up' ? '#EF4444' : '#10B981') : (trend.direction === 'up' ? '#10B981' : '#EF4444'));
    return (
        <View style={[styles.metricCard, { padding: isVerySmall ? 8 : 10 }]}>
            <View style={styles.metricTopRight}>
                <Icon name={trendIcon} size={isVerySmall ? 8 : 12} color={trendColor} />
                <Text style={[styles.trendText, { color: trendColor, fontSize: isVerySmall ? 7 : 8 }]}>{trend.diff}{unit}</Text>
            </View>
            <View style={[styles.metricIconBox, { backgroundColor: `${color}15`, width: isVerySmall ? 26 : 32, height: isVerySmall ? 26 : 32 }]}><Icon name={icon} size={isVerySmall ? 16 : 20} color={color} /></View>
            <View style={{ flex: 1 }}><Text style={[styles.metricLabel, { fontSize: isVerySmall ? 7 : 9 }]}>{label}</Text><Text style={[styles.metricValue, { fontSize: isVerySmall ? 10 : 12 }]} numberOfLines={1}>{value}</Text></View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    scrollView: { flex: 1 },
    noScrollContainer: { flex: 1 },
    scrollContentContainer: { flexGrow: 1 },
    topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    headerLeft: { flex: 1 },
    welcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    headerGreeting: { fontSize: 14, color: '#64748B', fontWeight: '500' },
    headerDate: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
    metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 15, flexWrap: 'wrap' },
    metricCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6, position: 'relative', elevation: 1, minWidth: 80 },
    metricIconBox: { borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    metricLabel: { color: '#64748B', fontWeight: '600' },
    metricValue: { fontWeight: '700', color: '#1E293B' },
    metricTopRight: { position: 'absolute', top: 6, right: 6, flexDirection: 'row', alignItems: 'center', gap: 2 },
    trendText: { fontWeight: '800' },
    mainGrid: { flex: 1, gap: 12 },
    leftCol: { gap: 12 },
    rightCol: { gap: 12 },
    card: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    card2: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
    cameraBox: { flex: 1.2, minHeight: 260 },
    cropsBox: { flex: 1, minHeight: 280 },
    bentoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    bentoTitle: { fontWeight: '700', color: '#1E293B' },
    livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22C55E', marginRight: 6 },
    titleWithIcon: { flexDirection: 'row', alignItems: 'center' },
    cameraFeed: { flex: 1, width: '100%', borderRadius: 12, backgroundColor: '#F1F5F9', minHeight: 150 },
    
    // Crop Health Styles - FIXED bar height alignment
    cropHealthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, position: 'relative', zIndex: 10 },
    cropHealthTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
    cropDropdownMini: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', padding: 5, borderRadius: 6 },
    cropDropdownText: { fontSize: 10, color: '#64748B', fontWeight: '600' },
    cropDropdownMenu: { position: 'absolute', top: 30, backgroundColor: '#FFF', borderRadius: 10, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', width: 100, zIndex: 100 },
    cropDropdownItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    cropDropdownItemText: { fontSize: 12, color: '#1E293B' },
    cropGraphContent: { flexDirection: 'row', height: 150, marginBottom: 10 },
    cropYAxis: { justifyContent: 'space-between', paddingBottom: 10, alignItems: 'flex-end', paddingRight: 8 },
    cropAxisText: { color: '#94A3B8', fontWeight: 'bold' },
    cropBarsContainer: { flex: 1, flexDirection: 'column' },
    cropBarsWrapper: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', borderLeftWidth: 1, borderBottomWidth: 1, borderColor: '#F1F5F9', minHeight: 110 },
    cropBarColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
    cropBarWrapper: { width: '100%', alignItems: 'center', justifyContent: 'flex-end', flex: 1, minHeight: 80 },
    cropBarPill: { borderRadius: 50, minHeight: 3, alignSelf: 'center' },
    cropBarValue: { color: '#64748B', marginTop: 3, fontWeight: '600', textAlign: 'center' },
    cropXAxis: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8, marginBottom: -10 },
    cropXAxisText: { color: '#94A3B8', textAlign: 'center' },
    cropStatsRow: { flexDirection: 'row', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    cropStatBox: { flex: 1, backgroundColor: '#F8FAFC', paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
    cropStatValue: { fontWeight: '800', color: '#1E293B' },
    cropStatLabel: { color: '#94A3B8', fontWeight: '600', marginTop: 2 },
    noDataContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
    noDataText: { marginTop: 10, color: '#94A3B8', fontSize: 12, fontWeight: '500' },
    
    detectionCard: { flex: 1 },
    detectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
    detectionTitle: { fontWeight: '800', color: '#1E293B' },
    waterIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, cursor: 'pointer' },
    waterValueText: { fontWeight: '700', color: '#4D96FF', marginLeft: 4 },
    detectionMainGrid: { flex: 1, gap: 8, marginBottom: 12 }, 
    detectionGridRow: { flex: 1, flexDirection: 'row', gap: 8 },
    detItem: { flex: 1, backgroundColor: '#F1F5F9', borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', position: 'relative', justifyContent: 'center' },
    cardHeaderArea: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
    detItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    detItemLabel: { fontWeight: '700', textTransform: 'uppercase' },
    inlineTrend: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    detTrendText: { fontWeight: '800' },
    detItemCenterContent: { alignItems: 'center', justifyContent: 'center', marginTop: 4 },
    detItemCount: { fontWeight: '900', color: '#0F172A' },
    insectAlertBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 12, flexWrap: 'wrap' },
    insectIconBg: { width: 34, height: 34, borderRadius: 8, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
    insectCountText: { fontWeight: '700', color: '#991B1B' },
    insectSubText: { color: '#B91C1C', fontWeight: '600' },
    
    // Improved System Logs Styles
    logsBox: { flex: 0.8, overflow: 'hidden' },
    logsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
    logsHeaderBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#22C55E15', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
    logsHeaderBadgeText: { fontSize: 10, fontWeight: '600', color: '#22C55E' },
    logList: { flex: 1 },
    logItem: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 12, 
        marginBottom: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        transition: 'all 0.2s ease',
        position: 'relative'
    },
    logItemHovered: {
        backgroundColor: '#22C55E08',
        borderColor: '#22C55E30',
        transform: [{ scale: 1.01 }],
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    logAvatarContainer: {
        position: 'relative',
    },
    logAvatar: { 
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
    },
    logStatusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    logContent: {
        flex: 1,
    },
    logNameRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    logName: { 
        fontWeight: '700', 
        color: '#1E293B',
        flex: 1,
    },
    logActionIcon: {
        opacity: 0.6,
    },
    logStatus: { 
        color: '#94A3B8',
        fontWeight: '500',
    },
    dropdownMini: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', padding: 5, borderRadius: 6 },
    dropdownText: { fontSize: 10, color: '#64748B', fontWeight: '600' },
    actionDropdown: {
        position: 'absolute', 
        right: 50, 
        backgroundColor: '#FFFFFF', 
        borderRadius: 12, 
        padding: 6, 
        elevation: 15, 
        zIndex: 1000,
        borderWidth: 1, 
        borderColor: '#E2E8F0',
        minWidth: 150,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
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
    modalChartContainer: {
        width: '100%',
        marginBottom: 16,
        position: 'relative',
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
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
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
        borderBottomColor: '#F1F5F9',
        flexWrap: 'wrap'
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