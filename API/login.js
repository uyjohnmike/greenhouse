import express from 'express';
import { supabase } from '../supabase.js';

const router = express.Router();

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    } 
    
    try {
        // 1. Check if the user exists and password matches
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password) 
            .single(); 

        if (userError || !user) {
            console.error("Login Failed: User not found or wrong password");
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // 2. SUCCESS: Insert log into login_logs table
        const { error: logError } = await supabase
            .from('login_logs')
            .insert([
                { 
                    user_id: user.user_id, // Ensure your table uses 'user_id'
                }
            ]);

        if (logError) {
            // We log the error but don't stop the user from logging in
            console.error("Failed to record login log:", logError.message);
        } else {
            console.log("Login log recorded for user ID:", user.id);
        }

        // 3. Send final success response
        console.log("Login Successful for:", user.email);
        res.status(200).json({
            message: "Login successful",
            user: user
        });

    } catch (err) {
        console.error(" Server Error:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;