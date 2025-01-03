import env, { parse } from "dotenv";
import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import ejs, { name } from "ejs";
import cron from "node-cron";
import nodemailer from "nodemailer"
import axios from "axios"
import Stripe from "stripe"
import session from 'express-session'


const app = express();
const PORT = 3000;
const YOUR_DOMAIN = 'http://localhost:3000';
let stripe; // Declare globally to make it accessible across the application



env.config();
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();
//const stripe = new Stripe(process.env.STRIPE_KEY);

//onsole.log('Stripe Key:', process.env.STRIPE_KEY);

// Middleware

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(express.json());
// Middleware for session handling
app.use(session({
  secret: process.env.SESSION_SECRET,  // Replace with a secure secret
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }, // Set `true` if using HTTPS
}));
// Routes
app.get('/', async (req, res) => {
  try {
    const query = await db.query(`Select question, answer from faq`)
    // If no rows are returned, log an empty array for debugging
    const faqs = query.rows;
    const { address1, address2, address3, phone, contact_email } = await getEnvVariables();


    res.render('index.ejs', { totalPrice: 0, faqs, address1, address2, address3, phone, contact_email });

  } catch (error) {
    console.error('Error fetching FAQs:', error);
    res.status(500).send('Internal Server Error');
  }

});
// Route for rendering confirmation.ejs
app.get('/confirmation', async (req, res) => {
  const confirmationData = req.session.confirmationData;

  if (!confirmationData) {
    return res.status(400).send('No confirmation data found.');
  }

  const { name, bookingId, totalPrice } = confirmationData;
  const { address1, address2, address3, phone, contact_email } = await getEnvVariables();

  res.render('confirmation.ejs', {
    address1,
    address2,
    address3,
    phone,
    contact_email,
    name,
    bookingId,
    totalPrice,
  });
});

// app.get('/faq', async (req, res) => {
//   try {
//     const result = await db.query('SELECT * FROM faq');
//     const data = result.rows; // Get the rows from the database

//     if (data.length === 0) {
//       return res.render('booking-form', { faqs: [] }); // If no data, pass an empty array
//     }

//     res.render('booking-form', { faqs: data }); // Pass the fetched FAQs to the view
//   } catch (error) {
//     console.error('Error fetching FAQs:', error);
//     res.status(500).send('Server error');
//   }
// });
// gets the stripe key from getEnvVariables and globally initializes the secret_key
//for the session in function createSession
(async () => {
  try {
    const { stripeKey } = await getEnvVariables(); // Retrieve Stripe key from DB
    stripe = new Stripe(stripeKey); // Initialize Stripe
    console.log('Stripe initialized successfully.');
  } catch (error) {
    console.error('Failed to initialize Stripe:', error.message);
    process.exit(1); // Exit if initialization fails
  }
})();

//function that gets the env var from the database
async function getEnvVariables() {
  try {
    const query = 'SELECT value FROM env_variables WHERE key_name = $1';
    //const passQuery = 'SELECT value FROM env_variables WHERE key_name = $1';

    // Fetch both values in parallel
    const emailResult = await db.query(query, ['EMAIL']);
    const passResult = await db.query(query, ['EMAIL_PASS']);
    const stripeKeyResult = await db.query(query, ['STRIPE_KEY']);
    const cancelMinutesResult = await db.query(query, ['CANCEL_MINUTES']);
    const address1 = await db.query(query, ['address1']);
    const address2 = await db.query(query, ['address2'])
    const address3 = await db.query(query, ['address3']);
    const contact_email = await db.query(query, ['contact-email']);
    const phone = await db.query(query, ['phone']);

    if (emailResult.rows.length > 0
      && passResult.rows.length > 0
      && stripeKeyResult.rows.length > 0
      && cancelMinutesResult.rows.length > 0
      && address1.rows.length > 0
      && address2.rows.length > 0
      && address3.rows.length > 0
      && phone.rows.length > 0
      && contact_email.rows.length > 0

    ) {
      // Return the value from the result
      return {
        emailOut: emailResult.rows[0].value,
        pass: passResult.rows[0].value,
        stripeKey: stripeKeyResult.rows[0].value,
        cancel_minutes: parseInt(cancelMinutesResult.rows[0].value),
        address1: address1.rows[0].value,
        address2: address2.rows[0].value,
        address3: address3.rows[0].value,
        phone: phone.rows[0].value,
        contact_email: contact_email.rows[0].value,


      }
    }
    throw new Error(`variables not found in env_variables table.`);
  } catch (error) {
    console.error('Error fetching environment variable:', error.message);
    throw error;
  }
}

