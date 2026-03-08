const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Initialize Database Table
const initDB = async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS wishes (
                id SERIAL PRIMARY KEY,
                user_name VARCHAR(255) NOT NULL,
                wish_text TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('Database initialized.');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}
initDB();

// API endpoint to make a wish
app.post('/api/wishes', async (req, res) => {
    try {
        const { user_name, wish_text } = req.body;
        if (!user_name || !wish_text) {
             return res.status(400).json({ error: 'user_name and wish_text are required' });
        }
        
        const result = await db.query(
            'INSERT INTO wishes (user_name, wish_text) VALUES ($1, $2) RETURNING *',
            [user_name, wish_text]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating wish:', err.message);
        res.status(500).json({ error: 'Server error while creating wish' });
    }
});

// API endpoint to get all wishes (optional, but good for testing)
app.get('/api/wishes', async (req, res) => {
     try {
         const result = await db.query('SELECT * FROM wishes ORDER BY created_at DESC');
         res.json(result.rows);
     } catch(err) {
         console.error('Error fetching wishes:', err.message);
         res.status(500).json({ error: 'Server error while fetching wishes' });
     }
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
