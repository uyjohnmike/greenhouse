// server.js
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import getallbellpeppercountRoutes from "./API/getallbellpeppercount.js";
import logRoutes from "./API/getalllogs.js";
import getallnpkRoutes from "./API/getallnpk.js";
import getallpestlogsRoutes from "./API/getallpestlogs.js";
import getallsensorlogsRoutes from "./API/getallsensorlogs.js";
import getallsoilhumidityRoutes from "./API/getallsoilhumidity.js";
import metricsRoute from './API/getalltemperature.js';
import getallusersRoutes from "./API/getallusers.js";
import getallwaterlevelRoutes from "./API/getallwaterlevel.js";
import loginRoutes from "./API/login.js";
import updateprofileRoutes from "./API/updateprofile.js";
import updateuserRoutes from "./API/updateuser.js";

const app = express();

app.use(cors());
app.use(express.json());


app.use("/api", getallusersRoutes);
app.use("/api", loginRoutes);
app.use('/api', logRoutes);
app.use('/api', metricsRoute);
app.use('/api', getallsoilhumidityRoutes);
app.use('/api', getallnpkRoutes);
app.use('/api', getallwaterlevelRoutes);
app.use('/api', getallbellpeppercountRoutes);
app.use('/api', getallpestlogsRoutes);
app.use('/api', getallsensorlogsRoutes);
app.use('/api', updateuserRoutes);
app.use('/api', updateprofileRoutes);


app.get("/", (req, res) => {
    res.json({ message: "Greenhouse API is running. Use /api/getallusers to fetch data." });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(` Next Step: Run 'ngrok http ${PORT}' in your other terminal.`);
});