// Hcalculates total price that the price is used in 
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
//Funtion that gets user data and sned the email wether is pending or confirmed booking
//the email format is also developed
async function sendMailConfirmation(data) {
  console.log('Data received in sendMailConfirmation:', data);
  const { bookingId, name, sessionUrl, slot, email, arrival_date, departure_date,
    arrival_time, departure_time, totalPrice, isPaid } = data;
  const formattedArrival = formatDate(arrival_date)
  const formattedDeparture = formatDate(departure_date)
  //console.log(formattedArrival + "    " + formattedDeparture)

  const { emailOut, pass, cancel_minutes } = await getEnvVariables(); // Fetch email and password from en variables
  console.log("Email out in function send email is " + emailOut);
  console.log("Pass in function send email is " + pass);
  console.log("Time to cancel is " + cancel_minutes)

  if (!email || email.trim() === '') {
    console.error('Recipient email is invalid or missing.');
    return;
  }
  console.log("Sending confirmation email to:", email);
  console.log("Booking id from mail function" + bookingId)
  //format to add the text in minutes or hours in case of future chamnges in time in db
  //automatically adaps to minutes or hours the text
  let cancelTimeText;
  //checks wether is hours or minutes
  if (cancel_minutes >= 60) {
    const hours = Math.floor(cancel_minutes / 60);
    const minutes = cancel_minutes % 60;
    //Makes the text adding an s depending if is 1 or more hours and the same with minutes
    cancelTimeText = `${hours} hour${hours > 1 ? 's' : ''}${minutes > 0 ? ` and ${minutes} minute${minutes > 1 ? 's' : ''}` : ''}`;
  } else {
    cancelTimeText = `${cancel_minutes} minute${cancel_minutes > 1 ? 's' : ''}`;
  }

  console.log("Formatted cancel time:", cancelTimeText);

  const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
      user: emailOut,//'elia.nibu@gmail.com', //process.env.MAIL_USER,
      pass: pass//process.env.MAIL_PASS,
    },
  });

  const mailOptions = {
    from: emailOut,
    to: email,
    subject: `${isPaid ? 'Booking Confirmation ' : 'Booking Pending for Payment'}(Ref: EIN${bookingId})`,
    html: `
        <h1>${isPaid ? 'Booking Confirmation' : 'Booking Pending for Payment'}</h1>
      <p>Hello, ${name}!</p>
      <p>${isPaid
        ? `Your booking has been confirmed. Here are the details:`
        : `You have almost completed your booking. Please complete the payment to confirm.<br>
        <strong>You have ${cancelTimeText} to pay your booking, otherwise it will be cancelled</strong>`}</p>
      <ul>
        <li><strong>Slot:</strong> ${slot}</li>
        <li><strong>Arrival Date:</strong> ${formattedArrival}</li>
        <li><strong>Arrival Date:</strong> ${formattedDeparture}</li>
        <li><strong>Arrival Time:</strong> ${arrival_time}</li>
        <li><strong>Departure Time:</strong> ${departure_time}</li>
        <li><strong>Total Price:</strong> €${totalPrice}</li>
      </ul>
      <p>Kind Regards</p>
      ${!isPaid
        ? `<p>Click the button below to complete your payment:</p>
           <p><strong>Please, make sure you pay within ${cancelTimeText} to confirm your booking</strong></p>
           <p><a href="${sessionUrl}" style="display: inline-block; padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Pay Now</a></p>
           <p>If the button does not work, you can use the following link:</p>
           <p><a href="${sessionUrl}">${sessionUrl}</a></p>`
        : `<p>Thank you for your payment. Your booking reference is <strong>EIN${bookingId}</strong>.</p>
        <p>Check our website if you need more information on where to find your parking spot in the contact section or check our FAQ section</p>
        <p>Kind regards</p>
        
          `}

    `,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Stripe session URL:', session.url);
      console.log('Email sent:', info.response);
    }
  });

}

