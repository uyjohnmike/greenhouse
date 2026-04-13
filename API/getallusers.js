// API/getallusers.js
import express from 'express';
import { supabase } from '../supabase.js';

const router = express.Router();

// GET all users
router.get('/getallusers', async (req, res) => {
    try {
        console.log("--- New Request Received ---");
        console.log("Connecting to Supabase Table: 'users'");

        // 1. Perform the query
        const { data, error, status, statusText } = await supabase
            .from('users') 
            .select('*');

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
        console.log(`✅ Success! Found ${data ? data.length : 0} rows.`);

        // 4. Return data to Postman
        res.status(200).json(data);

    } catch (err) {
        console.error("❌ Server Crash:", err.message);
        res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
});

export default router;