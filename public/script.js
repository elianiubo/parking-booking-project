
document.addEventListener("DOMContentLoaded", () => {
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