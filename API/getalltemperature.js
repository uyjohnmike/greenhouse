// API/getallmetrics.js
import express from 'express';
import { supabase } from '../supabase.js';

const router = express.Router();

// GET all temperature and air humidity records
router.get('/getalltemperature', async (req, res) => {
    try {
        console.log("--- New Request Received: Metrics ---");
        console.log("Connecting to Supabase Table: 'airhumidity_temperature'");

        // 1. Perform the query
        // We order by 'created_at' descending so the most recent data comes first
        const { data, error, status, statusText } = await supabase
            .from('airhumidity_temperature') 
            .select('*')
            .order('created_at', { ascending: false });

        // 2. Debug Log: See what's happening in your terminal
        console.log("Supabase Status:", status, statusText);
        
        if (error) {
            console.error("❌ Supabase Error:", error.message);
            return res.status(status).json({ 
                error: error.message,
                details: error.details 
            });
        }

        // 3. Log the data count
        console.log(`✅ Success! Found ${data ? data.length : 0} metric records.`);

        // 4. Return data to Postman / Frontend
        res.status(200).json(data);

    } catch (err) {
        console.error("❌ Server Crash:", err.message);
        res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
});

export default router;