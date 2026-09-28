/* The cars are visible in the HTML. This file enhances those cards with
   filtering, sorting and an accessible native dialog. No API is required. */
(() => {
  'use strict';
  const allCards = [...document.querySelectorAll('[data-car]')];
  const dialog = document.querySelector('#vehicle-dialog');
  const grid = document.querySelector('#inventory-grid');
  const search = document.querySelector('#car-search');
  const sort = document.querySelector('#car-sort');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const photoEnquiry = window.MPILO_ENQUIRY_PHOTOS?.create(document.querySelector('#vehicle-photo-enquiry'));
  photoEnquiry?.bindAction(document.querySelector('#vehicle-enquiry'));
  const cars = new Map(allCards.map(card => [card, JSON.parse(card.dataset.car)]));
  const slots = new Map(allCards.map(card => [card, card.closest('.vehicle-slot') || card]));
  const currency = new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0
  });
  let category = 'All';
  let returnFocus = null;

  function openVehicle(card, trigger) {
    const car = cars.get(card);
    if (!car || !dialog) return;
    const image = document.querySelector('#vehicle-image');
    image.src = 'assets/' + car.image;
    image.alt = car.name + ' — illustrative photograph';
    document.querySelector('#vehicle-title').textContent = car.name;
    document.querySelector('#vehicle-category').textContent = car.make + ' / ' + car.label;
    document.querySelector('#vehicle-variant').textContent = car.trim + ' · ' + car.generation;
    const price = document.querySelector('#vehicle-price');
    const priceLabel = document.createElement('small');
    priceLabel.textContent = 'Sample price';
    price.replaceChildren(priceLabel, document.createTextNode(currency.format(car.price)));
    document.querySelector('#vehicle-description').textContent = car.description;
    const specs = document.querySelector('#vehicle-specs');
    specs.replaceChildren();
    for (const [label, value] of Object.entries({
      'Make': car.make,
      'Model': car.model,
      'Trim / variant': car.trim,
      'Generation': car.generation,
      'Model year': car.year,
      'Mileage': car.mileage + ' km',
      'Engine / motor': car.engine,
      'Transmission': car.transmission,
      'Fuel type': car.fuel,
      'Drivetrain': car.drivetrain,
      'Seats / doors': car.seats + ' seats · ' + car.doors + ' doors',
      'Exterior colour': car.colour
    })) {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = value;
      row.append(term, detail);
      specs.append(row);
    }
    const features = document.querySelector('#vehicle-features');
    features.replaceChildren(...car.features.map(feature => {
      const li = document.createElement('li');
      li.textContent = feature;
      return li;
    }));
    const credit = document.querySelector('#vehicle-photo-credit');
    credit.replaceChildren();
    credit.hidden = !car.credit;
    if (car.credit) {
      const author = document.createElement('a');
      author.href = car.credit.source;
      author.textContent = car.credit.author;
      const license = document.createElement('a');
      license.href = car.credit.licenseUrl;
      license.textContent = car.credit.license;
      [author, license].forEach(link => {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      });
      credit.append('Photograph: ', author, ' · ', license, '. Resized and converted to WebP.');
    }
    const enquiry = document.querySelector('#vehicle-enquiry');
    const config = window.MPILO_CONFIG || {};
    const message = 'Hello ' + (config.dealershipName || 'MPILO AUTO WORLD HUB LIMITED') + ', I’m interested in the ' + car.year + ' ' + car.name + ' (' + car.trim + '). Please confirm availability, price and specifications.';
    photoEnquiry?.setVehicle(car, message);
    enquiry.hidden = !/^[1-9]\d{7,14}$/.test(config.whatsappNumber || '');
    document.querySelector('#vehicle-contact-form').href = 'contact.html?vehicle=' + encodeURIComponent(car.name);
    returnFocus = trigger;
    dialog.showModal();
    document.body.classList.add('dialog-open');
    dialog.scrollTop = 0;
    dialog.querySelector('.dialog-close').focus();
  }

  allCards.forEach(card => {
    card.querySelectorAll('[data-open-car]').forEach(button => {
      button.addEventListener('click', () => openVehicle(card, button));
    });
  });
  dialog?.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (
      event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom
    )) dialog.close();
  });
  dialog?.addEventListener('close', () => {
    photoEnquiry?.setVehicle(null);
    document.body.classList.remove('dialog-open');
    returnFocus?.focus();
  });

  if (!grid) return;

  function updateCollection() {
    const normalise = value => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const terms = normalise(search.value.trim()).split(/\s+/).filter(Boolean);
    const ordered = [...allCards];
    if (sort.value === 'price-low') ordered.sort((a, b) => cars.get(a).price - cars.get(b).price);
    if (sort.value === 'price-high') ordered.sort((a, b) => cars.get(b).price - cars.get(a).price);
    if (sort.value === 'name') ordered.sort((a, b) => cars.get(a).name.localeCompare(cars.get(b).name));
    let count = 0;
    ordered.forEach(card => {
      const car = cars.get(card);
      const searchable = normalise([
        car.name, car.make, car.model, car.trim, car.generation, car.type,
        car.label, car.year, car.engine, car.fuel, car.transmission, car.drivetrain
      ].join(' '));
      const matches = (category === 'All' || car.type === category) &&
        terms.every(term => searchable.includes(term));
      card.hidden = !matches;
      slots.get(card).hidden = !matches;
      if (matches) {
        count++;
        card.classList.add('visible');
      }
      grid.append(slots.get(card));
    });
    filters.forEach(button => {
      const active = button.dataset.filter === category;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelector('#results-count').textContent = count + (count === 1 ? ' car to discover' : ' cars to discover');
    document.querySelector('#empty-state').hidden = count !== 0;
    return ordered.filter(card => !card.hidden).map(card => {
      const { id, name, type, price } = cars.get(card);
      return { id, name, bodyStyle: type, samplePriceNGN: price };
    });
  }

  filters.forEach(button => button.addEventListener('click', () => {
    category = button.dataset.filter;
    updateCollection();
  }));
  search.addEventListener('input', updateCollection);
  sort.addEventListener('change', updateCollection);
  document.querySelector('#reset-filters').addEventListener('click', () => {
    category = 'All';
    search.value = '';
    sort.value = 'featured';
    updateCollection();
    search.focus();
  });

  // Optional browser-native tool: uses exactly the same visible filter controls.
  const context = document.modelContext;
  if (context?.registerTool) {
    const lifecycle = new AbortController();
    window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
    try {
      Promise.resolve(context.registerTool({
        name: 'filter_vehicle_collection',
        title: 'Filter the sample vehicle collection',
        description: 'Set the visible collection filters and return matching sample cars. This does not submit an enquiry or purchase a car.',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', maxLength: 100 },
            bodyStyle: { type: 'string', enum: ['All', 'SUV', 'Sedan', 'Coupe', 'Pickup', 'Hatchback', 'Convertible'] },
            order: { type: 'string', enum: ['featured', 'price-low', 'price-high', 'name'] }
          },
          additionalProperties: false
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute(input) {
          if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected a filter object.');
          if (Object.keys(input).some(key => !['query', 'bodyStyle', 'order'].includes(key))) throw new Error('Unknown filter.');
          if ('query' in input && (typeof input.query !== 'string' || input.query.length > 100)) throw new Error('Query must be 100 characters or fewer.');
          if ('bodyStyle' in input && !['All', 'SUV', 'Sedan', 'Coupe', 'Pickup', 'Hatchback', 'Convertible'].includes(input.bodyStyle)) throw new Error('Invalid body style.');
          if ('order' in input && !['featured', 'price-low', 'price-high', 'name'].includes(input.order)) throw new Error('Invalid sort order.');
          search.value = input.query ?? '';
          category = input.bodyStyle ?? 'All';
          sort.value = input.order ?? 'featured';
          const results = updateCollection();
          return { count: results.length, cars: results };
        }
      }, { signal: lifecycle.signal })).catch(() => {});
    } catch (_) { /* Normal browsing remains available if the proposed API differs. */ }
  }
})();
