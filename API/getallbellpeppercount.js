// API/getallbellpeppercount.js
import express from 'express';
import { supabase } from '../supabase.js';

const router = express.Router();

// GET all bell pepper count records
router.get('/getallbellpeppercount', async (req, res) => {
    try {
        console.log("--- New Request Received: Bell Pepper Count ---");
        console.log("Connecting to Supabase Table: 'bellppercount'");

        // 1. Perform the query
        const { data, error, status, statusText } = await supabase
            .from('bellppercount') 
            .select('*')
            .order('created_at', { ascending: false });

        // 2. Debug Log
        console.log("Supabase Status:", status, statusText);
        
        if (error) {
            console.error("❌ Supabase Error:", error.message);
            return res.status(status).json({ 
                error: error.message,
                details: error.details 
            });
        }

        // 3. Log the data count
        console.log(`✅ Success! Found ${data ? data.length : 0} bell pepper records.`);

        // 4. Return data
        res.status(200).json(data);

    } catch (err) {
        console.error("❌ Server Crash:", err.message);
        res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
});

export default router;