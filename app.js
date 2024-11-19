import env from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import ejs from "ejs";


const app = express();
const PORT = 3000;
env.config();
const db = new pg.Client({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});
db.connect();


// Middleware
// app.use(bodyParser.urlencoded({ extended: true }));
// app.use(express.static('public'));
// app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
// Routes
app.get('/', (req, res) => {
  res.render('index.ejs');
});

// app.post('/book', async (req, res) => {
//   const {
//     name,
//     email,
//     arrival_date,
//     departure_date,
//     arrival_time,
//     departure_time,
//     car_brand,
//     car_color,
//     car_type,
//     license_plate,
//   } = req.body;

//   try {
//     await pool.query(
//       `INSERT INTO bookings (name, email, arrival_date, departure_date, arrival_time, departure_time, car_brand, car_color, car_type, license_plate)
//        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
//       [name, email, arrival_date, departure_date, arrival_time, departure_time, car_brand, car_color, car_type, license_plate]
//     );
//     res.send('Booking successful!');
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Server error. Please try again.');
//   }
// });

// Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
