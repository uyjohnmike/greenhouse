// API/updateuser.js
import express from 'express';
import { supabase } from '../supabase.js';

const router = express.Router();

// POST update user by ID provided in the body
router.post('/updateuser', async (req, res) => {
    try {
        // Extract user_id and other info from the body
        const { 
            user_id, // We get the ID from here now
            firstname, lastname, middlname, suffix, 
            birthday, gender, phonenumber, email, 
            password, address, age, status 
        } = req.body;

        // 1. Check if user_id was actually provided
        if (!user_id) {
            return res.status(400).json({ error: "Missing user_id in request body" });
        }

        console.log(`--- Update Request for User ID: ${user_id} ---`);

        // 2. Perform the update
        // We explicitly omit 'profile' here so it never changes
        const { data, error } = await supabase
            .from('users')
            .update({
                firstname,
                lastname,
                middlname,
                suffix,
                birthday,
                gender,
                phonenumber,
                email,
                password,
                address,
                age,
                status
            })
            .eq('user_id', user_id)
            .select();

        // 3. Error Handling
        if (error) {
            console.error("❌ Supabase Update Error:", error.message);
            return res.status(400).json({ error: error.message });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "User not found with the provided ID" });
        }

        // 4. Success
        console.log(`✅ Success! User ID ${user_id} updated.`);
        res.status(200).json({
            message: "Information updated successfully",
            updatedData: data[0]
        });

    } catch (err) {
        console.error("❌ Server Crash:", err.message);
        res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
});

export default router;