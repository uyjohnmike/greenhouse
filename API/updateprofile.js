// API/updateprofile.js
import express from 'express';
import multer from 'multer';
import path from 'path';
import { supabase } from '../supabase.js';

const router = express.Router();

// Configure multer for memory storage (for handling file uploads)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// POST update profile picture
router.post('/updateprofile', upload.single('profile'), async (req, res) => {
    try {
        const { user_id } = req.body;
        const profileImage = req.file;

        // 1. Check if user_id was provided
        if (!user_id) {
            return res.status(400).json({ error: "Missing user_id in request body" });
        }

        // 2. Check if file was uploaded
        if (!profileImage) {
            return res.status(400).json({ error: "No profile image uploaded" });
        }

        console.log(`--- Profile Update Request for User ID: ${user_id} ---`);

        // 3. Get current user data to find old profile image
        const { data: currentUser, error: fetchError } = await supabase
            .from('users')
            .select('profile')
            .eq('user_id', user_id)
            .single();

        if (fetchError) {
            console.error("❌ Error fetching current user:", fetchError.message);
            return res.status(404).json({ error: "User not found" });
        }

        const oldProfileImage = currentUser?.profile;

        // 4. Generate unique filename for new profile image
        const fileExtension = path.extname(profileImage.originalname);
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const newFileName = `${user_id}_${timestamp}_${randomString}${fileExtension}`;
        
        const SUPABASE_PROJECT_ID = "xvebncyvecfvocnqcxpk";
        const BUCKET = "images";
        const filePath = `${newFileName}`;

        // 5. Upload new image to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(filePath, profileImage.buffer, {
                contentType: profileImage.mimetype,
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error("❌ Upload Error:", uploadError.message);
            return res.status(500).json({ error: "Failed to upload profile image", details: uploadError.message });
        }

        console.log("✅ Image uploaded successfully:", filePath);

        // 6. Delete old profile image from storage if it exists
        if (oldProfileImage && oldProfileImage !== 'default-avatar.png') {
            const { error: deleteError } = await supabase.storage
                .from(BUCKET)
                .remove([oldProfileImage]);

            if (deleteError) {
                console.error("⚠️ Warning: Could not delete old profile image:", deleteError.message);
                // Don't fail the request if old image deletion fails
            } else {
                console.log("✅ Old profile image deleted:", oldProfileImage);
            }
        }

        // 7. Update user record with new profile filename
        const { data: updatedUser, error: updateError } = await supabase
            .from('users')
            .update({ profile: newFileName })
            .eq('user_id', user_id)
            .select();

        if (updateError) {
            console.error("❌ Database Update Error:", updateError.message);
            // Attempt to rollback - delete the newly uploaded image
            await supabase.storage.from(BUCKET).remove([filePath]);
            return res.status(500).json({ error: "Failed to update user profile", details: updateError.message });
        }

        if (!updatedUser || updatedUser.length === 0) {
            return res.status(404).json({ error: "User not found after update" });
        }

        // 8. Generate public URL for the new profile image
        const { data: publicUrlData } = supabase.storage
            .from(BUCKET)
            .getPublicUrl(filePath);

        const profileImageUrl = publicUrlData.publicUrl;

        // 9. Success response
        console.log(`✅ Success! Profile picture updated for User ID: ${user_id}`);
        res.status(200).json({
            message: "Profile picture updated successfully",
            profileFileName: newFileName,
            profileImageUrl: profileImageUrl,
            user: updatedUser[0]
        });

    } catch (err) {
        console.error("❌ Server Crash:", err.message);
        res.status(500).json({ error: "Internal Server Error", message: err.message });
    }
});

// DELETE old profile image (utility endpoint if needed)
router.delete('/deleteprofileimage', async (req, res) => {
    try {
        const { user_id, fileName } = req.body;

        if (!user_id || !fileName) {
            return res.status(400).json({ error: "Missing user_id or fileName" });
        }

        const SUPABASE_PROJECT_ID = "xvebncyvecfvocnqcxpk";
        const BUCKET = "images";

        // Delete from storage
        const { error: deleteError } = await supabase.storage
            .from(BUCKET)
            .remove([fileName]);

        if (deleteError) {
            console.error("❌ Delete Error:", deleteError.message);
            return res.status(500).json({ error: "Failed to delete image", details: deleteError.message });
        }

        // Update user profile to null or default
        const { error: updateError } = await supabase
            .from('users')
            .update({ profile: null })
            .eq('user_id', user_id);

        if (updateError) {
            console.error("❌ Database Update Error:", updateError.message);
            return res.status(500).json({ error: "Failed to update user record" });
        }

        res.status(200).json({ message: "Profile image deleted successfully" });

    } catch (err) {
        console.error("❌ Server Crash:", err.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

export default router;