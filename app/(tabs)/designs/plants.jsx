import { useEffect, useMemo, useRef, useState } from 'react';
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
    useWindowDimensions,
    View,
} from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { NGROK_URL } from "../../../ngrok_camera";

const TABS = ['Paquillo Pepper', 'Crop Health', 'Nutrients'];
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

// Custom function to check if time is within a specific range
const isTimeInRange = (date, startHour, startMinute, endHour, endMinute) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const timeInMinutes = hours * 60 + minutes;
    const startInMinutes = startHour * 60 + startMinute;
    const endInMinutes = endHour * 60 + endMinute;
    return timeInMinutes >= startInMinutes && timeInMinutes <= endInMinutes;
};

// Function to get data for a specific hour with fallback logic
const getDataForHour = (todayData, targetHour) => {
    // Define time ranges for each hour
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
        16: { startHour: 16, startMinute: 0, endHour: 16, endMinute: 39 }, // 4:00 PM to 4:39 PM
        17: { startHour: 16, startMinute: 40, endHour: 17, endMinute: 30 }, // 4:40 PM to 5:30 PM
    };
    
    // For 4:00 PM (hour 16), we need special handling with fallback
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
    }
    
    // For other hours, use standard range
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

// Custom Date Picker Component
const CustomDatePicker = ({ visible, onClose, onSelectDate, currentDate, availableDates }) => {
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const getDaysInMonth = (year, month) => {
        return new Date(year, month + 1, 0).getDate();
    };
    
    const getFirstDayOfMonth = (year, month) => {
        return new Date(year, month, 1).getDay();
    };
    
    const handleDateSelect = (day) => {
        const selectedDate = new Date(selectedYear, selectedMonth, day);
        onSelectDate(selectedDate);
        onClose();
    };
    
    const isDateAvailable = (year, month, day) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return availableDates.includes(dateStr);
    };
    
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);
    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
        days.push(<View key={`empty-${i}`} style={styles.calendarDayEmpty} />);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const available = isDateAvailable(selectedYear, selectedMonth, day);
        const isCurrentDate = currentDate.getDate() === day && 
                            currentDate.getMonth() === selectedMonth && 
                            currentDate.getFullYear() === selectedYear;
        
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
                ]}>
                    {day}
                </Text>
                {available && (
                    <View style={[
                        styles.dateUnderline,
                        isCurrentDate && styles.dateUnderlineCurrent
                    ]} />
                )}
            </TouchableOpacity>
        );
    }
    
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

// Revenue Insights Component (Modified as per requirements)
const RevenueInsights = ({ allBellPepperData }) => {
    const insights = useMemo(() => {
        // Calculate Today's Revenue (based on latest data for today)
        const todayData = allBellPepperData.filter(item => isToday(new Date(item.created_at)));
        let todayRevenue = 0;
        if (todayData.length > 0) {
            const latestToday = todayData.reduce((latest, current) => 
                new Date(current.created_at) > new Date(latest.created_at) ? current : latest
            );
            const total = (parseInt(latestToday.unripe) || 0) + 
                         (parseInt(latestToday['semi-ripe']) || 0) + 
                         (parseInt(latestToday.ripe) || 0);
            todayRevenue = total * 15;
        }

        // Calculate Daily Revenue (Mode of daily revenues)
        const dailyRevenues = {};
        allBellPepperData.forEach(item => {
            const dateKey = formatDateKey(new Date(item.created_at));
            const total = (parseInt(item.unripe) || 0) + 
                         (parseInt(item['semi-ripe']) || 0) + 
                         (parseInt(item.ripe) || 0);
            const revenue = total * 15;
            if (!dailyRevenues[dateKey]) dailyRevenues[dateKey] = [];
            if (revenue > 0) dailyRevenues[dateKey].push(revenue);
        });
        
        const dailyRevenueModes = Object.values(dailyRevenues)
            .map(revs => calculateMode(revs))
            .filter(val => val > 0);
        const dailyMode = dailyRevenueModes.length > 0 ? calculateMode(dailyRevenueModes) : 0;

        // Calculate Weekly Revenue (Mode of weekly revenues)
        const weeklyRevenues = {};
        allBellPepperData.forEach(item => {
            const date = new Date(item.created_at);
            const weekKey = `${date.getFullYear()}-W${getWeekNumber(date)}`;
            const total = (parseInt(item.unripe) || 0) + 
                         (parseInt(item['semi-ripe']) || 0) + 
                         (parseInt(item.ripe) || 0);
            const revenue = total * 15;
            if (!weeklyRevenues[weekKey]) weeklyRevenues[weekKey] = [];
            if (revenue > 0) weeklyRevenues[weekKey].push(revenue);
        });
        
        const weeklyRevenueModes = Object.values(weeklyRevenues)
            .map(revs => calculateMode(revs))
            .filter(val => val > 0);
        const weeklyMode = weeklyRevenueModes.length > 0 ? calculateMode(weeklyRevenueModes) : 0;

        // Calculate Weekly Average Revenue
        const allRevenues = allBellPepperData
            .map(item => {
                const total = (parseInt(item.unripe) || 0) + 
                             (parseInt(item['semi-ripe']) || 0) + 
                             (parseInt(item.ripe) || 0);
                return total * 15;
            })
            .filter(val => val > 0);
        const weeklyAverage = allRevenues.length > 0 ? 
            allRevenues.reduce((sum, val) => sum + val, 0) / 7 : 0;

        // Calculate Reject Loss Money (based on latest reject count)
        const latestData = allBellPepperData.length > 0 ? 
            allBellPepperData.reduce((latest, current) => 
                new Date(current.created_at) > new Date(latest.created_at) ? current : latest
            ) : null;
        const rejectLoss = latestData ? (parseInt(latestData.reject) || 0) * 15 : 0;

        // Calculate Active Days
        const uniqueDates = new Set();
        allBellPepperData.forEach(item => {
            uniqueDates.add(formatDateKey(new Date(item.created_at)));
        });
        const activeDays = uniqueDates.size;

        return {
            todayRevenue,
            dailyMode,
            weeklyMode,
            weeklyAverage: Math.round(weeklyAverage),
            rejectLoss,
            activeDays
        };
    }, [allBellPepperData]);

    return (
        <View style={styles.revenueInsightsContainer}>
            <Text style={styles.revenueInsightsTitle}>Revenue Insights</Text>
            
            <View style={styles.revenueStatsGrid}>
                <View style={styles.revenueStatCard}>
                    <Icon name="calendar-today" size={16} color="#10B981" />
                    <Text style={styles.revenueStatLabel}>Today</Text>
                    <Text style={styles.revenueStatValue}>₱{insights.todayRevenue.toLocaleString()}</Text>
                </View>
                
                <View style={styles.revenueStatCard}>
                    <Icon name="chart-bar" size={16} color="#10B981" />
                    <Text style={styles.revenueStatLabel}>Daily</Text>
                    <Text style={styles.revenueStatValue}>₱{insights.dailyMode.toLocaleString()}</Text>
                </View>
                
                <View style={styles.revenueStatCard}>
                    <Icon name="calendar-week" size={16} color="#10B981" />
                    <Text style={styles.revenueStatLabel}>Weekly</Text>
                    <Text style={styles.revenueStatValue}>₱{insights.weeklyMode.toLocaleString()}</Text>
                </View>
            </View>
            
            <View style={styles.revenueStatsGrid}>
                <View style={styles.revenueStatCard}>
                    <Icon name="chart-line" size={16} color="#3B82F6" />
                    <Text style={styles.revenueStatLabel}>Weekly Avg</Text>
                    <Text style={styles.revenueStatValue}>₱{insights.weeklyAverage.toLocaleString()}</Text>
                </View>
                
                <View style={styles.revenueStatCard}>
                    <Icon name="alert-octagon" size={16} color="#3B82F6" />
                    <Text style={styles.revenueStatLabel}>Reject Loss</Text>
                    <Text style={styles.revenueStatValue}>₱{insights.rejectLoss.toLocaleString()}</Text>
                </View>
                
                <View style={styles.revenueStatCard}>
                    <Icon name="calendar-check" size={16} color="#3B82F6" />
                    <Text style={styles.revenueStatLabel}>Active Days</Text>
                    <Text style={styles.revenueStatValue}>{insights.activeDays}</Text>
                </View>
            </View>
        </View>
    );
};

