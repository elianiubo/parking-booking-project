

document.addEventListener("DOMContentLoaded", () => {



  const arrivalDateInput = document.getElementById('arrival_date');
  const departureDateInput = document.getElementById('departure_date');
  const submitButton = document.getElementById('submit-btn');
  const priceDisplay = document.getElementById("price-display");
  if (!priceDisplay) {
    console.error("Element with ID 'price-display' not found.");
    return;
  }
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
  const span = document.createElement("span");
  span.id = "total-price";
  span.textContent = "0"; // Default price
  priceDisplay.appendChild(span);
  console.log("Dynamic span created and appended to #price-display.");

  //checks avaliability of parking slots when selected
  async function checkAvailability() {
    const arrivDate = arrivalDateInput.value;
    const depDate = departureDateInput.value;


    console.log("Arrival Date:", arrivDate, "Departure Date:", depDate);
    // Ensure departure date is after arrival date by setting the min value for departure
    if (arrivDate) {
      departureDateInput.setAttribute("min", arrivDate); // Disable dates before arrival date
    }

    //If both dates are selected
    if (arrivDate && depDate) {
      // if departure date is smaller tha arrival date ex arriv 10-12-24 and dep 09-12-24
      //should run this code to fix this issue
      if (depDate < arrivDate) {
        departureDateInput.value = ""; // Clear invalid departure date
        span.textContent = "0"; // Reset total price

        priceDisplay.innerHTML = "Total Price: EUR 0"; // Inform the user
        submitButton.disabled = true; // Disable submit button
        departureDateInput.setAttribute("min", arrivDate);
        return; // Exit early
      }
    }
    // Proceed only if both arrival and departure dates are valid and selected
    if (!arrivDate || !depDate) {
      span.textContent = "0";
      //priceDisplay.textContent = "Please select both arrival and departure dates.";
      submitButton.disabled = true;
      return; // Exit early
    }
    //calls endpots and get response of avaliability
    try {
      const response = await fetch("/check-availability", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arrival_date: arrivDate, departure_date: depDate, totalPrice: span })
      });

      const result = await response.json();
      if (result.available) {
        //console.log(totalPrice)
        //Clear dates not avaliable
        //priceDisplay.textContent = "Total Price: EUR "; // Reset the main content
        priceDisplay.appendChild(span);
        submitButton.disabled = false; // Enable button if dates are available
        span.textContent = ` ${result.totalPrice}`;

      } else {
        priceDisplay.textContent = "Selected dates are not available. Please choose different dates.";
        span.textContent = '0';  // Reset total price when dates aren't available
        submitButton.disabled = true; // Disable button if dates are not available
        priceDisplay.style.color = 'red';
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      submitButton.disabled = true;
      span.textContent = '0';
      priceDisplay.textContent = "<p>Error checking availability.</p>"
    }
  }
  // function showCongratsMessage() {
  //   let div = document.getElementById("payment-process")
  //   let form = document.getElementById("booking-form")
  //   div.removeAttribute("hidden")
  //   form.setAttribute("hidden", false)
  // };

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
  //  else {
  //   errorElement.textContent = '';
  //   errorElement.style.display = 'none';
  // }


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
    const arrivalDateTimeFormat = new Date(`${arrivalDateInput.value}T${arrivalTimeInput}`);
    const departureDateTimeFormat = new Date(`${departureDateInput.value}T${departureTimeInput}`);
    //if arrival date and departure date are on the same day(one day parking only) show error message
    if (arrivalDateInput.value === departureDateInput.value) {
      //shoe error message if arrival date is later than dep date on same day parking
      if (departureDateTimeFormat <= arrivalDateTimeFormat) {
        showErrors(departureError, "Departure time can't be before arrival time");
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
  function disablePastDates() {

    //e.prevendDefault() if i put it doesn't bclokck past dates
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0
    const yyyy = today.getFullYear();

    const formattedToday = `${yyyy}-${mm}-${dd}`;

    // Disable past dates for arrival
    arrivalDateInput.setAttribute("min", formattedToday);
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
  document.getElementById('booking-form').addEventListener('submit', function (e) {
    e.preventDefault(); // Prevent form submission

    if (validateForm()) {
      // If the form is valid, you can proceed with the form submission
      this.submit(); // Proceed to submit the form if valid
    }
  });

  // submitButton.addEventListener("click", showCongratsMessage)
  window.addEventListener('load', () => {
    disablePastDates();  // Disable past dates for arrival date on page load
    updatePage();

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
  //   document.getElementById('price-display').textContent = `Total Price: EUR ${savedTotalPrice}`;
  // }     // Run any other updates like checking pending bookings
});