async function createBookingAndUserDetails(bookingData, userData, totalPrice) {
  try {

    // Insert the booking data
    const bookingQuery = `
    INSERT INTO parking_bookings(startdate, enddate, slot, "status", created, total_price)
  VALUES($1, $2, $3, 'pending', NOW(), $4)
    RETURNING id;
  `;
    const bookingResult = await db.query(bookingQuery, [...bookingData, totalPrice]);
    const bookingId = bookingResult.rows[0].id; // Extract the booking ID

    // Insert the user booking data
    const userBookingQuery = `
    INSERT INTO user_bookings(
    parking_spot_id, name, email, arrival_date, departure_date,
    arrival_time, departure_time, car_brand, car_color, car_type, license_plate, fk_parking_bookings_id
  )
  VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id;
  `;
    const userBookingResult = await db.query(userBookingQuery, [
      ...userData,
      bookingId  // Pass the correct bookingId here
    ]);

    return {
      bookingId,  // Return the actual booking ID
      userBookingId: userBookingResult.rows[0].id
    };

  } catch (error) {
    throw error;  // Rethrow the error for handling elsewhere
  }
}
async function createSession({ bookingId, email, name, slot, totalPrice, arrival_date, departure_date, arrival_time, departure_time }) {
  try {
    if (!stripe) {
      throw new Error('Stripe is not initialized. Please check the setupStripe function.');
    }
    const { cancel_minutes } = await getEnvVariables()
    console.log("Cancel Duration from DB:", cancel_minutes);
    // Create Stripe session
    // Parse cancel_duration into minutes
    // const durationInMinutes = parseFloat(cancel_minutes);
    // if (isNaN(durationInMinutes) || durationInMinutes <= 0) {
    //   throw new Error("Invalid cancel duration from database.");
    // }
    const query = `select created from parking_bookings where id = $1`
    const result = await db.query(query, [bookingId])
    console.log("ID from the creted from db" + bookingId)
    if (result.rows.length === 0) {
      throw new Error('No data found with the given ID');
    }

    const createdDate = result.rows[0].created;
    console.log("ID given" + bookingId + "Data created from id is" + createdDate)
    // https://docs.stripe.com/payment-links/api
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['ideal']['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: { name: `Payment for Parking Space ref EIN${bookingId} ` },
            unit_amount: Math.round(totalPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `http://localhost:3000/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      // cancel_url: `http://localhost:3000/payment-cancelled?session_id={CHECKOUT_SESSION_ID}`,
      //cancel_url not necessary so far cox if cancelled still link shows payment page(within 2 hours that is still avaliable)
      //and if expired shows pages expired
      //expires_at: Math.floor((new Date(createdDate).getTime() + 30 * 60 * 60 * 1000) / 1000),

      //it expires at 30 min CHANGE TO 2 HOURS IN THE FUTURE
      expires_at: Math.floor((new Date(createdDate).getTime() + cancel_minutes * 60 * 1000) / 1000), // Expire in 30 minutes

      client_reference_id: bookingId,

      //customer_email: email this make email to be in the input payment system

    });



    //https://docs.stripe.com/payments/checkout/managing-limited-inventory#setting-an-expiration-time
    console.log(bookingId + "and slot" + slot)
    // Send email confirmation with payment link
    sendMailConfirmation({
      bookingId,
      email,
      name,
      sessionUrl: session.url,
      slot,
      arrival_date,
      departure_date,
      arrival_time,
      departure_time,
      totalPrice,
    });
    console.log("session id: " + session.id)
    return { sessionUrl: session.url };
  } catch (err) {
    console.error('Error in handlePayment:', err);
    throw new Error('Payment setup failed');
  }
}

//Creates events to clean processes and checks them
//NOT NECESSARY OFR NOW ASTHE EXPIRE SESSION WORKS ON IT OWN
// app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
//   const event = req.body; // Directly use the payload
//   console.log("Received event:", JSON.stringify(event, null, 2));

//   try {
//     if (event.type === 'checkout.session.expired') {
//       const session = event.data.object;
//       const bookingId = session.client_reference_id;
//       console.log(`Session expired for booking ID: ${bookingId}`);

