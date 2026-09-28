/* Front-end enquiry preview. A configured WhatsApp handoff is optional. */
(() => {
  'use strict';
  const form = document.querySelector('#enquiry-form');
  if (!form) return;
  const result = document.querySelector('#enquiry-result');
  const vehicle = document.querySelector('#vehicle');
  const config = window.MPILO_CONFIG || {};
  const number = typeof config.whatsappNumber === 'string' ? config.whatsappNumber : '';
  const whatsappEnabled = /^[1-9]\d{7,14}$/.test(number);
  const cars = window.MPILO_VEHICLES || [];
  const photoEnquiry = window.MPILO_ENQUIRY_PHOTOS?.create(document.querySelector('#enquiry-photo'));
  const photoAction = document.querySelector('#whatsapp-photo-enquiry');
  photoEnquiry?.bindAction(photoAction);
  const selection = document.querySelector('#selected-vehicle');
  let enquiry = '';
  let suggestedMessage = '';
  const chosenCar = () => cars.find(car => car.name === vehicle.value) || null;
  const selectedVehicle = new URLSearchParams(window.location.search).get('vehicle');
  if ([...vehicle.options].some(option => option.value === selectedVehicle)) {
    vehicle.value = selectedVehicle;
  }

  function updateSelection() {
    const car = chosenCar();
    const message = document.querySelector('#message');
    const nextMessage = car ? 'Hello, I’m interested in the ' + car.year + ' ' + car.name + '. Please tell me more about this car.' : '';
    // Keep a visitor's own wording; update only untouched suggested messages.
    if (!message.value.trim() || message.value === suggestedMessage) message.value = nextMessage;
    suggestedMessage = nextMessage;
    selection.hidden = !car;
    photoEnquiry?.setVehicle(null);
    if (car) {
      const image = document.querySelector('#selected-vehicle-image');
      image.src = 'assets/' + car.image;
      image.alt = car.name + ' — selected enquiry photograph';
      document.querySelector('#selected-vehicle-name').textContent = car.name;
      document.querySelector('#selected-vehicle-meta').textContent = car.year + ' · ' + car.trim;
    }
  }
  vehicle.addEventListener('change', updateSelection);
  updateSelection();

  if (whatsappEnabled) {
    document.querySelector('#form-note').textContent = 'Review your enquiry, then continue to WhatsApp. You choose when to send it. Nothing is stored on this website.';
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    // Reject whitespace-only text as well as native invalid fields.
    const name = document.querySelector('#full-name');
    const message = document.querySelector('#message');
    name.setCustomValidity(name.value.trim().length < 2 ? 'Please enter your name.' : '');
    message.setCustomValidity(message.value.trim().length < 10 ? 'Please write a message of at least 10 characters.' : '');
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const car = chosenCar();
    enquiry = [
      'Hello ' + (config.dealershipName || 'MPILO AUTO WORLD HUB LIMITED') + ',',
      '',
      'Name: ' + String(data.get('name')).trim(),
      ...(String(data.get('email')).trim() ? ['Email: ' + String(data.get('email')).trim()] : []),
      ...(String(data.get('phone')).trim() ? ['Phone: ' + String(data.get('phone')).trim()] : []),
      'Interested in: ' + (car ? car.year + ' ' + car.name + ' (' + car.trim + ')' : data.get('vehicle')),
      '',
      String(data.get('message')).trim()
    ].join('\n');
    document.querySelector('#enquiry-preview').textContent = enquiry;
    document.querySelector('#copy-status').textContent = '';
    document.querySelector('#copy-enquiry').textContent = 'Copy enquiry';
    document.querySelector('#copy-enquiry').hidden = !!car;
    photoEnquiry?.setVehicle(car, enquiry);
    photoAction.hidden = !car || !whatsappEnabled;

    if (whatsappEnabled) {
      let link = document.querySelector('#whatsapp-enquiry');
      if (!link) {
        link = document.createElement('a');
        link.id = 'whatsapp-enquiry';
        link.className = 'button button-dark';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Open WhatsApp chat ↗';
        document.querySelector('.result-actions').prepend(link);
      }
      link.href = 'https://wa.me/' + number + '?text=' + encodeURIComponent(enquiry);
      link.hidden = !!car;
      document.querySelector('#result-description').textContent = car
        ? 'Take your chosen car photo with you. Share it to the WhatsApp app, or copy it to paste into WhatsApp Web.'
        : 'Check the details below, then open WhatsApp to send your message.';
    }
    form.hidden = true;
    document.querySelector('.form-heading').hidden = true;
    result.hidden = false;
    result.focus();
  });

  form.addEventListener('input', event => {
    event.target.setCustomValidity?.('');
  });
  document.querySelector('#edit-enquiry').addEventListener('click', () => {
    photoEnquiry?.setVehicle(null);
    result.hidden = true;
    form.hidden = false;
    document.querySelector('.form-heading').hidden = false;
    document.querySelector('#message').focus();
  });
  document.querySelector('#copy-enquiry').addEventListener('click', async () => {
    const status = document.querySelector('#copy-status');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(enquiry);
      document.querySelector('#copy-enquiry').textContent = 'Copied ✓';
      status.textContent = 'Enquiry copied. No message has been sent.';
    } catch (_) {
      // Local file mode and browser privacy settings may block clipboard access.
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(document.querySelector('#enquiry-preview'));
      selection.removeAllRanges();
      selection.addRange(range);
      status.textContent = 'The enquiry is selected. Press Ctrl+C (or Command+C) to copy it.';
    }
  });
})();
