import express from 'express';
import { supabase } from '../supabase.js';

const router = express.Router();

router.get('/getalllogs', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('login_logs')
            .select(`
                user_id,
                created_at,
                users (
                    firstname,
                    lastname,
                    middlname,
                    profile,
                    email, 
                    phonenumber,
                    address
                )
            `) 
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase Error:", error.message);
            return res.status(500).json({ error: error.message });
        }

        const formattedLogs = (data || []).map(log => {
    const userData = Array.isArray(log.users) ? log.users[0] : log.users;
    
    return {
        user_id: log.user_id,
        timestamp: log.created_at,
        firstname: userData?.firstname || 'Unknown',
        lastname: userData?.lastname || '',
        middlname: userData?.middlname || '', 
        profile: userData?.profile || '',
        // ADD THESE FIELDS BELOW:
        email: userData?.email || 'N/A',
        phonenumber: userData?.phonenumber || 'N/A',
        address: userData?.address || 'N/A',
        fullName: userData 
            ? `${userData.firstname} ${userData.middlname ? userData.middlname + ' ' : ''}${userData.lastname}`.trim()
            : 'System / Deleted User'
    };
});

        res.status(200).json(formattedLogs);

    } catch (err) {
        console.error("Server Error:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;