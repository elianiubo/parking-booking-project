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
    sendMailConfirmation(
      arrival_date, departure_date, arrival_time, departure_time,
      name, email, car_brand, car_color, car_type, license_plate,
      availableSlot, totalPrice
    );

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

//endpoint to check avaliability and show it in user interface
app.post('/check-availability', async (req, res) => {
  const { arrival_date, departure_date } = req.body;
  try {
    const query = `
  WITH booked_slots AS (
    SELECT DISTINCT slot
    FROM parking_bookings
    WHERE DATE(startdate) <= $2
      AND DATE(enddate) >= $1
      AND "status" != 'cancelled'
  )
  SELECT slot
  FROM parking_slots
  WHERE slot NOT IN (SELECT slot FROM booked_slots)
  LIMIT 1;
`;
    const checkValues = [arrival_date, departure_date];
    const checkResult = await db.query(query, checkValues); // Execute the booking insertion
    if (checkResult.rows.length > 0) {
      return res.json({ available: true });
    } else {
      return res.json({ available: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error checking availability' });
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


//Send mail confirmation 
function sendMailConfirmation(
  arrival_date, departure_date, arrival_time, departure_time,
  name, email, car_brand, car_color, car_type, license_plate,
  availableSlot, totalPrice
) {
  if (!email || email.trim() === '') {
    console.error('Recipient email is invalid or missing.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'Gmail', // or your email provider
    auth: {
      user: process.env.MAIL_USER, // replace with your email
      pass: process.env.MAIL_PASS // replace with your email password or app password
    }
  });

  // Configure the mail options object
  const mailOptions = {
    from: 'elia.nibu@gmail.com', // Replace with a verified sender email
    to: email,
    subject: 'Booking Pending Payment',
    html: `
      <h1>Booking Details</h1>
      <p>Hello, ${name}!</p>
      <p>You have almost completed your booking. Here are the details:</p>
      <ul>
        <li><strong>Slot:</strong> ${availableSlot}</li>
        <li><strong>Arrival Date:</strong> ${arrival_date}</li>
        <li><strong>Departure Date:</strong> ${departure_date}</li>
        <li><strong>Total Price:</strong> €${totalPrice}</li>
      </ul>
      <p>Please complete your payment to confirm your booking.</p>
    `,
  };

  // Send the email
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

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
