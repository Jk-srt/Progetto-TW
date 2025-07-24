import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Converti PORT in number e assicurati sia valido
const PORT = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        port: PORT
    });
});

// Connessione MongoDB Atlas
async function connectToDatabase() {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI non definita nelle variabili d\'ambiente');
        }

        await mongoose.connect(mongoUri);
        console.log('✅ Connesso a MongoDB Atlas');
    } catch (error) {
        console.error('❌ Errore connessione database:', error);
        process.exit(1);
    }
}

// Avvio server - CORREZIONE: usa PORT come number e '0.0.0.0' come string
async function startServer() {
    await connectToDatabase();

    // Corretto: PORT è number, '0.0.0.0' è string
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server in ascolto su http://0.0.0.0:${PORT}`);
        console.log(`🌐 Health check: http://0.0.0.0:${PORT}/api/health`);
    });
}

startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});
