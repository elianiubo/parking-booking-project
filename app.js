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
app.get('/', async (req, res) => {
  res.render('index.ejs');
});
// Route 1: Check availability based on dates
app.post('/book', async (req, res) => {
  const {
    arrival_date, departure_date, arrival_time, departure_time,
    name, email, car_brand, car_color, car_type, license_plate
  } = req.body;
  //const { arrival_date, departure_date, arrival_time, departure_time } = req.body;

  // Combine the date and time to form full start and end datetime
  const startdatetime = `${arrival_date} ${arrival_time}`;
  const enddatetime = `${departure_date} ${departure_time}`;

  try {
    // Query to check available parking slots for the given start and end datetime
    const query = `
            WITH booked_slots AS (
                SELECT DISTINCT slot
                FROM parking_bookings
                WHERE startdatetime < $2
                  AND enddatetime > $1
                  AND "status" != 'cancelled'
            )
            SELECT slot
            FROM parking_slots
            WHERE slot NOT IN (SELECT slot FROM booked_slots);
        `;
    const values = [startdatetime, enddatetime];
    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      // If no available slots
      return res.status(400).json({ message: 'No spots available for the selected dates' });
    }

    // If available slots are found
    const availableSlot = result.rows[0].slot;

    // Now, insert the booking into the parking_bookings table
    const reserveQuery = `
          INSERT INTO parking_bookings (startdatetime, enddatetime, slot, "status", created)
          VALUES ($1, $2, $3, 'confirmed', NOW())
          RETURNING id;
        `;
    const bookValues = [startdatetime, enddatetime, availableSlot];
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
    res.json({
      message: "Booking successful, availability and user insertion made.",
      bookingId: bookResult.rows[0].id, // Booking ID from parking_bookings
      parking_spot_id: availableSlot // Parking spot that was reserved
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error checking availability or booking');
  }
})
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

// Route 3: Book a parking spot (Insert user booking)
// app.post('/book', async (req, res) => {
//   const {
//     parking_spot_id,
//     name,
//     email,
//     arrival_date,
//     departure_date,
//     arrival_time,
//     departure_time,
//     car_brand,
//     car_color,
//     car_type,
//     license_plate
//   } = req.body;

//   // Combine the date and time to form full start and end datetime
//   const startdatetime = `${arrival_date} ${arrival_time}`;
//   const enddatetime = `${departure_date} ${departure_time}`;

//   try {
//     // Check availability again before booking (optional, just in case)
//     const availabilityCheckQuery = `
//           SELECT slot
//           FROM parking_bookings
//           WHERE startdatetime < $2
//             AND enddatetime > $1
//             AND "status" != 'cancelled' 
//             AND slot = $3;
//       `;
//     const availabilityValues = [startdatetime, enddatetime, parking_spot_id];
//     console.log(availabilityCheckQuery[parking_spot_id])
//     const availabilityResult = await db.query(availabilityCheckQuery, availabilityValues);

//     if (availabilityResult.rows.length > 0) {
//       return res.status(400).json({ message: 'Selected slot is already booked for the given dates' });
//     }

//     // Insert the user booking into the database
//     const bookingQuery = `
//           INSERT INTO user_bookings (
//               parking_spot_id, name, email, arrival_date, departure_date,
//               arrival_time, departure_time, car_brand, car_color, car_type, license_plate
//           ) 
//           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
//           RETURNING id;
//       `;
//     const bookingValues = [
//       parking_spot_id,
//       name,
//       email,
//       arrival_date,
//       departure_date,
//       arrival_time,
//       departure_time,
//       car_brand,
//       car_color,
//       car_type,
//       license_plate
//     ];
//     const bookingResult = await db.query(bookingQuery, bookingValues);

//     // Update the parking spot's status to "confirmed"
//     const updateBookingQuery = `
//           UPDATE parking_bookings
//           SET "status" = 'confirmed'
//           WHERE slot = $1
//             AND startdatetime = $2
//             AND enddatetime = $3;
//       `;
//     const updateBookingValues = [parking_spot_id, startdatetime, enddatetime];
//     await db.query(updateBookingQuery, updateBookingValues);

//     res.json({ message: 'Booking successful', bookingId: bookingResult.rows[0].id });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send('Error making booking');
//   }
// });
//posts the booking process insrts the user_info and chnges the status of the booking
// Waiting time in process for payment(in email) and the changes the avaliability of the parking spot)
// app.post('/book', async (req, res) => {


//   // const {
//   //   name,
//   //   email,
//   //   arrival_date,
//   //   departure_date,
//   //   arrival_time,
//   //   departure_time,
//   //   car_brand,
//   //   car_color,
//   //   car_type,
//   //   license_plate,
//   // } = bookingInfo;
//   // console.log(name, email)
//   // try {

//   //   //First check if dates given the's a spot avaliable


//   //   //-Insert booking details into user_info table WORKS
//   //   const result = await db.query(
//   //     `INSERT INTO user_info (name, email, arrival_date, departure_date, arrival_time, departure_time, car_brand, car_color, car_type, license_plate)
//   //        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
//   //     [name, email, arrival_date, departure_date, arrival_time, departure_time, car_brand, car_color, car_type, license_plate]
//   //   );

//   //   // get the id of user info directly


//   //   //I need to make the insert to booking_status to change it as reserved
//   //   //const booking_id = result.rows[0].id;
//   //   //select if there is a spot avaliable on the selected dates
//   //   // if there is 

//   //   //make the insert into booking_avaliability to change the avaliability of thr parking spot

//   //   // Send confirmation email (use a package like nodemailer to send emails)

//   //   //console.log(req.body);
//   //   res.send('Booking successful!');
//   // } catch (err) {
//   //   console.error(err);
//   //   res.status(500).send('Server error. Please try again.');
//   // }

// })





// Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
