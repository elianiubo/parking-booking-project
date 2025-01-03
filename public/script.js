

document.addEventListener("DOMContentLoaded", () => {


  // this make that once i've recieved the confrimation email, and i reload the page it goes to the main page again, to avoid sneding emails again wiht onfirmation
  if (window.performance.getEntriesByType("navigation")[0].type === 'reload') {
    window.location.href = '/';
  }

  // setTimeout(() => {
  //   document.getElementById('confirmation-message').style.display = 'none';
  //   document.getElementById('booking-form').style.display = 'block';
  // }, 5000); // Auto-hide after 5 seconds
  // Check for the "payment=success" query parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('payment') === 'success') {
    // Hide the confirmation message and show the booking form
    document.getElementById('confirmation-message').style.display = 'none';
    document.getElementById('booking-form').style.display = 'block';

    // Clear the query parameter from the URL
    const newUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  }
  const arrivalDateInput = document.getElementById('arrival_date');
  const departureDateInput = document.getElementById('departure_date');
  const submitButton = document.getElementById('submit-btn');
  disablePastDates();  // Disable past dates for arrival date on page load
  updatePage();
  const faqs = document.querySelectorAll(".faq");  // Select all the FAQ items

  faqs.forEach(faq => {
    const arrow = faq.querySelector(".arrow-icon");  // Get the arrow inside the FAQ
    const answer = faq.querySelector(".answer");    // Get the answer inside the FAQ

    // Add click event listener to the entire FAQ element
    faq.addEventListener("click", function () {
      // Toggle the 'active' class on the FAQ container to show/hide the answer
      faq.classList.toggle("active");

      // Rotate the arrow icon
      arrow.classList.toggle("rotate");
    });
  })
  //FAQS text shpows up when clicked and roates icon

  // const faqs = document.querySelectorAll(".faq");

  // // Add a click event listener to each FAQ container
  // faqs.forEach(faq => {
  //   const question = faq.querySelector(".question"); // The clickable question section
  //   const answerDiv = faq.querySelector(".answer"); // The corresponding answer section
  //   const arrowIcon = faq.querySelector(".arrow-icon"); // The arrow icon

  //   question.addEventListener("click", () => {
  //     // Toggle visibility of the answer
  //     if (answerDiv.style.display === "none" || answerDiv.style.display === "") {
  //       answerDiv.style.display = "block";
  //     } else {
  //       answerDiv.style.display = "none";
  //     }

  //     // Toggle rotation of the arrow icon
  //     arrowIcon.classList.toggle("rotate");
  //   });
  // });

  // I save this variables in local so ig¡f page reloads are saved and user can reuse them

  // document.getElementById("booking-form").addEventListener('submit', () => {

  //   const arrivDate = arrivalDateInput.value;
  //   const depDate = departureDateInput.value;
  //   const totalPrice = totalPriceElement.textContent;

  //   localStorage.setItem('arrivalDate', arrivDate);
  //   localStorage.setItem('departureDate', depDate);
  //   localStorage.setItem('totalPrice', totalPrice);

  // })

  // makes the button to make a new buttin go to main page
  // document.getElementById('new-booking-btn')?.addEventListener('click', () => {
  //   window.location.href = '/'; // Redirect to the main page

  // });

  const mybutton = document.getElementById("top-btn");
  window.onscroll = function () { scrollFunction() };
  function scrollFunction() {
    if (document.body.scrollTop > 600 || document.documentElement.scrollTop > 600) {
      mybutton.style.display = "block";
    } else {
      mybutton.style.display = "none";
    }
  }
  mybutton.addEventListener('click', () => {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
  })
  // Create the span element for total price dynamically
  function disablePastDates() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0
    const yyyy = today.getFullYear();
    const formattedToday = `${yyyy}-${mm}-${dd}`;

    if (arrivalDateInput) {
      arrivalDateInput.setAttribute("min", formattedToday);
    }
  }
  //SHows error when function is called the message is writtten 
  //in when the function is called to a nother function
  function showErrors(element, message) {
    if (message) {
      element.style.display = 'block'; // Show the error message
      element.innerText = message;
    } else {
      element.style.display = 'none'; // Hide the error message
    }

  }

  function showTotalDays(arrivDate, depDate) {
    const arriv = new Date(arrivDate);
    const dep = new Date(depDate);

    if (isNaN(arriv) || isNaN(dep)) {
      console.error("Invalid dates provided to showTotalDays:", arrivDate, depDate);
      return 0; // Return 0 if dates are invalid
    }

    // Calculate the difference in time between the two dates
    let differenceInTime = dep - arriv;

    // Calculate the number of days between the two dates
    let differenceInDays = Math.round(differenceInTime / (1000 * 3600 * 24) + 1);

    console.log(`Total days: ${differenceInDays}`);
    return differenceInDays;



  }
  //VAlidate input formatiing
  function validateForm() {
    let isValid = true;

    // Name validation
    const nameInput = document.getElementById("name");
    const nameError = document.getElementById("name-error");

    if (/\d/.test(nameInput.value)) {
      showErrors(nameError, "Name isn't correct");
      isValid = false; // Invalid name
    }

    // Email validation
    const emailInput = document.getElementById("email");
    const emailError = document.getElementById("email-error");
    // Check whether it has an email format
    if (!emailInput.value.trim()) {
      showErrors(emailError, "Email is required");
      isValid = false; // Invalid email
    } else if (!/^\S+@\S+\.\S+$/.test(emailInput.value)) {
      showErrors(emailError, "Please enter a valid email address");
      isValid = false; // Invalid email
    } else {
      showErrors(emailError, ''); // Clear error
    }

    // Validate arrival and departure time
    const arrivalTimeInput = document.getElementById("arrival_time").value;
    const departureTimeInput = document.getElementById("departure_time").value;
    const departureError = document.getElementById("departure-error");

    const arrivalDate = arrivalDateInput.value;
    const departureDate = departureDateInput.value;

    // Create valid Date objects for arrival and departure
    const arrivalDateTimeString = `${arrivalDate}T${arrivalTimeInput}:00`; // Combining date and time
    const departureDateTimeString = `${departureDate}T${departureTimeInput}:00`;

    const arrivalDateTimeFormat = new Date(arrivalDateTimeString);
    const departureDateTimeFormat = new Date(departureDateTimeString);

    // If arrival date and departure date are on the same day (one-day parking only), show error message
    if (arrivalDate === departureDate) {
      // Show error message if departure time is earlier than or the same as arrival time on the same day
      if (departureDateTimeFormat <= arrivalDateTimeFormat) {
        showErrors(departureError, "Departure time can't be before or the same as the arrival time");
        isValid = false; // Invalid departure time
      } else {
        showErrors(departureError, "");
      }
    }

    // Car brand values validation
    const brandInput = document.getElementById("car_brand");
    const brandError = document.getElementById("brand-error");
    // Car color values validation
    const colorInput = document.getElementById("car_color");
    const colorError = document.getElementById("color-error");
    // Car type values validation
    const typeInput = document.getElementById("car_type");
    const typeError = document.getElementById("type-error");

    if (/\d/.test(brandInput.value)) {
      showErrors(brandError, "Car brand isn't correct");
      isValid = false; // Invalid car brand
    }
    if (/\d/.test(colorInput.value)) {
      showErrors(colorError, "Car color isn't correct");
      isValid = false; // Invalid car color
    }
    if (/\d/.test(typeInput.value)) {
      showErrors(typeError, "Car type isn't correct");
      isValid = false; // Invalid car type
    }

    return isValid;
  }

  // Listen for the form submit event
  const form = document.querySelector("form");
  form.addEventListener("submit", (event) => {
    // Validate the form before submitting
    if (!validateForm()) {
      event.preventDefault(); // Prevent form submission if the form is invalid
      return false;
    }
  });
  //checks avaliability of parking slots when selected
  async function checkAvailability() {
    const arrivDate = arrivalDateInput.value;
    const depDate = departureDateInput.value;
    const selectedDates = document.getElementById("Selected-dates");
    const priceDisplay = document.getElementById("price-display");
    const daysDisplay = document.getElementById("days-display");

    // Reset price and days display initially
    selectedDates.textContent = ""; // Clear any previous messages
    priceDisplay.textContent = "Total Price € 0"; // Ensure the initial text is correct
    daysDisplay.textContent = "Total days reserved: 0"; // Ensure the initial days display is correct
    submitButton.disabled = true; // Disable submit button by default

    console.log("Arrival Date:", arrivDate, "Departure Date:", depDate);

    // Ensure departure date is after arrival date by setting the min value for departure
    if (arrivDate) {
      departureDateInput.setAttribute("min", arrivDate); // Prevent earlier dates for departure
    }

    // If both dates are selected, check if departure is before arrival
    if (arrivDate && depDate) {
      if (depDate < arrivDate) {
        departureDateInput.value = ""; // Clear invalid departure date
        priceDisplay.textContent = "Total Price € 0"; // Reset the price display
        daysDisplay.textContent = "Total days reserved: 0"; // Reset days display
        submitButton.disabled = true; // Disable submit button
        priceDisplay.style.color = '#555'; // Reset the price display
        departureDateInput.setAttribute("min", arrivDate); // Ensure departure date can't be before arrival date
        return; // Exit early
      }
    }

    // Proceed only if both arrival and departure dates are valid and selected
    if (!arrivDate || !depDate) {
      priceDisplay.textContent = "Total Price € 0"; // Reset the price display
      daysDisplay.textContent = "Total days reserved: 0"; // Reset days display
      submitButton.disabled = true; // Disable submit button
      return; // Exit early
    }

    try {
      // Call the endpoint to check availability
      const response = await fetch("/check-availability", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arrival_date: arrivDate, departure_date: depDate })
      });

      const result = await response.json();

      if (result.available) {
        const totalDays = showTotalDays(arrivDate, depDate); // Calculate total days
        priceDisplay.style.color = ""
        priceDisplay.textContent = `Total Price € ${result.totalPrice}`; // Update the price display
        daysDisplay.textContent = `Total days reserved: ${totalDays}`; // Update the days display
        submitButton.disabled = false; // Enable the submit button

      } else {
        // If dates are not available
        selectedDates.textContent =
        "Selected dates are not available. Please choose different dates."; // Show error in selected-dates
        priceDisplay.textContent = "";
        daysDisplay.textContent = ""; // Reset the days display
        priceDisplay.style.color = "red"; // Change color to red for error
        submitButton.disabled = true; // Disable submit button
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      priceDisplay.textContent = "Error checking availability"; // Show error message
      daysDisplay.textContent = "Total days reserved: 0"; // Reset the days display
      priceDisplay.style.color = "red"; // Change color to red for error
      submitButton.disabled = true; // Disable submit button
    }
    // Ensure text wraps and does not overflow
    priceDisplay.style.whiteSpace = "normal"; // Allow wrapping
    priceDisplay.style.wordWrap = "break-word"; // Break long text properly
    priceDisplay.style.overflowWrap = "break-word"; // Modern text wrapping
    priceDisplay.style.textAlign = "center";
  }
  //developing a confirmation booking UI response after submitting form
  document.getElementById('booking-form').addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent default form submission

    // Collect the form data
    if (validateForm()) {
      const formData = {
        arrival_date: document.getElementById('arrival_date').value,
        departure_date: document.getElementById('departure_date').value,
        arrival_time: document.getElementById('arrival_time').value,
        departure_time: document.getElementById('departure_time').value,
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        car_brand: document.getElementById('car_brand').value,
        car_color: document.getElementById('car_color').value,
        car_type: document.getElementById('car_type').value,
        license_plate: document.getElementById('license_plate').value
      };

      try {
        const response = await fetch("/book", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        const result = await response.json();

        // Check if response contains bookingId
        if (result.bookingId) {
          // Hide the booking form and show confirmation
          document.getElementById('booking-form').style.display = 'none';
          document.getElementById('confirmation-message').style.display = 'block';

          // Show the confirmation message
          document.getElementById("confirmation-text").innerHTML = `
          <h3 class="h3-confirm">Thank you for your booking, <span class="name">${result.name}</span></h3>
          <div class="para-confirmed-div">
            <p>You have received an email with your booking details and instructions on how to proceed.</p>
            <p>The booking payment procees will be opened for 30 min</p>
            <p>Your will recieve a confirmation email once the payment is completed</p>
            <p>Booking REF: <span>EIN${result.bookingId}</span></p>
            <p>Total € <span>${result.totalPrice}</span></p>
          </div>
        `;
        } else {
          console.error('Booking failed:', result.message);
          alert('Booking failed: ' + result.message);
        }
        document.getElementById('form-box').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (error) {
        console.error('Error submitting form:', error);
        alert('An error occurred while processing your booking.');
      } finally {
        submitButton.disabled = false; // Re-enable the button
      }
    } else {
      console.log("Form validation failed, submission prevented.");
    }

  });
  // Function to handle successful payment
  async function handlePaymentSuccess(sessionId) {
    try {
      const response = await fetch(`/payment-success?session_id=${sessionId}`);
      if (response.ok) {
        const result = await response.text();

        // Clear the confirmation message and redisplay the booking form
        document.getElementById('confirmation-message').style.display = 'none';
        document.getElementById('booking-form').style.display = 'block';
        document.getElementById('booking-form').reset(); // Reset the form

        // Optionally, display a success message
        alert('Payment successful! You can now make another booking.');
      } else {
        console.error('Failed to process payment:', await response.text());
        alert('Failed to process payment. Please try again.');
      }
    } catch (error) {
      console.error('Error handling payment success:', error);
      alert('An error occurred while handling the payment. Please try again.');
    }
  }







  //chanckes the pending status on rout /check-pending everytime user loads the page
  async function updatePage() {


    try {
      const response = await fetch('/check-pending', { method: 'POST' });
      const result = await response.json();

      if (result.pending) {
        console.log('Pending bookings were found and cancelled:', result.cancelledBookings);
      } else {
        console.log('No pending bookings to cancel.');
      }
    } catch (error) {
      console.error('Error checking pending bookings:', error);
    }
  }

  // Add event listeners to check availability when the dates are changed
  arrivalDateInput.addEventListener('change', checkAvailability);
  departureDateInput.addEventListener('change', checkAvailability);

  //SHow question mark or hide it 
  const questionMark = document.getElementById('question-mark');
  const questionDiv = document.getElementById('question-div');

  questionMark.addEventListener('mouseover', () => {
    questionDiv.style.display = 'block'; // Show the explanation text
  });

  questionMark.addEventListener('mouseleave', () => {
    questionDiv.style.display = 'none'; // Hide the explanation text when mouse leaves
  });


  // const savedArrivalDate = localStorage.getItem('arrivalDate');
  // const savedDepartureDate = localStorage.getItem('departureDate');
  // const savedTotalPrice = localStorage.getItem('totalPrice');

  // if (savedArrivalDate) {
  //   arrivalDateInput.value = savedArrivalDate;
  // }
  // if (savedDepartureDate) {
  //   departureDateInput.value = savedDepartureDate;
  // }
  // if (savedTotalPrice) {
  //   totalPriceElement.textContent = savedTotalPrice;
  //   document.getElementById('price-display').textContent = `Total Price: EUR ${ savedTotalPrice } `;
  // }     // Run any other updates like checking pending bookings
});