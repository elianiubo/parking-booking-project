document.getElementById('booking-form').addEventListener('submit', function (event) {
    const arrivalDate = new Date(document.getElementById('arrival_date').value);
    const departureDate = new Date(document.getElementById('departure_date').value);
    const arrivalTime = document.getElementById('arrival_time').value;
    const departureTime = document.getElementById('departure_time').value;
  
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = '';
  
    if (departureDate < arrivalDate || (departureDate.getTime() === arrivalDate.getTime() && departureTime <= arrivalTime)) {
      errorMessage.textContent = 'Departure date and time must be after arrival date and time.';
      event.preventDefault();
    }
  
    const days = (departureDate - arrivalDate) / (1000 * 60 * 60 * 24) + 1; // At least 1 day
    document.getElementById('total-price').textContent = (days * 10).toFixed(2);
  });
  