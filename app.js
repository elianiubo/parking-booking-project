import env from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import ejs, { name } from "ejs";
import cron from "node-cron";
import nodemailer from "nodemailer"
import axios from "axios"


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
  console.log("Arrival Date:", arrival_date);
  console.log("Departure Date:", departure_date);
  console.log("Total Days:", totalDays);

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
    const priceQuery = `
        SELECT base_price, extra_day_price, max_days
        FROM parking_slots
        WHERE slot = $1;
      `;
    const priceResult = await db.query(priceQuery, [availableSlot]);

    if (priceResult.rows.length === 0) {
      return res.status(400).json({ message: 'Slot not found' });
    }

    const { base_price, extra_day_price, max_days } = priceResult.rows[0];
    // Debugging slot pricing
    const basePrice = parseFloat(base_price); // Convert to number
    const extraDayPrice = parseFloat(extra_day_price); // Convert to number
    const maxDays = parseInt(max_days, 10); // Convert to integer

    // Debugging
    console.log("Base Price (Number):", basePrice);
    console.log("Extra Day Price (Number):", extraDayPrice);
    console.log("Max Days (Number):", maxDays);
    // Calculate total price based on booking duration and slot price
    let totalPrice;
    if (totalDays <= maxDays) {
      totalPrice = basePrice; // Fixed price for up to `max_days`
    } else {
      const extraDays = totalDays - maxDays; // Days beyond `max_days`
      console.log("Extra Days:", extraDays);
      totalPrice = basePrice + (extraDays * extraDayPrice);
    }

    // Ensure totalPrice is formatted as a number
    totalPrice = parseFloat(totalPrice.toFixed(2));
    console.log("Total Price:", totalPrice);
    const reserveQuery = `
  INSERT INTO parking_bookings (startdate, enddate, slot, "status", created)
  VALUES ($1, $2, $3, 'pending', NOW())
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
    //Integrate NODEMAILER
    //   const transporter = nodemailer.createTransport({
    //     service: 'Gmail', // or your email provider
    //     auth: {
    //       user: 'process.env.MAIL_USER', // replace with your email
    //       pass: 'process.env.MAIL_PASS' // replace with your email password or app password
    //     }
    //   });
    //   const mailOptions = {
    //     from: 'process.env.MAIL_OUT',
    //     to: email, // User's email from booking
    //     subject: 'Parking Slot Booking Confirmation',
    //     html: `
    //   <h2>Booking Confirmation</h2>
    //   <p>Thank you for booking with us, ${name}!</p>
    //   <p>Here are your booking details:</p>
    //   <ul>
    //     <li><strong>Parking Slot:</strong> ${availableSlot}</li>
    //     <li><strong>Arrival Date:</strong> ${arrival_date}</li>
    //     <li><strong>Departure Date:</strong> ${departure_date}</li>
    //     <li><strong>Total Price:</strong> $${totalPrice.toFixed(2)}</li>
    //   </ul>
    //   <p>Please complete the payment within 2 hours to confirm your booking.</p>
    //   <p>If you have any questions, contact us at support@parkingservice.com.</p>
    // `,
    //   };
    //   await transporter.sendMail(mailOptions);
    //TODO change this so it shows price in the form and info in the email
    // const totalPrice = await calculatePrice(db, availableSlot, startdate, enddate);
    // res.render('index.ejs', { totalPrice: totalPrice.toFixed(2) });
    // TODO For confirmation or email
    res.json({
      message: "Booking successful, availability and user insertion made.",
      bookingId: bookResult.rows[0].id,
      parking_spot_id: availableSlot,
      totalPrice: totalPrice
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Error checking availability or booking');
  }
})
app.post('/check-pending', async (req, res) => {
  try {
    const query = `
      UPDATE parking_bookings
      SET "status" = 'cancelled'
      WHERE "status" = 'pending'
        AND created < NOW() - INTERVAL '2 hours'
      RETURNING id;
    `;
    const result = await db.query(query);
    res.json({ message: 'Pending bookings updated', cancelledBookings: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating pending bookings');
  }
});
app.post('/payment-success', async (req, res) => {
  const { bookingId } = req.body; // Get booking ID from the payment gateway

  try {
    const query = `
      UPDATE parking_bookings
      SET "status" = 'confirmed'
      WHERE id = $1
      RETURNING id;
    `;
    const result = await db.query(query, [bookingId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({ message: 'Booking confirmed', bookingId });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error confirming booking');
  }
});

//functions TODO 
// const calculatePrice = async (db, slot, startdate, enddate) => {
//   try {
//     const priceQuery = `SELECT price from parking_slots WHERE slot = $1`
//     const priceResult = await db.query(priceQuery, [slot])
//     if (priceResult.rows.length === 0) {
//       throw new Error("Slot price not found")
//     }
//     //calculate booking duration in days
//     const pricePerDay = priceResult.rows[0].price;
//     console.log(pricePerDay)

//     // const durationQuery_alter = `SELECT slot, COUNT(*) AS pricePerDay, (DATEDIFF(day, startdate, enddate) 
//     // FROM myTable
//     // GROUP BY agentName;`;
//     const durationQuery = `SELECT EXTRACT(EPOCH FROM ($2::timestamp - $1::timestamp)) / 86400 AS duration_days;`;
//     const durationResult = await db.query(durationQuery, [startdate, enddate]);
//     const durationDays = Math.ceil(durationResult.rows[0].duration_days);
//     return pricePerDay * durationDays;
//   } catch (err) {
//     console.error('Error calculating total price:', err);
//     throw err;
//   }
// }


// updates every2 hours to check if booking is payed
cron.schedule('*/5 * * * *', async () => {
  try {
    await axios.post('http://localhost:3000/check-pending'); // Replace with your route URL
    console.log('Checked pending bookings');
  } catch (error) {
    console.error('Error running scheduled task:', error);
  }
});
// Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
