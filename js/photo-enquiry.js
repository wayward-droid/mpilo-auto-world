/* A wa.me link can prefill text, but cannot attach a file. The primary
   selected-car action prepares a real photo before offering the chat link. */
(() => {
  'use strict';
  const vehicles = new Map((window.MPILO_VEHICLES || []).map(car => [car.id, car]));
  const files = new Map();
  const number = (window.MPILO_CONFIG || {}).whatsappNumber || '2349077509019';
  const displayNumber = number === '2349077509019' ? '+234 907 750 9019' : '+' + number;
  const fallbackHelp = 'Save this car photo first. Then open the WhatsApp chat and attach it before sending.';

  function loadPhoto(car) {
    if (!files.has(car.id)) {
      const pending = fetch(car.photo, { credentials: 'same-origin' })
        .then(response => {
          if (!response.ok) throw new Error('Photo unavailable');
          return response.blob();
        })
        .then(blob => {
          if (!blob.size || blob.type !== 'image/jpeg') throw new Error('Invalid photo');
          return new File([blob], car.filename, { type: 'image/jpeg' });
        })
        .catch(error => { files.delete(car.id); throw error; });
      files.set(car.id, pending);
    }
    return files.get(car.id);
  }

  // Clipboard implementations commonly support PNG. Prepare it before clicking.
  function clipboardPhoto(file) {
    return new Promise((resolve, reject) => {
      const photo = new Image();
      const url = URL.createObjectURL(file);
      photo.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Photo unavailable')); };
      photo.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = photo.naturalWidth;
          canvas.height = photo.naturalHeight;
          canvas.getContext('2d').drawImage(photo, 0, 0);
          canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Photo unavailable')), 'image/png');
        } catch (error) { reject(error); }
      };
      photo.src = url;
    });
  }

  function withPhotoCredit(message, car) {
    if (!car.credit) return message;
    return message + '\n\nIllustrative photo: ' + car.credit.author + ' / ' + car.credit.license +
      '\n' + car.credit.source + '\nLicense: ' + car.credit.licenseUrl +
      '\nResized, possibly cropped, and converted for sharing.';
  }

  function create(root) {
    if (!root) return { setVehicle() {}, bindAction() {} };
    const image = root.querySelector('[data-photo-image]');
    const name = root.querySelector('[data-photo-name]');
    const meta = root.querySelector('[data-photo-meta]');
    const help = root.querySelector('[data-photo-help]');
    const share = root.querySelector('[data-photo-share]');
    const copy = root.querySelector('[data-photo-copy]');
    const download = root.querySelector('[data-photo-download]');
    const next = root.querySelector('[data-photo-continue]');
    const credit = root.querySelector('[data-photo-credit]');
    const status = root.querySelector('[data-photo-status]');
    let current = null, message = '', readyFile = null, readyPNG = null;
    let revision = 0, primary = null, loading = false, busy = false;

    function updateAction() {
      share.disabled = busy || !readyFile;
      copy.disabled = busy || !readyPNG;
      if (!primary) return;
      primary.disabled = !current || busy || loading;
      const label = primary.querySelector('span') || primary;
      label.textContent = loading ? 'Preparing car photo…' : busy ? 'Please wait…' :
        readyFile ? 'Share photo & enquiry' : readyPNG ? 'Copy photo & continue' : 'Download photo & continue';
    }

    function showNext(label) {
      next.textContent = label;
      next.hidden = false;
      next.focus();
    }

    async function sharePhoto() {
      if (!current || !readyFile || busy) return;
      const version = revision;
      busy = true;
      next.hidden = true;
      status.textContent = '';
      updateAction();
      try {
        await navigator.share({
          files: [readyFile],
          title: current.year + ' ' + current.name + ' | MPILO',
          text: withPhotoCredit(message, current)
        });
        if (version !== revision) return;
        status.textContent = 'Check the photo and recipient in WhatsApp before sending. If you still need the enquiry text, open the MPILO chat below.';
        showNext('Open MPILO chat with enquiry text');
      } catch (error) {
        if (version !== revision) return;
        status.textContent = error.name === 'AbortError'
          ? 'Sharing was closed. Your photo and enquiry are still here.'
          : 'Photo sharing is unavailable here. Try Copy photo for WhatsApp Web, or download and attach the photo.';
      } finally {
        if (version === revision) { busy = false; updateAction(); }
      }
    }

    async function copyPhoto() {
      if (!current || !readyPNG || busy) return;
      const version = revision;
      busy = true;
      next.hidden = true;
      status.textContent = '';
      updateAction();
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': readyPNG })]);
        if (version !== revision) return;
        status.textContent = 'Photo copied. Open WhatsApp Web below, click the message box and press Ctrl+V (Command+V on Mac). Check that the photo appears, then send. Copying other content first will replace the photo.';
        showNext('2. Open WhatsApp and paste photo');
      } catch (_) {
        if (version !== revision) return;
        status.textContent = 'The browser could not copy the photo. Use Download photo, then attach the saved image in WhatsApp.';
      } finally {
        if (version === revision) { busy = false; updateAction(); }
      }
    }

    function bindAction(button) {
      if (!button || primary === button) return;
      primary = button;
      button.addEventListener('click', () => {
        if (!current || loading || busy) return;
        if (readyFile) return sharePhoto();
        if (readyPNG) return copyPhoto();
        download.click();
      });
      updateAction();
    }

    function setVehicle(requested, enquiry) {
      const version = ++revision;
      current = vehicles.get(requested?.id) || null;
      message = enquiry || '';
      readyFile = readyPNG = null;
      busy = loading = false;
      share.hidden = copy.hidden = next.hidden = true;
      next.removeAttribute('href');
      status.textContent = '';
      help.textContent = fallbackHelp;
      root.hidden = !current;
      updateAction();
      if (!current) {
        image.removeAttribute('src');
        image.alt = '';
        download.removeAttribute('href');
        return;
      }

      const car = current;
      image.src = 'assets/' + car.image;
      image.alt = car.name + ' — selected enquiry photograph';
      name.textContent = car.name;
      meta.textContent = car.year + ' · ' + car.trim;
      download.href = car.photo;
      download.download = car.filename;
      download.setAttribute('aria-label', 'Download photo of ' + car.year + ' ' + car.name);
      next.href = 'https://wa.me/' + number + '?text=' + encodeURIComponent(withPhotoCredit(message, car));
      credit.replaceChildren();
      credit.hidden = !car.credit;
      if (car.credit) {
        const source = document.createElement('a');
        source.href = car.credit.source;
        source.textContent = car.credit.author;
        const license = document.createElement('a');
        license.href = car.credit.licenseUrl;
        license.textContent = car.credit.license;
        [source, license].forEach(link => { link.target = '_blank'; link.rel = 'noopener noreferrer'; });
        credit.append('Photo: ', source, ' · ', license, '. Illustrative listing photo.');
      }

      const secure = window.isSecureContext && /^https?:$/.test(window.location.protocol);
      const canShare = secure && typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
      const canCopy = secure && typeof navigator.clipboard?.write === 'function' && typeof ClipboardItem === 'function';
      if (!canShare && !canCopy) return;
      loading = true;
      updateAction();
      loadPhoto(car).then(async file => {
        if (version !== revision) return;
        try { if (canShare && navigator.canShare({ files: [file] })) readyFile = file; } catch (_) { /* Use another photo method. */ }
        share.hidden = !readyFile;
        if (canCopy) {
          try {
            const png = await clipboardPhoto(file);
            if (version !== revision) return;
            readyPNG = png;
            copy.hidden = false;
          } catch (_) { /* Native sharing or downloading remains available. */ }
        }
        if (version !== revision) return;
        help.textContent = readyFile
          ? 'In the share menu, choose WhatsApp and MPILO (' + displayNumber + '). If MPILO is not listed, use Copy photo or Download photo to open the exact chat.'
          : readyPNG ? 'Copy this car photo first. Then open WhatsApp Web and paste it into the MPILO chat before sending.' : fallbackHelp;
      }).catch(() => {
        if (version === revision) status.textContent = 'Automatic photo preparation failed. Download the photo and attach it in WhatsApp.';
      }).finally(() => {
        if (version === revision) { loading = false; updateAction(); }
      });
    }

    share.addEventListener('click', sharePhoto);
    copy.addEventListener('click', copyPhoto);
    download.addEventListener('click', () => {
      if (!current) return;
      status.textContent = 'Download requested. Once the photo is saved, open the chat below. Use WhatsApp’s attachment button to add the saved car image, check it appears, then send.';
      showNext('2. Open WhatsApp and attach photo');
    });
    return { setVehicle, bindAction };
  }

  window.MPILO_ENQUIRY_PHOTOS = Object.freeze({ create });
})();
