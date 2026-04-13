import os
import time
import board
import busio
import requests
import adafruit_dht
import adafruit_ads1x15.ads1115 as ADS
from adafruit_ads1x15.analog_in import AnalogIn
from gpiozero import DistanceSensor
from dotenv import load_dotenv
from supabase import create_client
import RPi.GPIO as GPIO 
from rpi_lcd import LCD 

# 1. SETUP & CREDENTIALS
load_dotenv()
try:
    supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))
except Exception as e:
    print(f"⚠️ Supabase Init Warning: {e}")
    supabase = None

# --- CONFIGURATION ---
CAMERA_URL = "http://localhost:5001/counts"
DRUM_HEIGHT_CM = 90    
MIN_DISTANCE_CM = 15   
DRY_SOIL_VAL, WET_SOIL_VAL = 12000, 500
WATER_PUMP_2_PIN = 36  
WATER_PUMP_1_PIN = 37     
WATER_THRESHOLD = 40.0   
TEMP_THRESHOLD = 35.0
DB_SYNC_INTERVAL = 300 
WEEK_IN_SECONDS = 604800 
TIMER_FILE = "pumpremainingtime.txt"
TEMP_CALIBRATION = 8.0  # Temperature subtraction value

# --- TRACKING ---
last_db_sync = 0 
is_device_active = False 

# --- GPIO SETUP ---
GPIO.setmode(GPIO.BOARD)
GPIO.setup(WATER_PUMP_2_PIN, GPIO.IN)
GPIO.setup(WATER_PUMP_1_PIN, GPIO.IN)

# --- LCD INITIALIZATION ---
try:
    lcd = LCD(address=0x27, bus=1) 
except:
    lcd = None
    print("⚠️ LCD not detected")

# 2. INITIALIZE SENSORS
water_sensor = DistanceSensor(echo=25, trigger=24, max_distance=2, queue_len=10)
air_sensors = [adafruit_dht.DHT11(p, use_pulseio=False) for p in [board.D17, board.D27, board.D22, board.D23]]
i2c = None
ads = None
soil_channels = []

def init_soil_sensors():
    global i2c, ads, soil_channels
    try:
        i2c = busio.I2C(board.SCL, board.SDA)
        ads = ADS.ADS1115(i2c)
        soil_channels = [AnalogIn(ads, 0), AnalogIn(ads, 1), AnalogIn(ads, 2), AnalogIn(ads, 3)]
        return True
    except: return False

init_soil_sensors()

# --- LOGGING HELPER ---
def log_to_db(sensor_name, description):
    if supabase:
        try:
            supabase.table("sensor_logs").insert({
                "sensor_name": sensor_name,
                "description": description
            }).execute()
        except Exception as e:
            print(f"Log Error: {e}")

# --- PERSISTENT TIMER LOGIC ---
def get_remaining_seconds():
    if not os.path.exists(TIMER_FILE): return 0
    with open(TIMER_FILE, "r") as f:
        content = f.read().strip()
        return float(content) if content else 0

def update_timer(seconds_to_subtract):
    current = get_remaining_seconds()
    new_time = max(0, current - seconds_to_subtract)
    with open(TIMER_FILE, "w") as f:
        f.write(str(round(new_time, 2)))
    return new_time

def reset_timer_to_one_week():
    with open(TIMER_FILE, "w") as f:
        f.write(str(WEEK_IN_SECONDS))

# --- PER-SENSOR WAITING FUNCTIONS ---
def wait_for_air_data():
    print("\n--- Checking Air Sensors (T1-T4 & A1-A4)... ---")
    v_t, v_h = [None]*4, [None]*4
    while None in v_t or None in v_h:
        for i, s in enumerate(air_sensors):
            if v_t[i] is None or v_h[i] is None:
                try:
                    t, h = s.temperature, s.humidity
                    if t is not None and h is not None:
                        # Apply -8 degree calibration directly to sensor reading
                        v_t[i], v_h[i] = (t - TEMP_CALIBRATION), h
                        print(f"Sensor {i+1} OK... T:{v_t[i]:.1f}°C (Calibrated) H:{h}%")
                except: pass
        if None in v_t or None in v_h: time.sleep(1.5)
    return v_t, v_h

def wait_for_soil_data():
    print("--- Checking Soil Sensors (S1-S4)... ---")
    v_s = [None]*4
    while None in v_s:
        for i, ch in enumerate(soil_channels):
            if v_s[i] is None:
                try:
                    val = ch.value
                    if val > 0:
                        pct = round(max(0, min(100, ((DRY_SOIL_VAL - val) / (DRY_SOIL_VAL - WET_SOIL_VAL)) * 100)), 2)
                        v_s[i] = pct
                        print(f"Soil {i+1} OK... {pct}%")
                except: pass
        if None in v_s: time.sleep(1)
    return v_s

# --- DEVICE CONTROL ---
def water_pump_2_on(duration, reason):
    global is_device_active
    is_device_active = True
    print(f"🚰 WATER PUMP 2: ON ({reason})")
    log_to_db("Water Pump 2", f"ON for {duration}s. Reason: {reason}")
    GPIO.setup(WATER_PUMP_2_PIN, GPIO.OUT)
    GPIO.output(WATER_PUMP_2_PIN, GPIO.LOW)
    time.sleep(duration)
    GPIO.setup(WATER_PUMP_2_PIN, GPIO.IN)
    is_device_active = False

