import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware di sicurezza e logging
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health-check endpoint
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Connessione a MongoDB (Atlas o locale)
async function connectDB() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI non definita');
        process.exit(1);
    }
    try {
        await mongoose.connect(uri);
        console.log('✅ Connesso a MongoDB');
    } catch (err) {
        console.error('❌ Errore connessione MongoDB:', err);
        process.exit(1);
    }
}

// Avvio del server
async function start() {
    await connectDB();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server in ascolto su http://0.0.0.0:${PORT}`);
    });
}

start();
