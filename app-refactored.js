import env, { parse } from "dotenv";
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

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
// Routes
app.get('/', (req, res) => {
  res.render('index.ejs', { totalPrice: 0 });
});



// Helper Functions
function calculateTotalPrice(totalDays, basePrice, extraDayPrice, maxDays) {
  if (totalDays <= maxDays) {
    return parseFloat(basePrice.toFixed(2));
  }
  const extraDays = totalDays - maxDays;
  return parseFloat((basePrice + (extraDays * extraDayPrice)).toFixed(2));
}

async function getAvailableSlot(arrival_date, departure_date) {
  const query = `
    WITH booked_slots AS (
        SELECT DISTINCT slot
        FROM parking_bookings
        WHERE DATE(startdate) <= $2
          AND DATE(enddate) >= $1
          AND "status" != 'cancelled'
    )
    SELECT slot, base_price, extra_day_price, max_days
    FROM parking_slots
    WHERE slot NOT IN (SELECT slot FROM booked_slots)
    LIMIT 1;
  `;
  const values = [arrival_date, departure_date];
  return db.query(query, values);
}

// async function cancelPendingBookings() {
//   const query = `
//     UPDATE parking_bookings
//     SET "status" = 'cancelled'
//     WHERE "status" = 'pending'
//       AND created < NOW() - INTERVAL '2 hours'
//     RETURNING id;
//   `;
//   return db.query(query);
// }

function sendMailConfirmation(data) {
  const { name, email, arrival_date, departure_date, totalPrice, availableSlot } = data;

  if (!email || email.trim() === '') {
    console.error('Recipient email is invalid or missing.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const mailOptions = {
    from: 'elia.nibu@gmail.com',
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

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
}

async function createBookingAndUserDetails(bookingData, userData) {
  try {

    // Insert the booking data
    const bookingQuery = `
      INSERT INTO parking_bookings (startdate, enddate, slot, "status", created)
      VALUES ($1, $2, $3, 'pending', NOW())
      RETURNING id;
    `;
    const bookingResult = await db.query(bookingQuery, bookingData);

    // Insert the user booking data
    const userBookingQuery = `
      INSERT INTO user_bookings (
        parking_spot_id, name, email, arrival_date, departure_date,
        arrival_time, departure_time, car_brand, car_color, car_type, license_plate
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id;
    `;
    await db.query(userBookingQuery, userData);
    return bookingResult.rows[0];
  } catch (error) {
    throw error;  // Rethrow the error for handling elsewhere
  }
}

// // Middleware to check pending bookings
// app.use(async (req, res, next) => {
//   try {
//     await cancelPendingBookings();
//     next();
//   } catch (error) {
//     console.error('Error canceling pending bookings:', error);
//     res.status(500).send('Internal Server Error');
//   }
// });

// Routes
app.post('/book', async (req, res) => {
  const { arrival_date, departure_date, arrival_time, departure_time, name, email, car_brand, car_color, car_type, license_plate } = req.body;

  try {
    const arrival = new Date(arrival_date);
    const departure = new Date(departure_date);
    const totalDays = Math.ceil((departure - arrival) / (1000 * 60 * 60 * 24)) + 1;

    const availableSlotResult = await getAvailableSlot(arrival_date, departure_date);
    if (availableSlotResult.rows.length === 0) {
      return res.status(400).json({ message: 'No spots available for the selected dates' });
    }

    const { slot: availableSlot, base_price, extra_day_price, max_days } = availableSlotResult.rows[0];
    const totalPrice = calculateTotalPrice(totalDays, parseFloat(base_price), parseFloat(extra_day_price), parseInt(max_days, 10));

    const bookingData = [`${arrival_date} 00:00:00`, `${departure_date} 23:59:59`, availableSlot];
    const userData = [
      availableSlot, name, email, arrival_date, departure_date, arrival_time, departure_time,
      car_brand, car_color, car_type, license_plate
    ];

    const booking = await createBookingAndUserDetails(bookingData, userData);

    sendMailConfirmation({ name, email, arrival_date, departure_date, totalPrice, availableSlot });

    res.json({ message: "Booking successful", bookingId: booking.id, parking_spot_id: availableSlot, totalPrice });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error checking availability or booking');
  }
});

app.post('/check-availability', async (req, res) => {
  const { arrival_date, departure_date } = req.body;

  try {
    const availableSlotResult = await getAvailableSlot(arrival_date, departure_date);

    if (availableSlotResult.rows.length === 0) {
      return res.json({ available: false });
    }

    const { base_price, extra_day_price, max_days } = availableSlotResult.rows[0];
    const arrival = new Date(arrival_date);
    const departure = new Date(departure_date);
    const totalDays = Math.ceil((departure - arrival) / (1000 * 60 * 60 * 24)) + 1;

    const totalPrice = calculateTotalPrice(totalDays, parseFloat(base_price), parseFloat(extra_day_price), parseInt(max_days, 10));
    res.json({ available: true, totalPrice });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error checking availability' });
  }
});
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

    if (result.rows.length === 0) {
      return res.json({ message: 'No pending bookings', pending: false });
    }

    return res.json({ message: 'Pending bookings found', pending: true, cancelledBookings: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error updating pending bookings');
  }
});


app.post('/payment-success', async (req, res) => {
  const { bookingId } = req.body;

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

// Scheduled Task
cron.schedule('*/5 * * * *', async () => {
  try {
    await axios.post('http://localhost:3000/check-pending');
    console.log('Checked pending bookings');
  } catch (error) {
    console.error('Error running scheduled task:', error);
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
