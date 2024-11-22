

document.addEventListener("DOMContentLoaded", () => {


  const arrivalDateInput = document.getElementById('arrival_date');
  const departureDateInput = document.getElementById('departure_date');
  const submitButton = document.getElementById('submit-btn');
  const availabilityMessage = document.createElement("p");
availabilityMessage.id = "availabilityMessage";
document.getElementById("booking-form").appendChild(availabilityMessage);

  // Función para mostrar las fechas seleccionadas

  async function checkAvailability() {
    const arrivDate = arrivalDateInput.value;
    const depDate = departureDateInput.value;

    availabilityMessage.textContent = 'Checking availability...';

    if (!arrivDate || !depDate) {
      availabilityMessage.textContent = 'Please select both arrival and departure dates.';
      submitButton.disabled = true;
      return;
    }

    try {
      const response = await fetch("/check-availability", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arrival_date: arrivDate, departure_date: depDate })
      });

      const result = await response.json();
      if (result.available) {
        submitButton.disabled = false; // Enable button if dates are available
        availabilityMessage.innerHTML = '<p>Dates are available!</p>';
      } else {
        submitButton.disabled = true; // Disable button if dates are not available
        availabilityMessage.innerHTML = '<p>Selected dates are not available. Please choose different dates.</p>';
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      submitButton.disabled = true;
      availabilityMessage.innerHTML = '<p>Error checking availability.</p>';
    }
  }
  

  // Add event listeners to check availability when the dates are changed
  arrivalDateInput.addEventListener('change', checkAvailability);
  departureDateInput.addEventListener('change', checkAvailability);

  // function showDateisSelected() {
  //   const arrivDate = arrivalDateInput.value; // Obtén el valor del input de llegada
  //   const depDate = departureDateInput.value; // Obtén el valor del input de salida
  //   if (arrivDate) {
  //     console.log("Fecha de llegada:", arrivDate);
  //     let text = document.createTextNode("Justadded")
  //     paragraph.appendChild(text);

  //   } else if (depDate) {
  //     console.log("Fecha de salida:", depDate);
  //   }


  // }


  // function dateSelected(){
  //   let dateObj = new Date(arrivalDateInput)

  //     console.log("dates not empty")

  // }
  //  arrivalDateInput.addEventListener("change", dateSelected)
  //  departureDateInput.addEventListener("change", dateSelected)
  // const totalPriceDisplay = document.getElementById('total-price');

  // // Función para calcular el precio
  // function calculateTotalPrice() {
  //   const arrivalDate = new Date(arrivalDateInput.value);
  //   const departureDate = new Date(departureDateInput.value);

  //   // Verifica que ambas fechas sean válidas
  //   if (!isNaN(arrivalDate) && !isNaN(departureDate)) {
  //     // Calcula la diferencia en días
  //     const timeDiff = departureDate - arrivalDate;
  //     const days = Math.ceil(timeDiff / (1000 * 60 * 60 * 24)); // Convertir ms a días

  //     // Verifica que las fechas sean coherentes
  //     if (days > 0) {
  //       const totalPrice = days * pricePerDay;
  //       totalPriceDisplay.textContent = totalPrice; // Actualiza el precio en el formulario
  //     } else {
  //       totalPriceDisplay.textContent = "0"; // Si las fechas no son coherentes
  //     }
  //   } else {
  //     totalPriceDisplay.textContent = "0"; // Si las fechas no están completas
  //   }
  // }

  // // Escucha cambios en los campos de fecha
  // arrivalDateInput.addEventListener('change', calculateTotalPrice);
  // departureDateInput.addEventListener('change', calculateTotalPrice);

  // console.log("Script Loaded Successfully!");
  // form.addEventListener("submit", async function (event) {
  //   event.preventDefault();

  //   const formData = new FormData(form);
  //   const data = {
  //     name: formData.get("name"),
  //     email: formData.get("email"),
  //     arrival_date: formData.get("arrival_date"),
  //     departure_date: formData.get("departure_date"),
  //     arrival_time: formData.get("arrival_time"),
  //     departure_time: formData.get("departure_time"),
  //   };

  //   try {
  //     const response = await fetch("/check-availability", {
  //       method: "POST",
  //       body: JSON.stringify(data),
  //       headers: {
  //         "Content-Type": "application/json"
  //       }
  //     });

  //     const result = await response.json();
  //     if (response.ok) {
  //       // If available slots are returned, display them to the user
  //       console.log(result.availableSlots);
  //       // Show the available slots in the UI and ask the user to select one
  //       displayAvailableSlots(result.availableSlots);
  //     } else {
  //       // If no available spots, show an error message
  //       alert(result.message);
  //     }
  //   } catch (error) {
  //     console.error('Error:', error);
  //   }
  // });

  // // Function to display available slots
  // function displayAvailableSlots(slots) {
  //   const slotsContainer = document.getElementById("available-slots");
  //   slotsContainer.innerHTML = "";  // Clear any previous results

  //   slots.forEach(slot => {
  //     const slotElement = document.createElement("div");
  //     slotElement.innerText = `Slot: ${slot.slot}`;
  //     // When the user selects a slot, trigger booking
  //     slotElement.addEventListener("click", () => {
  //       bookSpot(slot.slot);  // Call function to book the selected slot
  //     });
  //     slotsContainer.appendChild(slotElement);
  //   });
  // }
  //   async function bookSpot(slot) {
  //     const formData = new FormData(form);
  //     const data = {
  //       name: formData.get("name"),
  //       email: formData.get("email"),
  //       arrival_date: formData.get("arrival_date"),
  //       departure_date: formData.get("departure_date"),
  //       arrival_time: formData.get("arrival_time"),
  //       departure_time: formData.get("departure_time"),
  //       parking_spot_id: slot,  // The selected slot ID
  //       car_brand: formData.get("car_brand"),
  //       car_color: formData.get("car_color"),
  //       car_type: formData.get("car_type"),
  //       license_plate: formData.get("license_plate")
  //     };

  //     try {
  //       const response = await fetch("/book", {
  //         method: "POST",
  //         body: JSON.stringify(data),
  //         headers: {
  //           "Content-Type": "application/json"
  //         }
  //       });

  //       const result = await response.json();
  //       if (response.ok) {
  //         // Display booking success message
  //         alert(result.message);
  //       } else {
  //         // Handle booking error (e.g., if the spot was booked during the check)
  //         alert(result.message);
  //       }
  //     } catch (error) {
  //       console.error('Error:', error);
  //     }
  // }
  // document.getElementById('booking-form').addEventListener('submit', function (event) {
  //   const arrivalDate = new Date(document.getElementById('arrival_date').value);
  //   const departureDate = new Date(document.getElementById('departure_date').value);
  //   const arrivalTime = document.getElementById('arrival_time').value;
  //   const departureTime = document.getElementById('departure_time').value;

  //   const errorMessage = document.getElementById('error-message');
  //   errorMessage.textContent = '';

  //   if (departureDate < arrivalDate || (departureDate.getTime() === arrivalDate.getTime() && departureTime <= arrivalTime)) {
  //     errorMessage.textContent = 'Departure date and time must be after arrival date and time.';
  //     event.preventDefault();
  //   }

  //   const days = (departureDate - arrivalDate) / (1000 * 60 * 60 * 24) + 1; // At least 1 day
  //   document.getElementById('total-price').textContent = (days * 10).toFixed(2);

  //   console.log("Arrival Date: ", arrivalDate);
  //   console.log("Departure Date: ", departureDate);
  //   console.log("Total Price: ", document.getElementById('total-price').textContent);

  // });
})