import env from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import ejs, { name } from "ejs";


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
app.use(express.json());
// Routes
app.get('/', (req, res) => {
  res.render('index.ejs', { totalPrice: 0 });
});
// Route 1: Check availability based on dates
app.post('/book', async (req, res) => {
  const {
    arrival_date, departure_date, arrival_time, departure_time,
    name, email, car_brand, car_color, car_type, license_plate
  } = req.body;
  
    // Calculate booking duration in days
    const arrival = new Date(arrival_date);
    const departure = new Date(departure_date);
    const totalDays = Math.ceil((departure - arrival) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate cost
    const baseCost = 49; //minimum price up to 7 days
    const extraCost = totalDays > 7 ? (totalDays - 7) * 7 : 0;
    const totalPrice = baseCost + extraCost;
// Combine the date and time to form full start and end datetime
  //Deleted this one and changed it for the data upsters coz I only want to
  //store the dates the hours are just as a data not usable for booking process
  // const startdate = `${arrival_date} ${arrival_time}`;
  // const enddate = `${departure_date} ${departure_time}`;

  try {
    // Query to check available parking slots for the given start and end datetime
    const query = `
    WITH booked_slots AS (
        SELECT DISTINCT slot
        FROM parking_bookings
        WHERE DATE(startdate) <= $2 -- Check overlapping dates only
          AND DATE(enddate) >= $1  -- Check overlapping dates only
          AND "status" != 'cancelled'
    )
    SELECT slot
    FROM parking_slots
    WHERE slot NOT IN (SELECT slot FROM booked_slots);
  `;
  const values = [arrival_date, departure_date];
  const result = await db.query(query, values);

    if (result.rows.length === 0) {
      // If no available slots
      return res.status(400).json({ message: 'No spots available for the selected dates' });
    }

    // If available slots are found
    const availableSlot = result.rows[0].slot;

    // Now, insert the booking into the parking_bookings table
    const reserveQuery = `
      INSERT INTO parking_bookings (startdate, enddate, slot, "status", created)
      VALUES ($1, $2, $3, 'confirmed', NOW())
      RETURNING id;
    `;
    const bookValues = [`${arrival_date} 00:00:00`, `${departure_date} 23:59:59`, availableSlot];
    const bookResult = await db.query(reserveQuery, bookValues); // Execute the booking insertion

    // After inserting parking booking, insert user details into user_bookings table
    const userBookingQuery = `
      INSERT INTO user_bookings (
        parking_spot_id, name, email, arrival_date, departure_date,
        arrival_time, departure_time, car_brand, car_color, car_type, license_plate
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id;
    `;
        
    const userBookingValues = [
      availableSlot,
      name, email, arrival_date, departure_date,
      arrival_time, departure_time,
      car_brand, car_color, car_type, license_plate
    ];

    await db.query(userBookingQuery, userBookingValues); // Execute the user booking insertion

    // Return a successful response with booking ID and parking spot ID
    //TODO change this so it shows price in the form and info in the email
    // const totalPrice = await calculatePrice(db, availableSlot, startdate, enddate);
    // res.render('index.ejs', { totalPrice: totalPrice.toFixed(2) });
    // TODO For confirmation or email
    res.json({
      message: "Booking successful, availability and user insertion made.",
      bookingId: bookResult.rows[0].id,
      parking_spot_id: availableSlot,
      totalPrice: totalPrice.toFixed(2)
    });
    // res.json({
    //   message: "Booking successful, availability and user insertion made.",
    //   bookingId: bookResult.rows[0].id, // Booking ID from parking_bookings
    //   parking_spot_id: availableSlot,// Parking spot that was reserved
    //   totalPrice: totalPrice.toFixed(2)
    // });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error checking availability or booking');
  }
})

//functions TODO 
const calculatePrice = async (db, slot, startdate, enddate) => {
  try {
    const priceQuery = `SELECT price from parking_slots WHERE slot = $1`
    const priceResult = await db.query(priceQuery, [slot])
    if (priceResult.rows.length === 0) {
      throw new Error("Slot price not found")
    }
    //calculate booking duration in days
    const pricePerDay = priceResult.rows[0].price;
    console.log(pricePerDay)

    // const durationQuery_alter = `SELECT slot, COUNT(*) AS pricePerDay, (DATEDIFF(day, startdate, enddate) 
    // FROM myTable
    // GROUP BY agentName;`;
    const durationQuery = `SELECT EXTRACT(EPOCH FROM ($2::timestamp - $1::timestamp)) / 86400 AS duration_days;`;
    const durationResult = await db.query(durationQuery, [startdate, enddate]);
    const durationDays = Math.ceil(durationResult.rows[0].duration_days);
    return pricePerDay * durationDays;
  } catch (err) {
    console.error('Error calculating total price:', err);
    throw err;
  }
}

//TODO in the futurte when adding payments
// Route 2: Get all pending bookings older than 24 hours
// app.get('/pending-bookings', async (req, res) => {
//   try {
//       const query = `
//           SELECT pb.id
//           FROM parking_bookings AS pb
//           WHERE pb."status" = 'pending' 
//             AND pb.created < NOW() - INTERVAL '24 hours';
//       `;
//       const result = await db.query(query);
//       res.json({ pendingBookings: result.rows });
//   } catch (err) {
//       console.error(err);
//       res.status(500).send('Error fetching pending bookings');
//   }
// });





// Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
