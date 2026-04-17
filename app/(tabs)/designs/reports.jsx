import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    InteractionManager,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    useWindowDimensions,
    View,
} from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NGROK_URL } from "../../../ngrok_camera";

const TABS = ['General Reports', 'Sensor Logs', 'Pest Logs'];
const FILTERS = ['Today', 'Daily', 'Weekly'];
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Helper function for week number calculation (ISO 8601 compliant)
const getWeekNumber = (date) => {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
};

// Helper function to check if date is today
const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
};

// Helper function to get current date string
const getCurrentDateString = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
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

// Helper function to format date as YYYY-MM-DD
const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    const hourRanges = {
        7: { startHour: 7, startMinute: 0, endHour: 7, endMinute: 59 },
        8: { startHour: 8, startMinute: 0, endHour: 8, endMinute: 59 },
        9: { startHour: 9, startMinute: 0, endHour: 9, endMinute: 59 },
        10: { startHour: 10, startMinute: 0, endHour: 10, endMinute: 59 },
        11: { startHour: 11, startMinute: 0, endHour: 11, endMinute: 59 },
        12: { startHour: 12, startMinute: 0, endHour: 12, endMinute: 59 },
        13: { startHour: 13, startMinute: 0, endHour: 13, endMinute: 59 },
        14: { startHour: 14, startMinute: 0, endHour: 14, endMinute: 59 },
        15: { startHour: 15, startMinute: 0, endHour: 15, endMinute: 59 },
        16: { startHour: 16, startMinute: 0, endHour: 16, endMinute: 39 },
        17: { startHour: 16, startMinute: 40, endHour: 17, endMinute: 30 },
    };
    
    if (targetHour === 16) {
        const primaryData = todayData.filter(item => {
            const date = new Date(item.created_at);
            return isTimeInRange(date, 16, 0, 16, 39);
        });
        
        if (primaryData.length > 0) {
            const bestData = primaryData.reduce((latest, current) => {
                return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
            });
            const total = (parseInt(bestData.unripe) || 0) + 
                         (parseInt(bestData['semi-ripe']) || 0) + 
                         (parseInt(bestData.ripe) || 0);
            return total * 15;
        }
        
        const fallbackData = todayData.filter(item => {
            const date = new Date(item.created_at);
            return isTimeInRange(date, 15, 40, 16, 0);
        });
        
        if (fallbackData.length > 0) {
            const bestData = fallbackData.reduce((latest, current) => {
                return new Date(current.created_at) > new Date(latest.created_at) ? current : latest;
            });
            const total = (parseInt(bestData.unripe) || 0) + 
                         (parseInt(bestData['semi-ripe']) || 0) + 
                         (parseInt(bestData.ripe) || 0);
            return total * 15;
        }
        
        return 0;
    }
    
    if (hourRanges[targetHour]) {
        const range = hourRanges[targetHour];
        const hourData = todayData.filter(item => {
            const date = new Date(item.created_at);
            return isTimeInRange(date, range.startHour, range.startMinute, range.endHour, range.endMinute);
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
    }
    
    return 0;
};

// Function to generate unique ID for Sensor Logs
const generateSensorLogId = (sensorName, date, index) => {
    const year = date.getFullYear();
    let type = '';
    if (sensorName.toLowerCase().includes('pump')) {
        type = 'PMP';
    } else if (sensorName.toLowerCase().includes('temperature')) {
        type = 'TMP';
    } else if (sensorName.toLowerCase().includes('humidity')) {
        type = 'HMD';
    } else {
        type = 'SNS';
    }
    const sequential = String(index + 1).padStart(3, '0');
    return `SNS-${year}-${type}-${sequential}`;
};

// Function to generate unique ID for Pest Logs
const generatePestLogId = (insectName, date, index) => {
    const year = date.getFullYear();
    let type = '';
    if (insectName.toLowerCase().includes('aphid')) {
        type = 'APD';
    } else if (insectName.toLowerCase().includes('thrips')) {
        type = 'THP';
    } else if (insectName.toLowerCase().includes('mite')) {
        type = 'MTE';
    } else {
        type = 'PST';
    }
    const sequential = String(index + 1).padStart(3, '0');
    return `PST-${year}-${type}-${sequential}`;
};

// Metric Card Component - Same design as Dashboard
const MetricCard = ({ label, value, icon, color, trend, unit, isVerySmall }) => {
    const trendIcon = trend.direction === 'up' ? 'trending-up' : trend.direction === 'down' ? 'trending-down' : 'trending-neutral';
    let trendColor = trend.direction === 'stable' ? '#94A3B8' : 
                    (label === 'Temp' || label === 'Temperature' ? (trend.direction === 'up' ? '#EF4444' : '#10B981') : 
                    (trend.direction === 'up' ? '#10B981' : '#EF4444'));
    
    return (
        <View style={[styles.metricCard, { padding: isVerySmall ? 8 : 12 }]}>
            <View style={styles.metricTopRight}>
                <Icon name={trendIcon} size={isVerySmall ? 8 : 12} color={trendColor} />
                <Text style={[styles.trendText, { color: trendColor, fontSize: isVerySmall ? 7 : 8 }]}>
                    {trend.diff}{unit}
                </Text>
            </View>
            <View style={[styles.metricIconBox, { backgroundColor: `${color}15`, width: isVerySmall ? 32 : 40, height: isVerySmall ? 32 : 40 }]}>
                <Icon name={icon} size={isVerySmall ? 18 : 22} color={color} />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={[styles.metricLabel, { fontSize: isVerySmall ? 9 : 11 }]}>{label}</Text>
                <Text style={[styles.metricValue, { fontSize: isVerySmall ? 14 : 18 }]} numberOfLines={1}>{value}</Text>
            </View>
        </View>
    );
};

// Nutrient Bars Component - Only Nitrogen, Phosphorus, Potassium (No Soil Humidity)
const NutrientBars = ({ nitrogen, phosphorus, potassium }) => {
    const animNitrogen = useRef(new Animated.Value(0)).current;
    const animPhosphorus = useRef(new Animated.Value(0)).current;
    const animPotassium = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(animNitrogen, { toValue: nitrogen, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: false }),
            Animated.timing(animPhosphorus, { toValue: phosphorus, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: false }),
            Animated.timing(animPotassium, { toValue: potassium, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: false }),
        ]).start();
    }, [nitrogen, phosphorus, potassium]);

    const NUTRIENT_DATA = [
        { label: 'NITROGEN', value: nitrogen, anim: animNitrogen, color: '#22C55E', textcolor: '#2D2D2D' },
        { label: 'PHOSPHORUS', value: phosphorus, anim: animPhosphorus, color: '#2D2D2D', textcolor: '#ffffff' },
        { label: 'POTASSIUM', value: potassium, anim: animPotassium, color: '#22C55E', textcolor: '#2D2D2D' },
    ];

    return (
        <View style={styles.nutrientsBox}>
            <Text style={styles.nutrientsTitle}>Nutrients</Text>
            <View style={styles.nutrientsContainer}>
                {NUTRIENT_DATA.map((item, i) => (
                    <View key={i} style={styles.nutrientRow}>
                        <Animated.View 
                            style={[
                                styles.nutrientBar, 
                                { 
                                    backgroundColor: item.color, 
                                    width: item.anim.interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ['0%', '100%']
                                    }) 
                                }
                            ]}
                        >
                            <Text style={[styles.nutrientBarLabel, { color: item.textcolor }]}>{item.label}</Text>
                        </Animated.View>
                        <Text style={styles.nutrientPercent}>{item.value.toFixed(0)}%</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

// Crop Health Bar Graph Component
const CropHealthBarGraph = ({ activeFilter, setActiveFilter, allBellPepperData }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const animatedHeights = useRef([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const { width: windowWidth } = useWindowDimensions();
    const isSmall = windowWidth < 500;

    const data = useMemo(() => {
        if (activeFilter === 'Today') {
            const todayData = allBellPepperData.filter(item => {
                const date = new Date(item.created_at);
                return isToday(date);
            });
            
            const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
            
            const result = hours.map(hour => {
                let valueInPesos = 0;
                
                if (hour === 16) {
                    valueInPesos = getDataForHour(todayData, 16);
                } else if (hour === 17) {
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
                        valueInPesos = total * 15;
                    }
                } else {
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
                const dayKey = formatDateKey(date);
                
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
                .slice(0, 7);
            
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

            if (result.length === 0) {
                return [];
            }

            return result.map((item, index) => {
                if (index === 0) return { ...item, highlight: true };
                const prevValue = result[index - 1].value;
                const currentValue = item.value;
                const highlight = currentValue > prevValue;
                return { ...item, highlight };
            });
        } else {
            const weeklyValues = {};
            
            allBellPepperData.forEach(item => {
                const date = new Date(item.created_at);
                const weekNumber = getWeekNumber(date);
                const weekKey = `Week ${weekNumber}`;
                
                if (!weeklyValues[weekKey]) {
                    weeklyValues[weekKey] = [];
                }
                
                const total = (parseInt(item.unripe) || 0) + 
                             (parseInt(item['semi-ripe']) || 0) + 
                             (parseInt(item.ripe) || 0);
                const valueInPesos = total * 15;
                
                if (valueInPesos > 0) {
                    weeklyValues[weekKey].push(valueInPesos);
                }
            });

            const weeksWithData = Object.keys(weeklyValues)
                .sort()
                .slice(-4);
            
            const result = weeksWithData.map(weekKey => {
                const weekValues = weeklyValues[weekKey] || [];
                const modeValue = calculateMode(weekValues);
                
                return {
                    label: isSmall ? weekKey.replace('Week ', 'W') : weekKey,
                    value: modeValue
                };
            });

            if (result.length === 0) {
                return [];
            }

            return result.map((item, index) => {
                if (index === 0) return { ...item, highlight: true };
                const prevValue = result[index - 1].value;
                const currentValue = item.value;
                const highlight = currentValue > prevValue;
                return { ...item, highlight };
            });
        }
    }, [activeFilter, allBellPepperData, isSmall]);

    const maxValue = useMemo(() => {
        if (data.length === 0) return 1000;
        const max = Math.max(...data.map(d => d.value));
        return max > 0 ? max : 1000;
    }, [data]);

    useEffect(() => {
        animatedHeights.current = data.map(() => new Animated.Value(0));
        
        setIsAnimating(true);
        const animations = data.map((item, index) => {
            const targetHeight = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
            return Animated.timing(animatedHeights.current[index], {
                toValue: targetHeight,
                duration: 800,
                easing: Easing.out(Easing.exp),
                useNativeDriver: false,
            });
        });
        
        Animated.stagger(50, animations).start(() => {
            setIsAnimating(false);
        });
    }, [data, maxValue]);

    const getAnimatedBarHeight = (animatedValue) => {
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

    const currentDateString = getCurrentDateString();

    if (activeFilter === 'Weekly' && data.length === 0) {
        return (
            <View style={styles.cropHealthContainer}>
                <View style={styles.cropHealthHeader}>
                    <View>
                        <Text style={styles.cropHealthTitle}>Crop Health Revenue</Text>
                        <Text style={styles.cropHealthSubtitle}>Revenue Analysis (₱)</Text>
                    </View>
                    <View>
                        <TouchableOpacity 
                            style={styles.cropDropdownMini} 
                            onPress={() => setShowDropdown(!showDropdown)}
                        >
                            <Text style={styles.cropDropdownText}>{activeFilter}</Text>
                            <Icon name="chevron-down" size={14} color="#64748B" />
                        </TouchableOpacity>
                        {showDropdown && (
                            <View style={styles.cropDropdownMenu}>
                                {FILTERS.map(f => (
                                    <TouchableOpacity 
                                        key={f} 
                                        style={styles.cropDropdownItem} 
                                        onPress={() => { setActiveFilter(f); setShowDropdown(false); }}
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
                    <Text style={styles.noDataSubtext}>No data found for any week</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.cropHealthContainer}>
            <View style={styles.cropHealthHeader}>
                <View>
                    <Text style={styles.cropHealthTitle}>Crop Health Revenue</Text>
                    <Text style={styles.cropHealthSubtitle}>
                        {activeFilter === 'Today' ? currentDateString : 
                         activeFilter === 'Daily' ? 'Daily Mode Values (₱) - Last 7 Days With Data' : 
                         'Revenue Analysis (₱) - Weeks With Data'}
                    </Text>
                </View>
                
                <View>
                    <TouchableOpacity 
                        style={styles.cropDropdownMini} 
                        onPress={() => setShowDropdown(!showDropdown)}
                    >
                        <Text style={styles.cropDropdownText}>{activeFilter}</Text>
                        <Icon name="chevron-down" size={14} color="#64748B" />
                    </TouchableOpacity>

                    {showDropdown && (
                        <View style={styles.cropDropdownMenu}>
                            {FILTERS.map(f => (
                                <TouchableOpacity 
                                    key={f} 
                                    style={styles.cropDropdownItem} 
                                    onPress={() => { setActiveFilter(f); setShowDropdown(false); }}
                                >
                                    <Text style={[styles.cropDropdownItemText, activeFilter === f && {color: '#10B981'}]}>{f}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.cropGraphContent}>
                <View style={styles.cropYAxis}>
                    <Text style={styles.cropAxisText}>₱{maxValue}</Text>
                    <Text style={styles.cropAxisText}>₱{Math.round(maxValue * 0.75)}</Text>
                    <Text style={styles.cropAxisText}>₱{Math.round(maxValue * 0.5)}</Text>
                    <Text style={styles.cropAxisText}>₱{Math.round(maxValue * 0.25)}</Text>
                    <Text style={styles.cropAxisText}>₱0</Text>
                </View>

                <View style={styles.cropBarsContainer}>
                    <View style={styles.cropBarsWrapper}>
                        {data.map((item, index) => (
                            <View key={index} style={styles.cropBarColumn}>
                                <View style={styles.cropBarWrapper}>
                                    <Animated.View 
                                        style={[
                                            styles.cropBarPill, 
                                            getAnimatedBarHeight(animatedHeights.current[index]),
                                            { 
                                                backgroundColor: item.highlight ? '#22C55E' : '#2D2D2D',
                                            }
                                        ]} 
                                    />
                                </View>
                                {item.value > 0 && !isSmall && (
                                    <Text style={styles.cropBarValue}>₱{item.value}</Text>
                                )}
                            </View>
                        ))}
                    </View>
                    <View style={styles.cropXAxis}>
                        {data.map((item, index) => (
                            <Text key={index} style={styles.cropXAxisText}>{item.label}</Text>
                        ))}
                    </View>
                </View>
            </View>

            <View style={styles.cropStatsRow}>
                <View style={styles.cropStatBox}>
                    <Text style={styles.cropStatValue}>₱{data.length > 0 ? data[data.length - 1]?.value || 0 : 0}</Text>
                    <Text style={styles.cropStatLabel}>Latest</Text>
                </View>
                <View style={styles.cropStatBox}>
                    <Text style={styles.cropStatValue}>₱{data.length > 0 ? Math.max(...data.map(d => d.value)) : 0}</Text>
                    <Text style={styles.cropStatLabel}>Highest</Text>
                </View>
                <View style={styles.cropStatBox}>
                    <Text style={styles.cropStatValue}>₱{data.length > 0 ? (data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(0) : 0}</Text>
                    <Text style={styles.cropStatLabel}>Average</Text>
                </View>
            </View>
        </View>
    );
};

// Graph Modal Component
const GraphModal = ({ visible, onClose, title, data, unit, color, icon, currentValue, averageValue, maxValue, minValue }) => {
    const { width: windowWidth } = useWindowDimensions();
    const [chartLayout, setChartLayout] = useState({ width: 0 });
    const [hoverData, setHoverData] = useState(null);
    const drawAnim = useRef(new Animated.Value(0)).current;

    const GRAPH_HEIGHT = 200;
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
        if (visible && data.length > 0) {
            drawAnim.setValue(0);
            Animated.timing(drawAnim, { toValue: 1, duration: 1000, useNativeDriver: false }).start();
        }
    }, [visible, data]);

    const getCoordinateX = (hourVal, width) => {
        const usableWidth = width - (LEFT_MARGIN + RIGHT_MARGIN);
        const progress = (hourVal - START_HOUR) / TOTAL_HOURS_VISIBLE;
        return LEFT_MARGIN + (progress * usableWidth);
    };

    const getYPos = (val, maxVal) => {
        return TOP_PADDING + (GRAPH_HEIGHT - (parseFloat(val) / maxVal) * GRAPH_HEIGHT);
    };

    const maxChartValue = useMemo(() => {
        if (data.length === 0) return 100;
        const max = Math.max(...data.map(d => parseFloat(d.value)));
        return max > 0 ? Math.ceil(max * 1.1) : 100;
    }, [data]);

    const yLabels = [];
    for (let i = 0; i <= maxChartValue; i += maxChartValue / 5) {
        yLabels.push(Math.round(i));
    }

    const points = data.map(d => {
        const date = new Date(d.created_at);
        const h = date.getHours() + (date.getMinutes() / 60);
        return { x: getCoordinateX(h, chartLayout.width), y: getYPos(d.value, maxChartValue) };
    });

    let dString = points.length > 0 ? `M ${points[0].x} ${points[0].y}` : "";
    for (let i = 1; i < points.length; i++) dString += ` L ${points[i].x} ${points[i].y}`;

    const handleHover = (evt) => {
        const chartWidth = chartLayout.width;
        const xPos = Platform.OS === 'web' ? evt.nativeEvent.offsetX : evt.nativeEvent.locationX;
        let closest = null;
        let minDiff = Infinity;

        data.forEach(d => {
            const date = new Date(d.created_at);
            const h = date.getHours() + (date.getMinutes() / 60);
            const x = getCoordinateX(h, chartWidth);
            const diff = Math.abs(xPos - x);
            if (diff < minDiff && diff < 30) {
                minDiff = diff;
                closest = d;
            }
        });
        setHoverData(closest);
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

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.graphModalBox}>
                            <TouchableOpacity style={styles.graphCloseBtn} onPress={onClose}>
                                <Icon name="close" size={18} color="#64748B" />
                            </TouchableOpacity>

                            <View style={styles.modalGraphHeader}>
                                <View style={styles.modalGraphTitleContainer}>
                                    <View style={[styles.modalIconCircle, { backgroundColor: color + '15' }]}>
                                        <Icon name={icon} size={18} color={color} />
                                    </View>
                                    <View>
                                        <Text style={styles.modalGraphTitle}>{title}</Text>
                                        <Text style={styles.modalGraphSubtitle}>7:00 AM - 5:00 PM (Current Date)</Text>
                                    </View>
                                </View>
                            </View>

                            <View 
                                style={styles.modalChartContainer}
                                onLayout={(e) => setChartLayout({ width: e.nativeEvent.layout.width })}
                            >
                                {chartLayout.width > 0 && (
                                    <Svg height={GRAPH_HEIGHT + TOP_PADDING + 25} width={chartLayout.width}>
                                        <Defs>
                                            <LinearGradient id="modalGrad" x1="0" y1="0" x2="0" y2="1">
                                                <Stop offset="0" stopColor={color} stopOpacity="0.3" />
                                                <Stop offset="1" stopColor={color} stopOpacity="0" />
                                            </LinearGradient>
                                        </Defs>
                                        
                                        {yLabels.map(val => (
                                            <G key={val}>
                                                <Line 
                                                    x1={LEFT_MARGIN} 
                                                    y1={getYPos(val, maxChartValue)} 
                                                    x2={chartLayout.width - RIGHT_MARGIN} 
                                                    y2={getYPos(val, maxChartValue)} 
                                                    stroke="#E2E8F0" 
                                                    strokeWidth="0.5" 
                                                    strokeDasharray="4 4"
                                                />
                                                <SvgText 
                                                    x={LEFT_MARGIN - 8} 
                                                    y={getYPos(val, maxChartValue) + 4} 
                                                    fontSize={10} 
                                                    fill="#94A3B8" 
                                                    textAnchor="end" 
                                                    fontWeight="600"
                                                >
                                                    {val}{unit === '°C' ? '°' : unit === '%' ? '%' : ''}
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
                                                    fill="url(#modalGrad)" 
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

                                        {hoverData && (() => {
                                            const date = new Date(hoverData.created_at);
                                            const h = date.getHours() + (date.getMinutes() / 60);
                                            const x = getCoordinateX(h, chartLayout.width);
                                            const y = getYPos(hoverData.value, maxChartValue);
                                            
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
                                                        {parseFloat(hoverData.value).toFixed(1)}{unit}
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

                                        {points.length === 0 && (
                                            <SvgText x={chartLayout.width / 2} y={GRAPH_HEIGHT / 2} fontSize={12} fill="#94A3B8" textAnchor="middle">
                                                No data available for current date
                                            </SvgText>
                                        )}
                                    </Svg>
                                )}
                                
                                {data.length > 0 && (
                                    <View 
                                        style={StyleSheet.absoluteFill}
                                        onPointerMove={(e) => handleHover(e)}
                                        onPointerLeave={() => setHoverData(null)}
                                        onStartShouldSetResponder={() => true}
                                        onResponderMove={(e) => handleHover(e)}
                                        onResponderRelease={() => setHoverData(null)}
                                    />
                                )}
                            </View>

                            {data.length > 0 && (
                                <View style={styles.modalStatsGrid}>
                                    <View style={styles.modalStatCard}>
                                        <Icon name="chart-line" size={14} color={color} />
                                        <Text style={styles.modalStatCardLabel}>Latest</Text>
                                        <Text style={[styles.modalStatCardValue, { color }]}>{currentValue}{unit}</Text>
                                    </View>
                                    <View style={styles.modalStatCard}>
                                        <Icon name="chart-areaspline" size={14} color="#6366F1" />
                                        <Text style={styles.modalStatCardLabel}>Average</Text>
                                        <Text style={styles.modalStatCardValue}>{averageValue}{unit}</Text>
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

                            {data.length > 0 && (
                                <View style={styles.modalDataInfo}>
                                    <Icon name="database" size={12} color="#94A3B8" />
                                    <Text style={styles.modalDataInfoText}>{data.length} readings recorded for today</Text>
                                </View>
                            )}
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

// Helper function to filter data by current date
const filterDataByDate = (data, key = null) => {
    const today = new Date();
    const todayStr = formatDateKey(today);
    
    return data.filter(item => {
        const dateObj = new Date(item.created_at);
        const itemDateStr = formatDateKey(dateObj);
        return itemDateStr === todayStr;
    }).map(item => ({
        created_at: item.created_at,
        value: key ? parseFloat(item[key]) : parseFloat(item.value || item)
    })).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
};

export default function Reports() {
    const [activeTab, setActiveTab] = useState('General Reports');
    const [layoutWidth, setLayoutWidth] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [cropFilter, setCropFilter] = useState('Daily');
    
    // Data states
    const [allBellPepperData, setAllBellPepperData] = useState([]);
    const [temperatureData, setTemperatureData] = useState([]);
    const [soilHumidityData, setSoilHumidityData] = useState([]);
    const [waterLevelData, setWaterLevelData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Current values
    const [currentTemp, setCurrentTemp] = useState('--');
    const [currentSoilHumidity, setCurrentSoilHumidity] = useState('--');
    const [currentWaterLevel, setCurrentWaterLevel] = useState('--');
    
    // Average values
    const [avgTemp, setAvgTemp] = useState('--');
    const [avgSoilHumidity, setAvgSoilHumidity] = useState('--');
    const [avgWaterLevel, setAvgWaterLevel] = useState('--');
    
    // Min/Max values
    const [maxTemp, setMaxTemp] = useState('--');
    const [minTemp, setMinTemp] = useState('--');
    const [maxSoilHumidity, setMaxSoilHumidity] = useState('--');
    const [minSoilHumidity, setMinSoilHumidity] = useState('--');
    const [maxWaterLevel, setMaxWaterLevel] = useState('--');
    const [minWaterLevel, setMinWaterLevel] = useState('--');
    
    // NPK Values for Nutrient Bars
    const [nitrogenValue, setNitrogenValue] = useState(0);
    const [phosphorusValue, setPhosphorusValue] = useState(0);
    const [potassiumValue, setPotassiumValue] = useState(0);
    
    // Trend states for Metric Cards
    const [trends, setTrends] = useState({
        temp: { diff: 0, direction: 'stable' },
        soilHumidity: { diff: 0, direction: 'stable' },
        waterLevel: { diff: 0, direction: 'stable' }
    });
    
    // Modal states
    const [modalVisible, setModalVisible] = useState(false);
    const [modalConfig, setModalConfig] = useState({
        title: '',
        data: [],
        unit: '',
        color: '',
        icon: '',
        currentValue: '',
        averageValue: '',
        maxValue: '',
        minValue: ''
    });

    // Sensor Logs data - New endpoint
    const [sensorLogs, setSensorLogs] = useState([]);
    const [pestLogs, setPestLogs] = useState([]);
    
    // Responsive breakpoints
    const { width: windowWidth } = useWindowDimensions();
    const isVerySmall = windowWidth < 500;

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

    // Fetch Bell Pepper Data
    const fetchBellPepperData = useCallback(async () => {
        try {
            const response = await fetch(`${NGROK_URL}/api/getallbellpeppercount`, { 
                headers: { 'ngrok-skip-browser-warning': 'true' } 
            });
            const data = await response.json();
            const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setAllBellPepperData(sortedData);
        } catch (e) { 
            console.error("Bell Pepper Fetch Error:", e); 
        }
    }, []);

    // Fetch Temperature Data with trend calculation
    const fetchTemperatureData = useCallback(async () => {
        try {
            const response = await fetch(`${NGROK_URL}/api/getalltemperature`, { 
                headers: { 'ngrok-skip-browser-warning': 'true' } 
            });
            const data = await response.json();
            const filtered = filterDataByDate(data, 'temperature');
            setTemperatureData(filtered);
            
            if (filtered.length > 0) {
                const values = filtered.map(d => d.value);
                const latest = values[values.length - 1];
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                const max = Math.max(...values);
                const min = Math.min(...values);
                setCurrentTemp(latest.toFixed(1));
                setAvgTemp(avg.toFixed(1));
                setMaxTemp(max.toFixed(1));
                setMinTemp(min.toFixed(1));
                
                // Calculate trend
                if (values.length >= 2) {
                    const prev = values[values.length - 2];
                    const diff = latest - prev;
                    setTrends(prevTrends => ({
                        ...prevTrends,
                        temp: { diff: Math.abs(diff).toFixed(1), direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable' }
                    }));
                }
            }
        } catch (e) { 
            console.error("Temperature Fetch Error:", e); 
        }
    }, []);

    // Fetch Soil Humidity Data with trend calculation
    const fetchSoilHumidityData = useCallback(async () => {
        try {
            const response = await fetch(`${NGROK_URL}/api/getallsoilhumidity`, { 
                headers: { 'ngrok-skip-browser-warning': 'true' } 
            });
            const data = await response.json();
            const filtered = filterDataByDate(data, 'soilaverage');
            setSoilHumidityData(filtered);
            
            if (filtered.length > 0) {
                const values = filtered.map(d => d.value);
                const latest = values[values.length - 1];
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                const max = Math.max(...values);
                const min = Math.min(...values);
                setCurrentSoilHumidity(latest.toFixed(0));
                setAvgSoilHumidity(avg.toFixed(0));
                setMaxSoilHumidity(max.toFixed(0));
                setMinSoilHumidity(min.toFixed(0));
                
                // Calculate trend
                if (values.length >= 2) {
                    const prev = values[values.length - 2];
                    const diff = latest - prev;
                    setTrends(prevTrends => ({
                        ...prevTrends,
                        soilHumidity: { diff: Math.abs(diff).toFixed(0), direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable' }
                    }));
                }
            }
        } catch (e) { 
            console.error("Soil Humidity Fetch Error:", e); 
        }
    }, []);

    // Fetch Water Level Data with trend calculation
    const fetchWaterLevelData = useCallback(async () => {
        try {
            const response = await fetch(`${NGROK_URL}/api/getallwaterlevel`, { 
                headers: { 'ngrok-skip-browser-warning': 'true' } 
            });
            const data = await response.json();
            const filtered = filterDataByDate(data, 'level');
            setWaterLevelData(filtered);
            
            if (filtered.length > 0) {
                const values = filtered.map(d => d.value);
                const latest = values[values.length - 1];
                const avg = values.reduce((a, b) => a + b, 0) / values.length;
                const max = Math.max(...values);
                const min = Math.min(...values);
                setCurrentWaterLevel(latest.toFixed(1));
                setAvgWaterLevel(avg.toFixed(1));
                setMaxWaterLevel(max.toFixed(1));
                setMinWaterLevel(min.toFixed(1));
                
                // Calculate trend
                if (values.length >= 2) {
                    const prev = values[values.length - 2];
                    const diff = latest - prev;
                    setTrends(prevTrends => ({
                        ...prevTrends,
                        waterLevel: { diff: Math.abs(diff).toFixed(1), direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable' }
                    }));
                }
            }
        } catch (e) { 
            console.error("Water Level Fetch Error:", e); 
        }
    }, []);

    // Fetch NPK Data for Nutrient Bars
    const fetchNPKData = useCallback(async () => {
        try {
            const response = await fetch(`${NGROK_URL}/api/getallnpk`, { 
                headers: { 'ngrok-skip-browser-warning': 'true' } 
            });
            const data = await response.json();
            if (data && data.length > 0) {
                const latest = data[0];
                setNitrogenValue(parseFloat(latest.nitrogen) || 0);
                setPhosphorusValue(parseFloat(latest.phosphorus) || 0);
                setPotassiumValue(parseFloat(latest.potassium) || 0);
            }
        } catch (e) { 
            console.error("NPK Fetch Error:", e); 
        }
    }, []);

    // Fetch Sensor Logs from new endpoint
    const fetchSensorLogs = useCallback(async () => {
        try {
            const response = await fetch(`${NGROK_URL}/api/getallsensorlogs`, { 
                headers: { 'ngrok-skip-browser-warning': 'true' } 
            });
            const data = await response.json();
            // Sort by created_at descending (newest first)
            const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setSensorLogs(sortedData);
        } catch (e) { 
            console.error("Sensor Logs Fetch Error:", e); 
        }
    }, []);

    // Fetch Pest Logs - Get all logs, not just today's
    const fetchPestLogs = useCallback(async () => {
        try {
            const response = await fetch(`${NGROK_URL}/api/getallpestlogs`, { 
                headers: { 'ngrok-skip-browser-warning': 'true' } 
            });
            const data = await response.json();
            // Sort by created_at descending (newest first)
            const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setPestLogs(sortedData);
        } catch (e) { 
            console.error("Pest Logs Fetch Error:", e); 
        }
    }, []);

    // Initial data fetch - ONLY ONCE on mount (no interval)
    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            await Promise.all([
                fetchBellPepperData(),
                fetchTemperatureData(),
                fetchSoilHumidityData(),
                fetchWaterLevelData(),
                fetchNPKData(),
                fetchSensorLogs(),
                fetchPestLogs()
            ]);
            setLoading(false);
        };
        
        fetchAllData();
        // NO INTERVAL - data fetches only once when component mounts
    }, []); // Empty dependency array means this runs once on mount

    const handleMetricPress = (type) => {
        let config = {};
        if (type === 'temperature') {
            config = {
                title: 'Temperature',
                data: temperatureData,
                unit: '°C',
                color: '#EF4444',
                icon: 'thermometer',
                currentValue: currentTemp,
                averageValue: avgTemp,
                maxValue: maxTemp,
                minValue: minTemp
            };
        } else if (type === 'soilHumidity') {
            config = {
                title: 'Soil Humidity',
                data: soilHumidityData,
                unit: '%',
                color: '#F59E0B',
                icon: 'sprout',
                currentValue: currentSoilHumidity,
                averageValue: avgSoilHumidity,
                maxValue: maxSoilHumidity,
                minValue: minSoilHumidity
            };
        } else if (type === 'waterLevel') {
            config = {
                title: 'Water Level',
                data: waterLevelData,
                unit: '%',
                color: '#4D96FF',
                icon: 'water',
                currentValue: currentWaterLevel,
                averageValue: avgWaterLevel,
                maxValue: maxWaterLevel,
                minValue: minWaterLevel
            };
        }
        setModalConfig(config);
        setModalVisible(true);
    };

    const formatTimeForDisplay = (dateString) => {
        const date = new Date(dateString);
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
        return `${hours}:${minutesStr} ${ampm}`;
    };

    const formatDateForDisplay = (dateString) => {
        const date = new Date(dateString);
        const month = date.toLocaleString('en-US', { month: 'short' });
        const day = date.getDate();
        const year = date.getFullYear();
        return `${month} ${day}, ${year}`;
    };

    // Get icon based on sensor name
    const getSensorIcon = (sensorName) => {
        if (sensorName.toLowerCase().includes('pump')) {
            return 'water-pump';
        } else if (sensorName.toLowerCase().includes('temperature')) {
            return 'thermometer';
        } else if (sensorName.toLowerCase().includes('humidity')) {
            return 'water-percent';
        } else {
            return 'sensor';
        }
    };

    // Get color based on sensor name
    const getSensorColor = (sensorName) => {
        if (sensorName.toLowerCase().includes('pump')) {
            return '#4D96FF';
        } else if (sensorName.toLowerCase().includes('temperature')) {
            return '#EF4444';
        } else if (sensorName.toLowerCase().includes('humidity')) {
            return '#10B981';
        } else {
            return '#6366F1';
        }
    };

    // Get icon for pest based on insect name
    const getPestIcon = (insectName) => {
        if (insectName.toLowerCase().includes('aphid')) {
            return 'bug';
        } else if (insectName.toLowerCase().includes('thrips')) {
            return 'bug-outline';
        } else if (insectName.toLowerCase().includes('mite')) {
            return 'spider';
        } else {
            return 'bug-check';
        }
    };

    // Get color for pest based on insect name
    const getPestColor = (insectName) => {
        if (insectName.toLowerCase().includes('aphid')) {
            return '#EF4444';
        } else if (insectName.toLowerCase().includes('thrips')) {
            return '#F59E0B';
        } else if (insectName.toLowerCase().includes('mite')) {
            return '#8B5CF6';
        } else {
            return '#6366F1';
        }
    };

    const renderGeneralReports = () => (
        <View>
            {/* Metric Cards with new design */}
            <View style={styles.metricsRow}>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => handleMetricPress('temperature')}>
                    <MetricCard 
                        label="Temperature" 
                        value={`${currentTemp}°C`} 
                        icon="thermometer" 
                        color="#FF6B6B" 
                        trend={trends.temp} 
                        unit="°" 
                        isVerySmall={isVerySmall}
                    />
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => handleMetricPress('soilHumidity')}>
                    <MetricCard 
                        label="Soil Humidity" 
                        value={`${currentSoilHumidity}%`} 
                        icon="sprout" 
                        color="#F59E0B" 
                        trend={trends.soilHumidity} 
                        unit="%" 
                        isVerySmall={isVerySmall}
                    />
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1 }} onPress={() => handleMetricPress('waterLevel')}>
                    <MetricCard 
                        label="Water Level" 
                        value={`${currentWaterLevel}%`} 
                        icon="water" 
                        color="#4D96FF" 
                        trend={trends.waterLevel} 
                        unit="%" 
                        isVerySmall={isVerySmall}
                    />
                </TouchableOpacity>
            </View>

            {/* Nutrient Bars */}
            <NutrientBars 
                nitrogen={nitrogenValue}
                phosphorus={phosphorusValue}
                potassium={potassiumValue}
            />

            {/* Crop Health Section */}
            <CropHealthBarGraph 
                activeFilter={cropFilter} 
                setActiveFilter={setCropFilter} 
                allBellPepperData={allBellPepperData}
            />
        </View>
    );

    const renderSensorLogs = () => (
        <View style={styles.whiteCard}>
            <Text style={styles.sectionTitle}>Sensor Logs</Text>
            {sensorLogs.length === 0 ? (
                <View style={styles.noDataContainer}>
                    <Icon name="database" size={40} color="#CBD5E1" />
                    <Text style={styles.noDataText}>No sensor logs available</Text>
                </View>
            ) : (
                sensorLogs.map((log, index) => {
                    const logDate = new Date(log.created_at);
                    const generatedId = generateSensorLogId(log.sensor_name, logDate, index);
                    
                    return (
                        <View key={log.id || index} style={[styles.sensorLogRow, index === sensorLogs.length - 1 && { borderBottomWidth: 0 }]}>
                            <View style={styles.sensorIconContainer}>
                                <View style={[styles.sensorIconCircle, { backgroundColor: getSensorColor(log.sensor_name) + '15' }]}>
                                    <Icon name={getSensorIcon(log.sensor_name)} size={20} color={getSensorColor(log.sensor_name)} />
                                </View>
                            </View>
                            <View style={styles.sensorLogContent}>
                                <View style={styles.sensorLogHeader}>
                                    <View style={styles.sensorLogTitleRow}>
                                        <Text style={styles.sensorLogName}>{log.sensor_name}</Text>
                                        <View style={styles.sensorLogIdBadge}>
                                            <Text style={styles.sensorLogIdText}>{generatedId}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.sensorLogDate}>{formatDateForDisplay(log.created_at)}</Text>
                                </View>
                                <Text style={styles.sensorLogDescription} numberOfLines={2}>
                                    {log.description}
                                </Text>
                                <View style={styles.sensorLogTimeRow}>
                                    <Icon name="clock-outline" size={10} color="#94A3B8" />
                                    <Text style={styles.sensorLogTime}>{formatTimeForDisplay(log.created_at)}</Text>
                                </View>
                            </View>
                        </View>
                    );
                })
            )}
        </View>
    );

    const renderPestLogs = () => (
        <View style={styles.whiteCard}>
            <Text style={styles.sectionTitle}>Pest Logs</Text>
            {pestLogs.length === 0 ? (
                <View style={styles.noDataContainer}>
                    <Icon name="shield-check" size={40} color="#10B981" />
                    <Text style={styles.noDataText}>No pest logs available</Text>
                    <Text style={styles.noDataSubtext}>Environment is clear</Text>
                </View>
            ) : (
                pestLogs.map((pest, index) => {
                    const pestDate = new Date(pest.created_at);
                    const generatedId = generatePestLogId(pest.insect_name, pestDate, index);
                    
                    return (
                        <View key={pest.id || index} style={[styles.pestLogRow, index === pestLogs.length - 1 && { borderBottomWidth: 0 }]}>
                            <View style={styles.pestIconContainer}>
                                <View style={[styles.pestIconCircle, { backgroundColor: getPestColor(pest.insect_name) + '15' }]}>
                                    <Icon name={getPestIcon(pest.insect_name)} size={20} color={getPestColor(pest.insect_name)} />
                                </View>
                            </View>
                            <View style={styles.pestLogContent}>
                                <View style={styles.pestLogHeader}>
                                    <View style={styles.pestLogTitleRow}>
                                        <Text style={styles.pestLogName}>{pest.insect_name}</Text>
                                        <View style={styles.pestLogIdBadge}>
                                            <Text style={styles.pestLogIdText}>{generatedId}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.pestLogDate}>{formatDateForDisplay(pest.created_at)}</Text>
                                </View>
                                <Text style={styles.pestLogDescription} numberOfLines={2}>
                                    {pest.description}
                                </Text>
                                <View style={styles.pestLogFooter}>
                                    <View style={styles.pestCountContainer}>
                                        <Icon name="counter" size={10} color="#EF4444" />
                                        <Text style={styles.pestCountText}>Count: {pest.counts}</Text>
                                    </View>
                                    <View style={styles.pestLogTimeRow}>
                                        <Icon name="clock-outline" size={10} color="#94A3B8" />
                                        <Text style={styles.pestLogTime}>{formatTimeForDisplay(pest.created_at)}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    );
                })
            )}
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

                <ScrollView 
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                >
                    {loading && activeTab === 'General Reports' ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#10B981" />
                        </View>
                    ) : (
                        <>
                            {activeTab === 'General Reports' && renderGeneralReports()}
                            {activeTab === 'Sensor Logs' && renderSensorLogs()}
                            {activeTab === 'Pest Logs' && renderPestLogs()}
                        </>
                    )}
                </ScrollView>
            </View>

            {/* Graph Modal */}
            <GraphModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                title={modalConfig.title}
                data={modalConfig.data}
                unit={modalConfig.unit}
                color={modalConfig.color}
                icon={modalConfig.icon}
                currentValue={modalConfig.currentValue}
                averageValue={modalConfig.averageValue}
                maxValue={modalConfig.maxValue}
                minValue={modalConfig.minValue}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    header: { paddingHorizontal: 25, paddingTop: 20, paddingBottom: 10 },
    mainTitle: { fontSize: 32, fontWeight: '800', color: '#1E293B', marginBottom: 10 },
    tabBar: { flexDirection: 'row', gap: 20 },
    tabItem: { paddingBottom: 10 },
    activeTab: { borderBottomWidth: 3, borderBottomColor: '#10B981' },
    tabText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
    activeTabText: { color: '#1E293B' },
    content: { padding: 20, paddingTop: 10, paddingBottom: 40 },

    loadingContainer: { height: 400, justifyContent: 'center', alignItems: 'center' },

    whiteCard: { 
        backgroundColor: '#FFF', 
        borderRadius: 20, 
        padding: 16, 
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },

    // New Metric Cards Row
    metricsRow: { 
        flexDirection: 'row', 
        gap: 12, 
        marginBottom: 20,
        marginTop: -10,
        flexWrap: 'wrap',
    },
    
    // Metric Card Styles
    metricCard: { 
        backgroundColor: '#FFF', 
        borderRadius: 16, 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 10, 
        position: 'relative', 
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        minWidth: 100,
    },
    metricIconBox: { 
        borderRadius: 10, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    metricLabel: { 
        color: '#64748B', 
        fontWeight: '600' 
    },
    metricValue: { 
        fontWeight: '800', 
        color: '#1E293B' 
    },
    metricTopRight: { 
        position: 'absolute', 
        top: 8, 
        right: 10, 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 2 
    },
    trendText: { 
        fontWeight: '800' 
    },

    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, color: '#1E293B' },

    // Sensor Logs Styles
    sensorLogRow: {
        flexDirection: 'row',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'flex-start',
        gap: 12,
    },
    sensorIconContainer: {
        width: 44,
        alignItems: 'center',
    },
    sensorIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sensorLogContent: {
        flex: 1,
    },
    sensorLogHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        flexWrap: 'wrap',
        gap: 6,
    },
    sensorLogTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    sensorLogName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    sensorLogIdBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    sensorLogIdText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#64748B',
        letterSpacing: 0.5,
    },
    sensorLogDate: {
        fontSize: 10,
        fontWeight: '500',
        color: '#94A3B8',
    },
    sensorLogDescription: {
        fontSize: 12,
        color: '#475569',
        lineHeight: 16,
        marginBottom: 6,
    },
    sensorLogTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    sensorLogTime: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '500',
    },

    // Pest Logs Styles
    pestLogRow: {
        flexDirection: 'row',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'flex-start',
        gap: 12,
    },
    pestIconContainer: {
        width: 44,
        alignItems: 'center',
    },
    pestIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pestLogContent: {
        flex: 1,
    },
    pestLogHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
        flexWrap: 'wrap',
        gap: 6,
    },
    pestLogTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    pestLogName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#991B1B',
    },
    pestLogIdBadge: {
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    pestLogIdText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#991B1B',
        letterSpacing: 0.5,
    },
    pestLogDate: {
        fontSize: 10,
        fontWeight: '500',
        color: '#94A3B8',
    },
    pestLogDescription: {
        fontSize: 12,
        color: '#475569',
        lineHeight: 16,
        marginBottom: 6,
    },
    pestLogFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
    },
    pestCountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FEF2F2',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    pestCountText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#EF4444',
    },
    pestLogTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pestLogTime: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '500',
    },

    // Nutrient Bars Styles
    nutrientsBox: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 10,
        marginBottom: 10,
        marginTop: -10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        width: '100%',
    },
    nutrientsTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 12,
    },
    nutrientsContainer: {
        marginVertical: 0,
    },
    nutrientRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    nutrientBar: {
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        paddingLeft: 15,
        overflow: 'hidden',
    },
    nutrientBarLabel: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    nutrientPercent: {
        marginLeft: 10,
        fontWeight: 'bold',
        color: '#64748B',
        minWidth: 45,
    },

    // Crop Health Styles
    cropHealthContainer: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cropHealthHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        zIndex: 10,
    },
    cropHealthTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    cropHealthSubtitle: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
    cropDropdownMini: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 4,
    },
    cropDropdownText: { fontSize: 11, color: '#64748B', fontWeight: '600' },
    cropDropdownMenu: {
        position: 'absolute',
        top: 35,
        right: 0,
        backgroundColor: '#FFF',
        borderRadius: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        width: 100,
        zIndex: 100,
    },
    cropDropdownItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    cropDropdownItemText: { fontSize: 12, color: '#1E293B' },
    cropGraphContent: { flexDirection: 'row', height: 160, marginBottom: 8 },
    cropYAxis: { width: 45, justifyContent: 'space-between', paddingBottom: 20, alignItems: 'flex-end', paddingRight: 8 },
    cropAxisText: { fontSize: 9, color: '#94A3B8', fontWeight: 'bold' },
    cropBarsContainer: { flex: 1, flexDirection: 'column' },
    cropBarsWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        borderLeftWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#F1F5F9',
        minHeight: 110,
    },
    cropBarColumn: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
    cropBarWrapper: { width: '100%', alignItems: 'center', justifyContent: 'flex-end', flex: 1, minHeight: 80 },
    cropBarPill: { width: 13, borderRadius: 50, minHeight: 3, alignSelf: 'center' },
    cropBarValue: { fontSize: 7, color: '#64748B', marginTop: 3, fontWeight: '600', textAlign: 'center' },
    cropXAxis: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
    cropXAxisText: { fontSize: 8, color: '#94A3B8', textAlign: 'center', width: 35 },
    cropStatsRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    cropStatBox: { flex: 1, backgroundColor: '#F8FAFC', paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    cropStatValue: { fontWeight: '800', color: '#1E293B', fontSize: 12 },
    cropStatLabel: { color: '#94A3B8', fontWeight: '600', fontSize: 9, marginTop: 2 },

    noDataContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    noDataText: { fontSize: 14, fontWeight: '600', color: '#64748B', marginTop: 10 },
    noDataSubtext: { fontSize: 12, color: '#94A3B8', marginTop: 4 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'center', alignItems: 'center' },
    graphModalBox: {
        width: '92%',
        maxWidth: 550,
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 18,
        position: 'relative',
        elevation: 20,
        maxHeight: '85%',
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
        fontSize: 13,
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
});