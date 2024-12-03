

document.addEventListener("DOMContentLoaded", () => {



  const arrivalDateInput = document.getElementById('arrival_date');
  const departureDateInput = document.getElementById('departure_date');
  const totalPriceElement = document.getElementById('total-price');
  const submitButton = document.getElementById('submit-btn');
  // const availabilityMessage = document.createElement("p");
  // availabilityMessage.id = "availabilityMessage";
  //document.getElementById("booking-form").appendChild(availabilityMessage);

  // I save this variables in local so ig¡f page reloads are saved and user can reuse them
  
  // document.getElementById("booking-form").addEventListener('submit', () => {

  //   const arrivDate = arrivalDateInput.value;
  //   const depDate = departureDateInput.value;
  //   const totalPrice = totalPriceElement.textContent;

  //   localStorage.setItem('arrivalDate', arrivDate);
  //   localStorage.setItem('departureDate', depDate);
  //   localStorage.setItem('totalPrice', totalPrice);

  // })


  window.addEventListener('load', () => {
    // Restore form state

  });

  async function checkAvailability(e) {
    const arrivDate = arrivalDateInput.value;
    const depDate = departureDateInput.value;
    let priceDisplay = document.getElementById("price-display");
    //e.prevendDefault() if i put it doesn't show total price

    // Ensure departure date is after arrival date by setting the min value for departure
    if (arrivDate) {
      departureDateInput.setAttribute("min", arrivDate); // Disable dates before arrival date
    }
    if (!arrivDate || !depDate) {
      // priceDisplay.textContent = '';
      //totalPriceElement.textContent = '0';
      //availabilityMessage.innerHTML = '<p>Please select both arrival and departure dates.</p>';
      submitButton.disabled = false;
      return;
    }
    try {
      const response = await fetch("/check-availability", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arrival_date: arrivDate, departure_date: depDate, totalPrice: totalPriceElement })
      });

      const result = await response.json();
      if (result.available) {
        //console.log(totalPrice)
        //Clear dates not avaliable
        priceDisplay.textContent = `Total Price: EUR ${result.totalPrice}`;
        submitButton.disabled = false; // Enable button if dates are available
        totalPriceElement.textContent = `${result.totalPrice}`;
        //priceDisplay.textContent = '';
        //availabilityMessage.innerHTML = "<p>Dates are available!</p>";
        // totalPriceElement.innerHTML = `${result.totalPrice}`;


        //e.prevendDefault()

      } else {
        priceDisplay.textContent = "Selected dates are not available. Please choose different dates.";
        totalPriceElement.textContent = '0';  // Reset total price when dates aren't available
        submitButton.disabled = true; // Disable button if dates are not available
        // availabilityMessage.innerHTML = "<p>Selected dates are not available. Please choose different dates.</p>";
        // totalPriceElement.textContent = "0"
        //  availabilityMessage.appendChild(document.createTextNode("Selected dates are not available. Please choose different dates"))
        // let text = availabilityMessage.textContent;
        //  console.log("text:", text);
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      submitButton.disabled = true;
      totalPriceElement.textContent = '0';
      priceDisplay.textContent = "<p>Error checking availability.</p>";
      //totalPriceElement.textContent = "0";
    }
  }
  // function showCongratsMessage() {
  //   let div = document.getElementById("payment-process")
  //   let form = document.getElementById("booking-form")
  //   div.removeAttribute("hidden")
  //   form.setAttribute("hidden", false)
  // }
  function disablePastDates(e) {

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
  // submitButton.addEventListener("click", showCongratsMessage)
  window.addEventListener('load', () => {
    disablePastDates();  // Disable past dates for arrival date on page load
    updatePage();
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
})