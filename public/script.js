

document.addEventListener("DOMContentLoaded", () => {



  const arrivalDateInput = document.getElementById('arrival_date');
  const departureDateInput = document.getElementById('departure_date');
  const submitButton = document.getElementById('submit-btn');
  disablePastDates();  // Disable past dates for arrival date on page load
  updatePage();
  // I save this variables in local so ig¡f page reloads are saved and user can reuse them

  // document.getElementById("booking-form").addEventListener('submit', () => {

  //   const arrivDate = arrivalDateInput.value;
  //   const depDate = departureDateInput.value;
  //   const totalPrice = totalPriceElement.textContent;

  //   localStorage.setItem('arrivalDate', arrivDate);
  //   localStorage.setItem('departureDate', depDate);
  //   localStorage.setItem('totalPrice', totalPrice);

  // })
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
  function showErrors(errorElement, message) {
    if (errorElement) {
      errorElement.textContent = message;
      if (message) {
        errorElement.style.display = 'block'; // Show error message
      } else {
        errorElement.style.display = 'none'; // Hide error message
      }
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

    //name validation
    const nameInput = document.getElementById("name");
    const nameError = document.getElementById("name-error");

    if (/\d/.test(nameInput.value)) {
      showErrors(nameError, "Name isn't correct")
    }


    // Email validation
    const emailInput = document.getElementById("email");
    const emailError = document.getElementById("email-error");
    //checks whether it has an email format
    if (!emailInput.value.trim()) {
      showErrors(emailError, "Email is required");
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(emailInput.value)) {
      showErrors(emailError, "Please enter a valid email address");
      isValid = false;
    } else {
      showErrors(emailError, ''); // Clear error
    }

    //validate arriv and dep time
    const arrivalTimeInput = document.getElementById("arrival_time").value
    const departureTimeInput = document.getElementById("departure_time").value
    const departureError = document.getElementById("departure-error");
    //it saved the format of date and time to check 
    const arrivalDateTimeFormat = new Date(`${arrivalDateInput.value}T${arrivalTimeInput} `);
    const departureDateTimeFormat = new Date(`${departureDateInput.value}T${departureTimeInput} `);
    //if arrival date and departure date are on the same day(one day parking only) show error message
    if (arrivalDateInput.value === departureDateInput.value) {
      //shoe error message if arrival date is later than dep date on same day parking
      if (departureDateTimeFormat <= arrivalDateTimeFormat) {
        showErrors(departureError, "Departure time can't be before or the same as the arrival time");
        isValid = false;

      } else {
        showErrors(departureError, "");
        isValid = false;
      }


    }

    //car brand values
    const brandInput = document.getElementById("car_brand");
    const brandError = document.getElementById("brand-error");
    // car color values
    const colorInput = document.getElementById("car_color");
    const colorError = document.getElementById("color-error");
    // car color values
    const typeInput = document.getElementById("car_type");
    const typeError = document.getElementById("type-error");

    if (/\d/.test(brandInput.value)) {
      showErrors(brandError, "Car brand isn't correct")
    }
    if (/\d/.test(colorInput.value)) {
      showErrors(colorError, "Car color isn't correct")
    }
    if (/\d/.test(typeInput.value)) {
      showErrors(typeError, "Car type isn't correct")
    }
  }
  //checks avaliability of parking slots when selected
  async function checkAvailability() {
    const arrivDate = arrivalDateInput.value;
    const depDate = departureDateInput.value;

    const priceDisplay = document.getElementById("price-display");
    const daysDisplay = document.getElementById("days-display");

    // Reset price and days display initially
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
        priceDisplay.textContent = "Selected dates are not available. Please choose different dates.";
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
  }
  //developing a confirmation booking UI response after submitting form
  document.getElementById('booking-form').addEventListener('submit', async function (event) {
    event.preventDefault(); // Prevent default form submission

    // Collect the form data
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
          <h3 class="h3-confirm">Congratulations <span>${result.name}</span></h3>
          <div class="para-confirmed-div">
            <p>Your booking was successful!</p>
            <p>You have received an email with your booking details and instructions on how to proceed.</p>
            <p>The booking payment procees will be opened for 30 min</p>
            <p>Booking REF: <span>EIN${result.bookingId}</span></p>
            <p>Total Price € <span>${result.totalPrice}</span></p>
          </div>
        `;
      } else {
        console.error('Booking failed:', result.message);
        alert('Booking failed: ' + result.message);
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred while processing your booking.');
    }
  });



  


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
  document.getElementById('booking-form').addEventListener('submit', function (e) {
    e.preventDefault(); // Prevent form submission

    if (validateForm()) {
      // If the form is valid, you can proceed with the form submission
      this.submit(); // Proceed to submit the form if valid
    }
  });
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