def water_pump_1_on(duration):
    global is_device_active
    is_device_active = True
    print("🚰 WATER PUMP 1: ON (Insect Detected)")
    log_to_db("Water Pump 1", f"ON for {duration}s. Reason: Insect Detected")
    GPIO.setup(WATER_PUMP_1_PIN, GPIO.OUT)
    GPIO.output(WATER_PUMP_1_PIN, GPIO.LOW)
    time.sleep(duration)
    GPIO.setup(WATER_PUMP_1_PIN, GPIO.IN)
    reset_timer_to_one_week()
    is_device_active = False

def sync_database(s_avg, s_pcts, t_avg, t_vals, h_avg, h_vals, w_pct):
    if not supabase: return None
    try:
        response = requests.get(CAMERA_URL, timeout=3)
        if response.status_code == 200:
            data = response.json()
            
            # Core Table Syncs
            supabase.table("airhumidity_temperature").insert({
                "t1": t_vals[0], "t2": t_vals[1], "t3": t_vals[2], "t4": t_vals[3],
                "temperature": t_avg, "a1": h_vals[0], "a2": h_vals[1], 
                "a3": h_vals[2], "a4": h_vals[3], "airhumidity": h_avg
            }).execute()
            supabase.table("soilhumiditydata").insert({
                "s1": s_pcts[0], "s2": s_pcts[1], "s3": s_pcts[2], "s4": s_pcts[3], "soilaverage": s_avg
            }).execute()
            p = data["peppers"]
            supabase.table("bellppercount").insert({"unripe": p["unripe"], "semi-ripe": p["semi-ripe"], "ripe": p["ripe"], "reject": p["reject"]}).execute()
            supabase.table("water_level").insert({"level": w_pct}).execute()
            
            npk = data.get("npk", {"nitrogen": 0, "phosphorus": 0, "potassium": 0})
            supabase.table("npksensor").insert(npk).execute()

            # --- SENSOR LOGS (CONDITIONAL) ---
            if t_avg >= TEMP_THRESHOLD:
                log_to_db("Temperature Sensor", f"High Temperature Detected: {t_avg:.1f}°C")
            
            if w_pct <= 30.0:
                log_to_db("Water Level", f"Already 30% Down: Current level {w_pct}%")

            if npk["nitrogen"] <= 30 or npk["phosphorus"] <= 30 or npk["potassium"] <= 30:
                log_to_db("NPK Sensor", f"NPK 30% Down: N:{npk['nitrogen']} P:{npk['phosphorus']} K:{npk['potassium']}")

            return data
    except Exception as e:
        print(f"Sync Error: {e}")
        return None

# 4. MAIN LOOP
print("\n🌿 GREENHOUSE MONITORING SYSTEM ONLINE")

try:
    last_loop_time = time.time()
    while True:
        # 1. Update Timer
        current_time = time.time()
        elapsed = current_time - last_loop_time
        seconds_left = update_timer(elapsed)
        last_loop_time = current_time

        # 2. Wait for Per-Sensor Data
        t_vals, h_vals = wait_for_air_data()
        s_pcts = wait_for_soil_data()
        
        t_avg = sum(t_vals)/4
        h_avg = sum(h_vals)/4
        s_avg = sum(s_pcts)/4

        # --- LCD UPDATE ---
        if lcd:
            lcd.text(f"Temp: {t_avg:.1f}C", 1)
            lcd.text(f"Soil Hum: {s_avg:.1f}%", 2)
        
        try:
            raw_dist = round(water_sensor.distance * 100, 2)
            w_pct = round(max(0, min(100, ((DRUM_HEIGHT_CM - raw_dist) / (DRUM_HEIGHT_CM - MIN_DISTANCE_CM)) * 100)), 2)
        except: w_pct = 0.0

        # 3. Summary Display
        print("\n✅ ALL SENSORS CAPTURED:")
        print(f"Avg Temp: {t_avg:.1f}°C | Avg Soil: {s_avg:.1f}% | Water: {w_pct}%")
        
        # 4. Database Sync & NPK Data Display
        ai_data = None
        if current_time - last_db_sync >= DB_SYNC_INTERVAL:
            ai_data = sync_database(s_avg, s_pcts, t_avg, t_vals, h_avg, h_vals, w_pct)
            if ai_data: print("✅ Database Synced Successfully.")
            last_db_sync = current_time
        else:
            try: ai_data = requests.get(CAMERA_URL, timeout=1).json()
            except: pass

        # --- SHOW NPK DATA IN CONSOLE ---
        if ai_data and "npk" in ai_data:
            n, p, k = ai_data["npk"]["nitrogen"], ai_data["npk"]["phosphorus"], ai_data["npk"]["potassium"]
            print(f"📊 NPK LEVELS: N:{n} | P:{p} | K:{k}")

        # 5. Control Logic
        insect_detected = any(count > 0 for count in ai_data.get("insects", {}).values()) if ai_data else False
        
        if not is_device_active:
            # Water Pump 1 Trigger (Insect + Timer)
            if insect_detected and seconds_left <= 0:
                water_pump_1_on(60)
            
            # Water Pump 2 Trigger (High Temp)
            elif t_avg >= TEMP_THRESHOLD:
                water_pump_2_on(30, f"High Temp ({t_avg:.1f}°C)")
            
            # Water Pump 2 Trigger (Low Soil)
            elif s_avg <= WATER_THRESHOLD and w_pct >= 5.0:
                water_pump_2_on(20, f"Low Soil Moisture ({s_avg:.1f}%)")

        print(f"\nCooldown: {int(seconds_left)}s remaining. Sleeping 10s...")
        time.sleep(10)
        
except KeyboardInterrupt:
    print("\nShutting down.")
finally:
    if lcd: lcd.clear()
    GPIO.cleanup()