//       // Update your database or handle expired booking
//       const query = `UPDATE parking_bookings SET status = 'expired' WHERE booking_id = $1`;
//       await db.query(query, [bookingId]);

//       res.status(200).send('Event processed');
//     } else {
//       res.status(200).send('Event processed from else');
//     }
//   } catch (err) {
//     console.error('Error processing webhook:', err);
//     res.status(500).send('Internal Server Error');
//   }
// });


// Routes
//GETS THE USER DATA AND CHECKS IF THE'RS AN AVALIABLE SLOT ON SELECTED INPUTS AND DATES
//IF THERE IS A BOOKING PROCEES IS MADE
app.post('/book', async (req, res) => {
  const { arrival_date, departure_date, arrival_time, departure_time, name, email, car_brand, car_color, car_type, license_plate } = req.body;

  try {
    const arrival = new Date(arrival_date);
    const departure = new Date(departure_date);
    const totalDays = Math.ceil((departure - arrival) / (1000 * 60 * 60 * 24)) + 1;
    //AVALIABLE SLOT not FOUND
    const availableSlotResult = await getAvailableSlot(arrival_date, departure_date);
    if (availableSlotResult.rows.length === 0) {
      return res.status(400).json({ message: 'No spots available for the selected dates' });
    }
    //avaliable slot found and save it to calculate total price
    const { slot: availableSlot, base_price, extra_day_price, max_days } = availableSlotResult.rows[0];
    const totalPrice = calculateTotalPrice(totalDays, parseFloat(base_price), parseFloat(extra_day_price), parseInt(max_days, 10));
    //data is saved of the booking and user to insert it into the db
    const bookingData = [`${arrival_date} 00:00:00`, `${departure_date} 23:59:59`, availableSlot];
    const userData = [
      availableSlot, name, email, arrival_date, departure_date, arrival_time, departure_time,
      car_brand, car_color, car_type, license_plate,
    ];
    //calls the function to create a booking and insert users to db by the bookig id
    const { bookingId } = await createBookingAndUserDetails(bookingData, userData, totalPrice);
    console.log("Boking ID" + bookingId)
    console.log(availableSlot)
    //calls a function to make the payment
    const { sessionUrl } = await createSession({
      bookingId,
      email,
      name,
      slot: availableSlot,
      totalPrice,
      arrival_date,
      departure_date,
      arrival_time,
      departure_time,
      isPaid: false
    });
    //mail is sent on the session payment link
    //sendMailConfirmation({ id: bookingId, name, email, arrival_date, departure_date, totalPrice, availableSlot });
    res.json({ bookingId, sessionUrl, parking_spot_id: availableSlot, totalPrice, name });
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
    //I get the minutes from function
    const { cancel_minutes } = await getEnvVariables();
    if (!cancel_minutes) {
      throw new Error('Cancel time not defined or invalid');
    }
    // const query = `
    //   UPDATE parking_bookings
    //   SET "status" = 'cancelled'
    //   WHERE "status" = 'pending'
    //     AND created < NOW() - INTERVAL 2h
    //   RETURNING id;
    // `;
    // const result = await db.query(query);

    //Changed the query to get the time of the booking depending on te value of cancel time in DB
    //link explains the CAST
    //https://neon.tech/postgresql/postgresql-tutorial/postgresql-cast
    const query = `
  UPDATE parking_bookings
  SET "status" = 'cancelled'
  WHERE "status" = 'pending'
    AND created < NOW() - (CAST($1 || ' minutes' AS INTERVAL))
  RETURNING id;
`;
    const result = await db.query(query, [cancel_minutes]);
    console.log("The minutes after pending cancelled are" + cancel_minutes)

    if (result.rows.length > 0) {
      console.log('Cancelled bookings:', result.rows.map(row => row.id));
      res.status(200).json({ message: 'Pending bookings cancelled', cancelledIds: result.rows.map(row => row.id) });
    } else {
      console.log('No pending bookings to cancel.');
      res.status(200).json({ message: 'No pending bookings to cancel' });
    }
  } catch (error) {
    console.error('Error in check-pending:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/payment-success', async (req, res) => {
  const sessionId = req.query.session_id;
  console.log('Session ID received:', sessionId);

  if (!sessionId) {
    return res.status(404).send('Missing session Id');
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).send('Session not found');
    }

    const bookingId = session.client_reference_id;
    console.log("booking id" + bookingId)

    // // Fetch booking details from the database using the booking ID
    const query = `       
     SELECT ub.parking_spot_id, ub.name, ub.email, ub.arrival_date, ub.departure_date, ub.arrival_time,ub.departure_time, ub.fk_parking_bookings_id, pb.total_price, pb.email_sent
  FROM user_bookings ub
  JOIN parking_bookings pb ON pb.id = ub.fk_parking_bookings_id
  WHERE ub.fk_parking_bookings_id = $1
        `;

    const result = await db.query(query, [bookingId]);



    // Actualiza el estado de la reserva en la base de datos
    const update = `UPDATE parking_bookings SET status = 'confirmed' WHERE id = $1`;
    await db.query(update, [bookingId]); // Asegúrate de enviar un ID correcto aquí
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    //const { bookingId, name, sessionUrl, slot, email, arrival_date, departure_date, totalPrice, isPaid } = data;
    const booking = result.rows[0]
    console.log('Booking details from database:', booking);
    if (!booking.email_sent) {
      sendMailConfirmation({
        bookingId: booking.fk_parking_bookings_id,
        name: booking.name,
        slot: booking.parking_spot_id, // Corrected the property name
        email: booking.email,
        arrival_date: booking.arrival_date,
        departure_date: booking.departure_date,
        arrival_time: booking.arrival_time,
        departure_time: booking.departure_time,
        totalPrice: booking.total_price,
        isPaid: true,
      });
      // Update the `email_sent` flag in the database
      const updateQuery = `UPDATE parking_bookings SET email_sent = TRUE WHERE id = $1`;
      await db.query(updateQuery, [bookingId]);
    }
    // Save any data you want to display in the confirmation page in the session
    req.session.confirmationData = {
      name: booking.name,
      bookingId: bookingId,
      totalPrice: booking.total_price,
    };

    // Redirect to a clean URL
    //uses session key to save cookies
    res.redirect('/confirmation');
  } catch (error) {
    console.error('Error retrieving session:', error);
    res.status(500).send('Error retrieving payment session');
  }
});

//NOT NECESSARY FOR NOW AS IT IS NOT NEDED TO HANLD ECANCEL_PAYMENTE
//2H EXPIRE OTHERWISE USER IS ALLOWED TO STILL PAY
//You can also choose to redirect your customers to your website instead of providing a confirmation page. If you redirect your customers to your own confirmation page, you can include {CHECKOUT_SESSION_ID} in the redirect URL to dynamically pass the customer’s current Checkout Session ID. 
// This is helpful if you want to tailor the success message on your website based on the information in the Checkout Session. 
// You can also add UTM codes as parameters in the query string of the payment link URL.
//  The UTM codes are automatically added to your redirect URL when your customer completes a payment.
// app.get('/payment-cancelled', async (req, res) => {

//   const sessionId = req.query.session_id;

//   if (!sessionId) {
//     return res.status(400).json({ error: 'Session ID is missing' });
//   }

//   try {
//     const session = await stripe.checkout.sessions.retrieve(sessionId);

//     if (!session) {
//       return res.status(404).json({ error: 'Session not found' });
//     }

//     const bookingId = session.client_reference_id;

//     // Update the booking status to "cancelled"
//     await db.query('UPDATE parking_bookings SET status = $1 WHERE id = $2', ['cancelled', bookingId]);

//     console.log(`Booking ${bookingId} marked as cancelled.`);

//     return res.status(200).json({ status: 'cancelled', message: 'Payment has been cancelled.' });
//   } catch (error) {
//     console.error('Error handling payment cancellation:', error);
//     return res.status(500).json({ error: 'Failed to handle cancellation' });
//   }

// })
function formatDate(date) {
  //It shows full date which is more user frendly
  const options = { dateStyle: 'full' }
  //It shows DD/MM/YY
  // const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
  return new Intl.DateTimeFormat('en-GB', options).format(new Date(date));
}
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