// --- ANIMATED COMPONENT: CROP HEALTH BAR GRAPH ---
const CropHealthBarGraph = ({ activeFilter, setActiveFilter, bellPepperData, allBellPepperData, onStatsUpdate }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const animatedHeights = useRef([]);
    const [isAnimating, setIsAnimating] = useState(false);

    const data = useMemo(() => {
        if (activeFilter === 'Today') {
            // Filter data for today only
            const todayData = allBellPepperData.filter(item => {
                const date = new Date(item.created_at);
                return isToday(date);
            });
            
            const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
            
            const result = hours.map(hour => {
                let valueInPesos = 0;
                
                if (hour === 16) {
                    // Special handling for 4:00 PM
                    valueInPesos = getDataForHour(todayData, 16);
                } else if (hour === 17) {
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
                        valueInPesos = total * 15;
                    }
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
                    label,
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
                    label: monthDay,
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
                    label: weekKey,
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
    }, [activeFilter, allBellPepperData]);

    const statsData = useMemo(() => {
        const todayValues = allBellPepperData
            .filter(item => isToday(new Date(item.created_at)))
            .map(item => {
                const total = (parseInt(item.unripe) || 0) + 
                             (parseInt(item['semi-ripe']) || 0) + 
                             (parseInt(item.ripe) || 0);
                return total * 15;
            })
            .filter(val => val > 0);
        const todayMode = calculateMode(todayValues);
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const pastMonthValues = allBellPepperData
            .filter(item => new Date(item.created_at) >= thirtyDaysAgo)
            .map(item => {
                const total = (parseInt(item.unripe) || 0) + 
                             (parseInt(item['semi-ripe']) || 0) + 
                             (parseInt(item.ripe) || 0);
                return total * 15;
            })
            .filter(val => val > 0);
        const pastMonthMode = calculateMode(pastMonthValues);
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const thisMonthValues = allBellPepperData
            .filter(item => new Date(item.created_at) >= startOfMonth)
            .map(item => {
                const total = (parseInt(item.unripe) || 0) + 
                             (parseInt(item['semi-ripe']) || 0) + 
                             (parseInt(item.ripe) || 0);
                return total * 15;
            })
            .filter(val => val > 0);
        const thisMonthMode = calculateMode(thisMonthValues);
        
        const allTimeValues = allBellPepperData
            .map(item => {
                const total = (parseInt(item.unripe) || 0) + 
                             (parseInt(item['semi-ripe']) || 0) + 
                             (parseInt(item.ripe) || 0);
                return total * 15;
            })
            .filter(val => val > 0);
        const allTimeMode = calculateMode(allTimeValues);
        
        return {
            today: todayMode,
            pastMonth: pastMonthMode,
            thisMonth: thisMonthMode,
            allTime: allTimeMode
        };
    }, [allBellPepperData]);

    useEffect(() => {
        if (onStatsUpdate) {
            onStatsUpdate(statsData);
        }
    }, [statsData, onStatsUpdate]);

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
            <View style={styles.barGraphContainer}>
                <View style={styles.barGraphHeader}>
                    <View>
                        <Text style={styles.graphTitleText}>Crop Health Revenue</Text>
                        <Text style={styles.graphSubText}>Revenue Analysis (₱)</Text>
                    </View>
                    <View>
                        <TouchableOpacity 
                            style={styles.dropdownMini} 
                            onPress={() => setShowDropdown(!showDropdown)}
                        >
                            <Text style={styles.dropdownText}>{activeFilter}</Text>
                            <Icon name="chevron-down" size={16} color="#64748B" />
                        </TouchableOpacity>
                        {showDropdown && (
                            <View style={styles.dropdownMenu}>
                                {FILTERS.map(f => (
                                    <TouchableOpacity 
                                        key={f} 
                                        style={styles.dropdownItem} 
                                        onPress={() => { setActiveFilter(f); setShowDropdown(false); }}
                                    >
                                        <Text style={[styles.dropdownItemText, activeFilter === f && {color: '#10B981'}]}>{f}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
                <View style={styles.noDataContainer}>
                    <Icon name="chart-line" size={48} color="#CBD5E1" />
                    <Text style={styles.noDataText}>No weekly data available</Text>
                    <Text style={styles.noDataSubtext}>No data found for any week</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.barGraphContainer}>
            <View style={styles.barGraphHeader}>
                <View>
                    <Text style={styles.graphTitleText}>Crop Health Revenue</Text>
                    <Text style={styles.graphSubText}>
                        {activeFilter === 'Today' ? currentDateString : 
                         activeFilter === 'Daily' ? 'Daily Mode Values (₱) - Last 7 Days With Data' : 
                         'Revenue Analysis (₱) - Weeks With Data'}
                    </Text>
                </View>
                
                <View>
                    <TouchableOpacity 
                        style={styles.dropdownMini} 
                        onPress={() => setShowDropdown(!showDropdown)}
                    >
                        <Text style={styles.dropdownText}>{activeFilter}</Text>
                        <Icon name="chevron-down" size={16} color="#64748B" />
                    </TouchableOpacity>

                    {showDropdown && (
                        <View style={styles.dropdownMenu}>
                            {FILTERS.map(f => (
                                <TouchableOpacity 
                                    key={f} 
                                    style={styles.dropdownItem} 
                                    onPress={() => { setActiveFilter(f); setShowDropdown(false); }}
                                >
                                    <Text style={[styles.dropdownItemText, activeFilter === f && {color: '#10B981'}]}>{f}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </View>

            <View style={styles.graphContent}>
                <View style={styles.yAxis}>
                    <Text style={styles.axisText}>₱{maxValue}</Text>
                    <Text style={styles.axisText}>₱{Math.round(maxValue * 0.75)}</Text>
                    <Text style={styles.axisText}>₱{Math.round(maxValue * 0.5)}</Text>
                    <Text style={styles.axisText}>₱{Math.round(maxValue * 0.25)}</Text>
                    <Text style={styles.axisText}>₱0</Text>
                </View>

                <View style={styles.barsContainer}>
                    <View style={styles.barsWrapper}>
                        {data.map((item, index) => (
                            <View key={index} style={styles.barColumn}>
                                <View style={styles.barWrapper}>
                                    <Animated.View 
                                        style={[
                                            styles.barPill, 
                                            getAnimatedBarHeight(animatedHeights.current[index]),
                                            { 
                                                backgroundColor: item.highlight ? '#22C55E' : '#2D2D2D',
                                            }
                                        ]} 
                                    />
                                </View>
                                {item.value > 0 && (
                                    <Text style={styles.barValue}>₱{item.value}</Text>
                                )}
                            </View>
                        ))}
                    </View>
                    <View style={styles.xAxis}>
                        {data.map((item, index) => (
                            <Text key={index} style={styles.xAxisText}>{item.label}</Text>
                        ))}
                    </View>
                </View>
            </View>
        </View>
    );
};

export default function PlantsDashboard() {
    const [activeTab, setActiveTab] = useState('Paquillo Pepper');
    const [cropFilter, setCropFilter] = useState('Weekly');
    const { width: windowWidth } = useWindowDimensions();
    
    const [containerWidth, setContainerWidth] = useState(windowWidth);
    const [isTransitioning, setIsTransitioning] = useState(false);
    
    const [bellPepperData, setBellPepperData] = useState([]);
    const [allBellPepperData, setAllBellPepperData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bellPepperStats, setBellPepperStats] = useState({
        total: 0,
        unripe: 0,
        semiRipe: 0,
        ripe: 0,
        reject: 0
    });
    
    const [hoverData, setHoverData] = useState(null);
    const [chartLayout, setChartLayout] = useState({ width: 500, height: 350 });
    const drawAnim = useRef(new Animated.Value(0)).current;
    
    const [sensorData, setSensorData] = useState({
        nitrogen: 0,
        phosphorus: 0,
        potassium: 0,
        soilHumidity: 0
    });

    const [cropHealthStats, setCropHealthStats] = useState({
        today: 0,
        pastMonth: 0,
        thisMonth: 0,
        allTime: 0
    });

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [availableDates, setAvailableDates] = useState([]);

    const animNitrogen = useRef(new Animated.Value(0)).current;
    const animPhosphorus = useRef(new Animated.Value(0)).current;
    const animPotassium = useRef(new Animated.Value(0)).current;
    const animHumidity = useRef(new Animated.Value(0)).current;

    const GRAPH_HEIGHT = 300;
    const TOP_PADDING = 20;
    const BOTTOM_PADDING = 40;
    const LEFT_MARGIN = 50;
    const RIGHT_MARGIN = 20;
    const TOTAL_HEIGHT = GRAPH_HEIGHT + TOP_PADDING + BOTTOM_PADDING;
    
    const START_HOUR = 7;
    const END_HOUR = 17;
    const TOTAL_HOURS_VISIBLE = END_HOUR - START_HOUR;

    const TIME_LABELS = [
        { label: "7AM", hr: 7 }, { label: "8AM", hr: 8 }, { label: "9AM", hr: 9 },
        { label: "10AM", hr: 10 }, { label: "11AM", hr: 11 }, { label: "12PM", hr: 12 },
        { label: "1PM", hr: 13 }, { label: "2PM", hr: 14 }, { label: "3PM", hr: 15 },
        { label: "4PM", hr: 16 }, { label: "5PM", hr: 17 },
    ];

    const LINE_COLORS = {
        unripe: '#10B981',
        semiRipe: '#67c409',
        ripe: '#FF5E5E',
        reject: '#b0c09c'
    };

    const runAnimation = (data) => {
        const config = (val) => ({
            toValue: val,
            duration: 1500,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
        });

        Animated.parallel([
            Animated.timing(animNitrogen, config(data.nitrogen)),
            Animated.timing(animPhosphorus, config(data.phosphorus)),
            Animated.timing(animPotassium, config(data.potassium)),
            Animated.timing(animHumidity, config(data.soilHumidity)),
        ]).start();
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

    const fetchBellPepperData = async () => {
        try {
            const response = await fetch(`${NGROK_URL}/api/getallbellpeppercount`, { 
                headers: { 'ngrok-skip-browser-warning': 'true' } 
            });
            const data = await response.json();
            const sortedData = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            setAllBellPepperData(sortedData);
            
            const datesWithData = new Set();
            sortedData.forEach(item => {
                const date = new Date(item.created_at);
                const dateStr = formatDateKey(date);
                datesWithData.add(dateStr);
            });
            setAvailableDates(Array.from(datesWithData));
            
            const filteredData = sortedData.filter(item => {
                const date = new Date(item.created_at);
                const hours = date.getHours();
                const minutes = date.getMinutes();
                const timeInMinutes = hours * 60 + minutes;
                
                const isSelectedDate = date.getDate() === selectedDate.getDate() &&
                                     date.getMonth() === selectedDate.getMonth() &&
                                     date.getFullYear() === selectedDate.getFullYear();
                
                return isSelectedDate && timeInMinutes >= 7 * 60 && timeInMinutes <= 17 * 60 + 30;
            });
            
            setBellPepperData(filteredData);
            
            if (filteredData.length > 0) {
                const latest = filteredData[0];
                const total = parseInt(latest.unripe) + parseInt(latest['semi-ripe']) + 
                             parseInt(latest.ripe) + parseInt(latest.reject);
                
                setBellPepperStats({
                    total: total,
                    unripe: parseInt(latest.unripe) || 0,
                    semiRipe: parseInt(latest['semi-ripe']) || 0,
                    ripe: parseInt(latest.ripe) || 0,
                    reject: parseInt(latest.reject) || 0
                });
            } else {
                setBellPepperStats({
                    total: 0,
                    unripe: 0,
                    semiRipe: 0,
                    ripe: 0,
                    reject: 0
                });
            }
            
            drawAnim.setValue(0);
            Animated.timing(drawAnim, { toValue: 1, duration: 800, useNativeDriver: false }).start();
        } catch (e) { 
            console.error("Paquillo Pepper Fetch Error:", e); 
        } finally {
            setLoading(false);
        }
    };

    const fetchSoilMetrics = async () => {
        try {
            const response = await fetch(`${NGROK_URL}/api/getallsoilhumidity`, { 
                headers: { 'ngrok-skip-browser-warning': 'true' } 
            });
            const data = await response.json();
            if (data?.length > 0) {
                const val = parseFloat(data[0].soilaverage) || 0;
                setSensorData(prev => {
                    const updated = { ...prev, soilHumidity: val };
                    runAnimation(updated);
                    return updated;
                });
            }
        } catch (e) { console.error("Soil Fetch Error:", e); }
    };

    const fetchNPKMetrics = async () => {
        try {
            const response = await fetch(`${NGROK_URL}/api/getallnpk`, { 
                headers: { 'ngrok-skip-browser-warning': 'true' } 
            });
            const data = await response.json();
            if (data?.length > 0) {
                const latest = data[0];
                const updatedNPK = {
                    nitrogen: parseFloat(latest.nitrogen) || 0,
                    phosphorus: parseFloat(latest.phosphorus) || 0,
                    potassium: parseFloat(latest.potassium) || 0,
                };
                setSensorData(prev => {
                    const updated = { ...prev, ...updatedNPK };
                    runAnimation(updated);
                    return updated;
                });
            }
        } catch (e) { console.error("NPK Fetch Error:", e); }
    };

    useEffect(() => {
        fetchBellPepperData();
        fetchSoilMetrics();
        fetchNPKMetrics();
    }, [selectedDate]);

    const handleDateSelect = (date) => {
        setSelectedDate(date);
        setLoading(true);
    };

    const NUTRIENT_DATA = [
        { label: 'NITROGEN', value: sensorData.nitrogen, anim: animNitrogen, color: '#22C55E', textcolor: '#2D2D2D' },
        { label: 'PHOSPHORUS', value: sensorData.phosphorus, anim: animPhosphorus, color: '#2D2D2D', textcolor: '#ffffff' },
        { label: 'POTASSIUM', value: sensorData.potassium, anim: animPotassium, color: '#22C55E', textcolor: '#2D2D2D' },
        { label: 'SOIL HUMIDITY', value: sensorData.soilHumidity, anim: animHumidity, color: '#2D2D2D', textcolor: '#ffffff' },
    ];

    const isDesktop = windowWidth > 768;

    const getCoordinateX = (hourVal, width) => {
        const usableWidth = width - (LEFT_MARGIN + RIGHT_MARGIN);
        const progress = (hourVal - START_HOUR) / TOTAL_HOURS_VISIBLE;
        return LEFT_MARGIN + (progress * usableWidth);
    };

    const getYPos = (val, maxVal) => {
        return TOP_PADDING + (GRAPH_HEIGHT - (parseFloat(val) / maxVal) * GRAPH_HEIGHT);
    };

    const handleHover = (evt) => {
        const width = chartLayout.width;
        const xPos = Platform.OS === 'web' ? evt.nativeEvent.offsetX : evt.nativeEvent.locationX;
        let closest = null;
        let minDiff = Infinity;

        bellPepperData.forEach(d => {
            const date = new Date(d.created_at);
            const h = date.getHours() + (date.getMinutes() / 60);
            const x = getCoordinateX(h, width);
            const diff = Math.abs(xPos - x);
            if (diff < minDiff && diff < 30) {
                minDiff = diff;
                closest = d;
            }
        });
        setHoverData(closest);
    };

    const createSmoothPathData = (points) => {
        if (points.length === 0) return "";
        if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
        if (points.length === 2) {
            return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
        }

        let path = `M ${points[0].x} ${points[0].y}`;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i === 0 ? i : i - 1];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2] || p2;
            
            const tension = 0.3;
            
            const cp1x = p1.x + (p2.x - p0.x) * tension;
            const cp1y = p1.y + (p2.y - p0.y) * tension;
            const cp2x = p2.x - (p3.x - p1.x) * tension;
            const cp2y = p2.y - (p3.y - p1.y) * tension;
            
            path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }
        
        return path;
    };

    const getSelectedDateString = () => {
        return selectedDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    const renderBellPepperChart = () => {
        const maxVal = 15;
        const yLabels = [0, 3, 6, 9, 12, 15];
        
        const createPathData = (key) => {
            if (bellPepperData.length === 0) return "";
            const points = bellPepperData.map(d => {
                const date = new Date(d.created_at);
                const h = date.getHours() + (date.getMinutes() / 60);
                return { 
                    x: getCoordinateX(h, chartLayout.width), 
                    y: getYPos(parseInt(d[key]) || 0, maxVal) 
                };
            });
            
            return createSmoothPathData(points);
        };

        return (
            <View style={styles.svgChartCard}>
                <View style={styles.svgChartHeader}>
                    <Text style={styles.svgChartTitle}>Paquillo Pepper Count</Text>
                    {hoverData && (
                        <View style={styles.hoverPreview}>
                            <Text style={styles.hoverPreviewTime}>
                                {formatTimeForDisplay(hoverData.created_at)}
                            </Text>
                            <View style={styles.hoverPreviewValues}>
                                <Text style={[styles.hoverPreviewValue, {color: LINE_COLORS.unripe}]}> U:{hoverData.unripe}</Text>
                                <Text style={[styles.hoverPreviewValue, {color: LINE_COLORS.semiRipe}]}> M:{hoverData['semi-ripe']}</Text>
                                <Text style={[styles.hoverPreviewValue, {color: LINE_COLORS.ripe}]}> R:{hoverData.ripe}</Text>
                                <Text style={[styles.hoverPreviewValue, {color: LINE_COLORS.reject}]}> REJ:{hoverData.reject}</Text>
                            </View>
                        </View>
                    )}
                </View>

                <View 
                    style={styles.svgChartArea}
                    onLayout={(e) => setChartLayout(e.nativeEvent.layout)}
                >
                    {bellPepperData.length === 0 ? (
                        <View style={styles.noDataContainer}>
                            <Icon name="calendar-blank" size={48} color="#CBD5E1" />
                            <Text style={styles.noDataText}>No data available for this date</Text>
                            <Text style={styles.noDataSubtext}>Try selecting a different date</Text>
                        </View>
                    ) : (
                        <Svg height={TOTAL_HEIGHT} width="100%">
                            {yLabels.map(val => (
                                <G key={val}>
                                    <Line 
                                        x1={LEFT_MARGIN} 
                                        y1={getYPos(val, maxVal)} 
                                        x2={chartLayout.width - RIGHT_MARGIN} 
                                        y2={getYPos(val, maxVal)} 
                                        stroke="#F1F5F9" 
                                        strokeWidth="1" 
                                        strokeDasharray="4 4"
                                    />
                                    <SvgText 
                                        x={LEFT_MARGIN - 10} 
                                        y={getYPos(val, maxVal) + 4} 
                                        fontSize="11" 
                                        fill="#94A3B8" 
                                        textAnchor="end" 
                                        fontWeight="600"
                                    >
                                        {val}
                                    </SvgText>
                                </G>
                            ))}

                            {Object.entries(LINE_COLORS).map(([key, color]) => {
                                const pathData = createPathData(key);
                                return pathData ? (
                                    <G key={key}>
                                        <AnimatedPath 
                                            d={pathData} 
                                            fill="none" 
                                            stroke={color} 
                                            strokeWidth="2.5" 
                                            strokeLinejoin="round"
                                            strokeLinecap="round"
                                        />
                                    </G>
                                ) : null;
                            })}

                            {bellPepperData.map((item, index) => {
                                const date = new Date(item.created_at);
                                const h = date.getHours() + (date.getMinutes() / 60);
                                const x = getCoordinateX(h, chartLayout.width);
                                
                                return (
                                    <G key={index}>
                                        <Circle 
                                            cx={x} 
                                            cy={getYPos(parseInt(item.unripe) || 0, maxVal)} 
                                            r="4" 
                                            fill={LINE_COLORS.unripe} 
                                            stroke="#FFF" 
                                            strokeWidth="2" 
                                        />
                                        <Circle 
                                            cx={x} 
                                            cy={getYPos(parseInt(item['semi-ripe']) || 0, maxVal)} 
                                            r="4" 
                                            fill={LINE_COLORS.semiRipe} 
                                            stroke="#FFF" 
                                            strokeWidth="2" 
                                        />
                                        <Circle 
                                            cx={x} 
                                            cy={getYPos(parseInt(item.ripe) || 0, maxVal)} 
                                            r="4" 
                                            fill={LINE_COLORS.ripe} 
                                            stroke="#FFF" 
                                            strokeWidth="2" 
                                        />
                                        <Circle 
                                            cx={x} 
                                            cy={getYPos(parseInt(item.reject) || 0, maxVal)} 
                                            r="4" 
                                            fill={LINE_COLORS.reject} 
                                            stroke="#FFF" 
                                            strokeWidth="2" 
                                        />
                                    </G>
                                );
                            })}

                            {hoverData && (() => {
                                const date = new Date(hoverData.created_at);
                                const h = date.getHours() + (date.getMinutes() / 60);
                                const x = getCoordinateX(h, chartLayout.width);
                                
                                return (
                                    <G>
                                        <Line 
                                            x1={x} 
                                            y1={TOP_PADDING} 
                                            x2={x} 
                                            y2={GRAPH_HEIGHT + TOP_PADDING} 
                                            stroke="#64748B" 
                                            strokeWidth="1" 
                                            strokeDasharray="4 3" 
                                        />
                                        
                                        <Rect 
                                            x={Math.max(LEFT_MARGIN, Math.min(x - 75, chartLayout.width - 170))}
                                            y={TOP_PADDING - 10}
                                            width="150"
                                            height="95"
                                            rx="8"
                                            fill="#1E293B"
                                            opacity="0.95"
                                        />
                                        
                                        <SvgText 
                                            x={Math.max(LEFT_MARGIN + 75, Math.min(x, chartLayout.width - 95))}
                                            y={TOP_PADDING + 8} 
                                            fill="#FFF" 
                                            fontSize="11" 
                                            fontWeight="800" 
                                            textAnchor="middle"
                                        >
                                            {formatTimeForDisplay(hoverData.created_at)}
                                        </SvgText>
                                        
                                        <SvgText x={Math.max(LEFT_MARGIN + 15, Math.min(x - 60, chartLayout.width - 155))} y={TOP_PADDING + 28} fill="#94A3B8" fontSize="10" textAnchor="start">Unripe:</SvgText>
                                        <SvgText x={Math.max(LEFT_MARGIN + 135, Math.min(x + 60, chartLayout.width - 35))} y={TOP_PADDING + 28} fill={LINE_COLORS.unripe} fontSize="10" fontWeight="800" textAnchor="end">{hoverData.unripe}</SvgText>
                                        
                                        <SvgText x={Math.max(LEFT_MARGIN + 15, Math.min(x - 60, chartLayout.width - 155))} y={TOP_PADDING + 44} fill="#94A3B8" fontSize="10" textAnchor="start">Mid-Ripe:</SvgText>
                                        <SvgText x={Math.max(LEFT_MARGIN + 135, Math.min(x + 60, chartLayout.width - 35))} y={TOP_PADDING + 44} fill={LINE_COLORS.semiRipe} fontSize="10" fontWeight="800" textAnchor="end">{hoverData['semi-ripe']}</SvgText>
                                        
                                        <SvgText x={Math.max(LEFT_MARGIN + 15, Math.min(x - 60, chartLayout.width - 155))} y={TOP_PADDING + 60} fill="#94A3B8" fontSize="10" textAnchor="start">Ripe:</SvgText>
                                        <SvgText x={Math.max(LEFT_MARGIN + 135, Math.min(x + 60, chartLayout.width - 35))} y={TOP_PADDING + 60} fill={LINE_COLORS.ripe} fontSize="10" fontWeight="800" textAnchor="end">{hoverData.ripe}</SvgText>
                                        
                                        <SvgText x={Math.max(LEFT_MARGIN + 15, Math.min(x - 60, chartLayout.width - 155))} y={TOP_PADDING + 76} fill="#94A3B8" fontSize="10" textAnchor="start">Reject:</SvgText>
                                        <SvgText x={Math.max(LEFT_MARGIN + 135, Math.min(x + 60, chartLayout.width - 35))} y={TOP_PADDING + 76} fill={LINE_COLORS.reject} fontSize="10" fontWeight="800" textAnchor="end">{hoverData.reject}</SvgText>
                                    </G>
                                );
                            })()}
                        </Svg>
                    )}

                    {bellPepperData.length > 0 && (
                        <>
                            <View 
                                style={StyleSheet.absoluteFill}
                                onPointerMove={(e) => handleHover(e)}
                                onPointerLeave={() => setHoverData(null)}
                                onStartShouldSetResponder={() => true}
                                onResponderMove={(e) => handleHover(e)}
                                onResponderRelease={() => setHoverData(null)}
                            />

                            <View style={styles.svgXAxis}>
                                {TIME_LABELS.map((t) => (
                                    <Text key={t.label} style={[styles.svgAxisLabel, { 
                                        position: 'absolute', 
                                        left: getCoordinateX(t.hr, chartLayout.width) - 20,
                                        textAlign: 'center', 
                                        width: 40
                                    }]}>{t.label}</Text>
                                ))}
                            </View>
                        </>
                    )}
                </View>

                {bellPepperData.length > 0 && (
                    <View style={styles.svgLegend}>
                        {Object.entries(LINE_COLORS).map(([key, color]) => (
                            <View key={key} style={styles.svgLegendItem}>
                                <View style={[styles.svgLegendDot, { backgroundColor: color }]} />
                                <Text style={styles.svgLegendText}>
                                    {key === 'unripe' ? 'Unripe' : 
                                     key === 'semiRipe' ? 'Mid-Ripe' : 
                                     key === 'ripe' ? 'Ripe' : 'Reject'}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        );
    };

    const handleLayout = (event) => {
        const newWidth = event.nativeEvent.layout.width;
        if (Math.abs(newWidth - containerWidth) > 10) {
            setIsTransitioning(true);
            InteractionManager.runAfterInteractions(() => {
                setContainerWidth(newWidth);
                setIsTransitioning(false);
            });
        }
    };

    const TabBar = () => (
        <View style={styles.tabContainer}>
            <Text style={styles.mainTitle}>Plants</Text>
            <View style={styles.tabWrapper}>
                {TABS.map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        onPress={() => setActiveTab(tab)}
                        style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}>
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderBellPepper = () => (
        <View style={[styles.contentRow, { flexDirection: isDesktop ? 'row' : 'column' }]}>
            <View style={isDesktop ? { flex: 2 } : { width: '100%' }}>
                <View style={styles.sectionHeader}>
                    <View style={styles.titleRow}>
                        <Text style={styles.sectionTitle}>Paquillo Pepper Monitoring</Text>
                        <TouchableOpacity 
                            style={styles.datePickerButton}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Icon name="calendar" size={20} color="#10B981" />
                            <Text style={styles.datePickerButtonText}>
                                {selectedDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                            </Text>
                            <Icon name="chevron-down" size={16} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.dateSubtitle}>{getSelectedDateString()} (7AM - 5PM)</Text>
                </View>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#10B981" />
                    </View>
                ) : (
                    renderBellPepperChart()
                )}
            </View>

            <View style={[isDesktop ? { flex: 1, marginLeft: 20 } : { marginTop: 20 }]}>
                <View style={styles.statusCardLarge}>
                    <View style={styles.statusHeader}>
                        <Text style={styles.statusLabel}>Healthy</Text>
                        <Text style={styles.statusTrend}>+3%</Text>
                    </View>
                    <Text style={styles.statusValue}>{bellPepperStats.total} Paquillo Pepper</Text>
                    <Text style={styles.statusSub}>Total Count {isToday(selectedDate) ? 'Today' : 'Selected Date'}</Text>
                </View>
                <View style={styles.miniStatsRow}>
                    <View style={styles.miniStat}>
                        <Text style={[styles.miniStatVal, {color: '#10B981'}]}>{bellPepperStats.unripe}</Text>
                        <Text style={styles.miniStatLabel}>Unripe</Text>
                    </View>
                    <View style={[styles.miniStat, {borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#EEE', paddingHorizontal: 15}]}>
                        <Text style={[styles.miniStatVal, {color: '#67c409'}]}>{bellPepperStats.semiRipe}</Text>
                        <Text style={styles.miniStatLabel}>Mid-Ripe</Text>
                    </View>
                    <View style={styles.miniStat}>
                        <Text style={[styles.miniStatVal, {color: '#FF5E5E'}]}>{bellPepperStats.ripe}</Text>
                        <Text style={styles.miniStatLabel}>Ripe</Text>
                    </View>
                    <View style={styles.miniStat}>
                        <Text style={[styles.miniStatVal, {color: '#b0c09c'}]}>{bellPepperStats.reject}</Text>
                        <Text style={styles.miniStatLabel}>Reject</Text>
                    </View>
                       
                </View>
                <Text style={styles.logTitle}>Paquillo Pepper Logs <Text style={styles.sortText}>Sort by Newest <Icon name="chevron-down" size={12} /></Text></Text>
                {bellPepperData.slice(0, 3).map((log, index) => (
                    <View key={log.id} style={styles.logItem}>
                        <View>
                            <Text style={styles.logText}>
                                Count Update: {log.unripe}U - {log['semi-ripe']}M - {log.ripe}R - {log.reject}REJ
                            </Text>
                            <Text style={styles.logTime}>
                                {formatTimeForDisplay(log.created_at)}
                            </Text>
                        </View>
                        <Icon name="dots-vertical" size={20} color="#CCC" />
                    </View>
                ))}
            </View>
            
            <CustomDatePicker 
                visible={showDatePicker}
                onClose={() => setShowDatePicker(false)}
                onSelectDate={handleDateSelect}
                currentDate={selectedDate}
                availableDates={availableDates}
            />
        </View>
    );

    const renderCropHealth = () => (
        <View>
            <CropHealthBarGraph 
                activeFilter={cropFilter} 
                setActiveFilter={setCropFilter} 
                bellPepperData={bellPepperData}
                allBellPepperData={allBellPepperData}
                onStatsUpdate={setCropHealthStats}
            />
            <RevenueInsights allBellPepperData={allBellPepperData} />
        </View>
    );

    const renderNutrients = () => (
        <View style={styles.colorindications}>
            <Text style={styles.sectionTitle}>Nutrients</Text>
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

            <Text style={styles.tableTitle}>Nitrogen, Phosphorus, Potassium, Soil Humidity Suggestions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeadCell, { width: 150 }]}>Note</Text>
                        <Text style={styles.tableHeadCell}>Nitrogen (N)</Text>
                        <Text style={styles.tableHeadCell}>Phosphorus (P)</Text>
                        <Text style={styles.tableHeadCell}>Potassium (K)</Text>
                    </View>
                    {['Low N - apply dose', 'Balanced profile', 'Slight P deficiency'].map((note, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { width: 150 }]}>{note}</Text>
                            <Text style={styles.tableCell}>75 kg/</Text>
                            <Text style={styles.tableCell}>45 kg/</Text>
                            <Text style={styles.tableCell}>35 kg/</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={{ flex: 1 }} onLayout={handleLayout}>
                <TabBar />
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                >
                    {activeTab === 'Paquillo Pepper' && renderBellPepper()}
                    {activeTab === 'Crop Health' && renderCropHealth()}
                    {activeTab === 'Nutrients' && renderNutrients()}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    scrollContent: { padding: 20 },
    loadingContainer: { height: 400, justifyContent: 'center', alignItems: 'center' },
    tabContainer: { 
        paddingHorizontal: 20, 
        paddingTop: 20, 
        backgroundColor: '#F1F5F9',
        borderBottomWidth: 1, 
        borderBottomColor: '#E2E8F0' 
    },
    mainTitle: { fontSize: 32, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
    tabWrapper: { flexDirection: 'row' },
    tabItem: { paddingBottom: 12, marginRight: 30 },
    activeTabItem: { borderBottomWidth: 3, borderBottomColor: '#10B981' }, 
    tabText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
    activeTabText: { color: '#0F172A' },
    sectionHeader: { marginBottom: 20 },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { fontSize: 22, fontWeight: '700', color: '#1E293B' },
    dateSubtitle: { fontSize: 14, color: '#64748B', marginTop: 4 },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 8,
    },
    datePickerButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
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
    noDataContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noDataText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 12,
    },
    noDataSubtext: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 4,
    },
    svgChartCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    svgChartHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    svgChartTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B' },
    hoverPreview: {
        alignItems: 'flex-end',
    },
    hoverPreviewTime: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    hoverPreviewValues: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 2,
    },
    hoverPreviewValue: {
        fontSize: 11,
        fontWeight: '700',
    },
    svgChartArea: {
        position: 'relative',
        height: 370,
    },
    svgXAxis: {
        height: 20,
        width: '100%',
        marginTop: 5,
    },
    svgAxisLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
    },
    svgLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        gap: 16,
    },
    svgLegendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    svgLegendDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 6,
    },
    svgLegendText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    barGraphContainer: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        minHeight: 280,
        elevation: 1,
    },
    barGraphHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        zIndex: 50,
    },
    graphTitleText: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
    graphSubText: { fontSize: 12, color: '#94A3B8' },
    graphContent: { flexDirection: 'row', height: 200 },
    yAxis: { 
        width: 50, 
        justifyContent: 'space-between', 
        paddingBottom: 25, 
        alignItems: 'flex-end', 
        paddingRight: 10 
    },
    axisText: { fontSize: 10, color: '#94A3B8', fontWeight: 'bold' },
    barsContainer: { flex: 1, flexDirection: 'column' },
    barsWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        borderLeftWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#F1F5F9',
        minHeight: 140,
    },
    barColumn: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'flex-end',
        height: '100%',
    },
    barWrapper: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flex: 1,
        minHeight: 100,
    },
    barPill: {
        width: 13,
        borderRadius: 50,
        minHeight: 5,
        alignSelf: 'center',
    },
    barValue: {
        fontSize: 8,
        color: '#64748B',
        marginTop: 4,
        fontWeight: '600',
        textAlign: 'center',
    },
    xAxis: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
    xAxisText: { fontSize: 9, color: '#94A3B8', textAlign: 'center', width: 40 },
    dropdownMini: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    dropdownText: { fontSize: 12, color: '#64748B', marginRight: 4, fontWeight: 'bold' },
    dropdownMenu: {
        position: 'absolute',
        top: 40,
        right: 0,
        backgroundColor: '#FFF',
        borderRadius: 8,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        width: 100,
    },
    dropdownItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    dropdownItemText: { fontSize: 12, color: '#1E293B' },
    contentRow: { width: '100%' },
    statusCardLarge: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, elevation: 1 },
    statusHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    statusLabel: { fontSize: 16, color: '#64748B', fontWeight: '600' },
    statusTrend: { color: '#10B981', fontWeight: 'bold' },
    statusValue: { fontSize: 24, fontWeight: '800', marginVertical: 8 },
    statusSub: { color: '#94A3B8', fontSize: 12 },
    miniStatsRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-around', 
        paddingVertical: 15,
        backgroundColor: '#FFF',
        borderRadius: 16,
        marginTop: 15 
    },
    miniStat: { alignItems: 'center', flex: 1 },
    miniStatVal: { fontSize: 20, fontWeight: 'bold' },
    miniStatLabel: { fontSize: 11, color: '#94A3B8' },
    logTitle: { fontSize: 18, fontWeight: '700', marginTop: 20, marginBottom: 12, color: '#1E293B' },
    sortText: { fontSize: 12, color: '#94A3B8', fontWeight: 'normal' },
    logItem: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logText: { fontWeight: '600', color: '#1E293B' },
    logTime: { fontSize: 11, color: '#94A3B8' },
    healthStatsSingleRow: { flexDirection: 'row', marginTop: 10, marginBottom: 10, width: '100%' },
    healthCard: { 
        flex: 1, 
        backgroundColor: '#FFF', 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        borderRadius: 12, 
        paddingVertical: 15, 
        marginHorizontal: 4, 
        alignItems: 'center',
    },
    healthVal: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    healthLabel: { fontSize: 10, color: '#64748B', textAlign: 'center', marginTop: 4 },
    nutrientsContainer: { marginVertical: 10 },
    nutrientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    nutrientBar: { height: 40, borderRadius: 8, justifyContent: 'center', paddingLeft: 15, overflow: 'hidden' },
    nutrientBarLabel: { fontWeight: 'bold', fontSize: 12 },
    nutrientPercent: { marginLeft: 10, fontWeight: 'bold', color: '#64748B' },
    tableTitle: { fontSize: 16, fontWeight: '700', marginVertical: 20, color: '#1E293B' },
    table: { width: 600 },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 10 },
    tableHeadCell: { flex: 1, color: '#94A3B8', fontWeight: 'bold', fontSize: 12 },
    tableRow: { flexDirection: 'row', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    tableCell: { flex: 1, color: '#1E293B', fontSize: 12 },
    
    // Revenue Insights Styles (Modified)
    revenueInsightsContainer: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 16,
        marginTop: 10,
        marginBottom: 20,
        elevation: 1,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    revenueInsightsTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 16,
    },
    revenueStatsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    revenueStatCard: {
        flex: 1,
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        gap: 6,
    },
    revenueStatLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
    },
    revenueStatValue: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1E293B',
    },
});