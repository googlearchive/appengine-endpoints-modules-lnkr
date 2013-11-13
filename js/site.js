goog.provide('lnkr');

lnkr.ERR_INVALID_SHORTLINK_CHARACTERS = 1;
lnkr.ERR_INVALID_SHORTLINK_VALUE = 2;
lnkr.ERR_INVALID_SHORTLINK_LENGTH = 3;
lnkr.ERR_INVALID_TARGET_EMPTY = 4;
lnkr.ERR_INVALID_TARGET_URL = 5;

lnkr.DISALLOWED_CUSTOM_URLS = [
  'index.html',
  'js',
  'style',
  'about.html',
  'api.html',
  'stats.html',
  'data',
  'favicon',
  'robots'
];

/**
 * Provide a string format function.
 * The input string has numbered placeholders which are replaced with
 * corresponding parameters. For example '{0} abc'.format('xyz')
 * results in 'xyz abc'.
 *
 * @param {string[]} arguments - the parameters for the format string.
 * @returns {string} - a string with placeholders replaced.
 */
String.prototype.format = function() {
  var str = this.toString();

  for (var i = 0; i < arguments.length + 0; i++) {
    var reg = new RegExp('\\{' + i + '\\}', 'gm');
    str = str.replace(reg, arguments[i]);
  }

  return str;
};

/**
 * Represents a Short Link.
 *
 * @constructor
 * @params {string} shortlink - the short link.
 * @params {string} target - the target URL.
 * @params {number} createdDate - the timestamp.
 */
lnkr.ShortLink = function(shortlink, target, createdDate) {
  this.shortlink = shortlink;
  this.target = target;
  this.createdDate = createdDate;
};

/**
 * Create a ShortLink object from a comma-separated string.
 *
 * @param {string} str - a comma-separated string from ShortLink.toString()
 * @returns {object} a ShortLink object.
 */
lnkr.ShortLink.fromString = function(str) {
  var tokens = str.split(',');
  return new lnkr.ShortLink(tokens[0], tokens[1], tokens[2]);
};

/**
 * Create a string representation of a ShortLink  object.
 *
 * @returns {string} a string representing a ShortLink object. 
 */
lnkr.ShortLink.prototype.toString = function() {
  return this.shortlink + ',' + this.target + ',' + this.createdDate;
};



/***************************
 * Management of the user's browser's short links
 ***************************/

/**
 * Store the links a user has created in HTML LocalStorage. We could store the
 * object as JSON, but I'm using a string approach.
 * @param {Storage|Object} storage - The window.localStorage object or an
 *                                    object. Must have a setItem(key, val)
 *                                    method.
 * @param {string} shortlink - The short link to store.
 * @param {string} target - The target link to store.
 * @param {Date} createdDate - The date to store.
 */
lnkr.storeShortLinkLocally = function(storage, shortlink, target, createdDate) {
  var newItem = new lnkr.ShortLink(shortlink, target, createdDate);
  var currentItems = storage.getItem('shortlinks');
  if (currentItems) {
    var updArray = currentItems.split('|');
    updArray.push(newItem);
    currentItems = updArray.join('|');
  } else {
    currentItems = newItem.toString();
  }
  storage.setItem('shortlinks', currentItems);
}



/**
 * Retrieve the short links the user has created.
 * @param {Storage|Object} storage - The window.localStorage object or an
 *                                    object. Must have a setItem(key, val)
 *                                    method.
 * @returns {Array.<ShortLink>} - An array of ShortLink objects.
 */
lnkr.readLocalShortLinks = function(storage) {
  var currentItems = storage.getItem('shortlinks');
  var result = Array();
  if (currentItems) {
    var tokens = currentItems.split('|');
    for (var i = 0; i < tokens.length; i++) {
      result.push(lnkr.ShortLink.fromString(tokens[i]));
    }
    result.sort(function(a, b) {
      return a.createdDate - b.createdDate;
    });
  }
  return result;
}

/***************************
 * Form functions
 ***************************/

/**
 * Submit the form input by the user.
 * First validate input then invoke the API.
*/
lnkr.submitForm = function() {
  var targetElement = document.querySelector('#target-link');
  var shortLinkElement = document.querySelector('#short-link');
  var submitElement = document.querySelector('#submit-button');
  var target = targetElement.value;
  var shortlink = shortLinkElement.value;
  var isCustom = shortlink.length > 0;

  submitElement.innerHTML = 'Please wait ...';

  // Set the input elements to a sensible state
  lnkr.setInputState(shortLinkElement, 'valid');
  lnkr.setInputState(targetElement, 'required');
  submitElement.disabled = true;

  // Add http to the target link if required
  if (!(target.substring(0, 4) == 'http')) {
    target = 'http://' + target;
  }

  // Validate the input
  var errorList = lnkr.validateInput(target, shortlink);
  var hasErrors = errorList.length > 0;

  // Show any errors
  if (hasErrors) {
    var errorMessages = Array();
    for (var i = 0; i < errorList.length; i++) {
      switch (errorList[i]) {
        case lnkr.ERR_INVALID_TARGET_URL:
          errorMessages.push('Please provide a valid http or https URL to shorten.');
          lnkr.setInputState(targetElement, 'error');
          break;
        case lnkr.ERR_INVALID_TARGET_EMPTY:
          errorMessages.push('Please provide a URL to shorten');
          lnkr.setInputState(targetElement, 'error');
          break;
        case lnkr.ERR_INVALID_SHORTLINK_CHARACTERS:
          errorMessages.push('Only a-z, A-Z, 0-9 and - are accepted for custom short links.');
          lnkr.setInputState(shortLinkElement, 'error');
          break;
        case lnkr.ERR_INVALID_SHORTLINK_VALUE:
          errorMessages.push('You cannot use that short link, it is in use.');
          lnkr.setInputState(shortLinkElement, 'error');
          break;
        case lnkr.ERR_INVALID_SHORTLINK_LENGTH:
          errorMessages.push('Custom short links must be longer than 3 characters.');
          lnkr.setInputState(shortLinkElement, 'error');
          break;
      }
    }
    lnkr.statusMessage(errorMessages.join('<br />'), true);
  } else {
    // Now we can invoke the magic
    lnkr.setInputState(targetElement, 'valid');
    var inObj = {'target_link': target};
    if (isCustom && shortlink.length > 0) {
      inObj['short_link'] = shortlink;
    }

    // Invoke the API
    gapi.client.shortlink.create(inObj).execute(function(resp) {
      if (resp) {
        var fmt = '<a href="http://{0}/{1}" title="{1}" target="_blank">{0}/{1}</a>';
        var shortHost = window.location.host.replace('www.', '');
        var url = fmt.format(shortHost, resp.short_link);
        if (resp.status == 0) {
          lnkr.statusMessage('Shortlink ' + url + ' created.<br/><a href="https://plus.google.com/share?url=http://'+shortHost+'/'+resp.short_link+
                              '" onclick="javascript:window.open(this.href, \'\', '+
                              '\'menubar=no,toolbar=no,resizable=yes,scrollbars=yes,height=600,width=600\');'+
                              'return false;">Share on <img src="https://www.gstatic.com/images/icons/gplus-16.png" alt="Share on Google+"/></a>', false);
          if (window.localStorage) {
            lnkr.storeShortLinkLocally(window.localStorage, resp.short_link, resp.target_link, resp.created_date);

            var grid = document.querySelector('#user-links .grid');
            lnkr.addToGrid(grid, window.location.host.replace('www.', ''), new lnkr.ShortLink(resp.short_link, resp.target_link, resp.created_date));
            // Repaint the grid
            var rows = document.querySelectorAll('#user-links .grid-row');
            for (var i = 0; i < rows.length; i++) {
              rows[i].style.background = (i % 2 == 0) ? '#FFFFFF' : '#F0F0F0';
            }
          }
          lnkr.resetForm();
        } else {
          lnkr.statusMessage(resp.msg, true);
        }
      } else {
        lnkr.statusMessage('Error creating your shortlink.', true);
      }
    });
  }

  submitElement.disabled = false;
  submitElement.innerHTML = 'Make that link!';
}

/**
 * Check whether a given custom short link is allowed. Disallowed custom
 * short links are those that clash with existing files.
 *
 * @param {string} str - a proposed custom short link.
 * @returns {boolean} true if the custom short link is allowed, false if not.
 */
lnkr.checkAllowedCustomLinks = function(str) {
  for (var i = 0; i< lnkr.DISALLOWED_CUSTOM_URLS.length; i++) {
    var s = lnkr.DISALLOWED_CUSTOM_URLS[i];
    if (str.substring(0, s.length) == s) {
      return false;
    }
  }
  return true;
};

/**
 * Validate that the input is acceptable.
 *
 * @param {string} target The intended target URL.
 * @param {string} shortlink The intended short link.
 * @returns {Array} An array of error codes. May be an empty array, may not be null.
 */
lnkr.validateInput = function(target, shortlink) {
  var isCustom = shortlink.length > 0;
  var hasErrors = false;
  var errorList = Array();

  if (isCustom) {
    if (!(shortlink.match(/^[a-zA-Z0-9-]+$/))) {
      errorList.push(lnkr.ERR_INVALID_SHORTLINK_CHARACTERS);
    }
    else if (!lnkr.checkAllowedCustomLinks(shortlink)) {
      errorList.push(lnkr.ERR_INVALID_SHORTLINK_VALUE);
    }
    else if (shortlink.length < 3) {
      errorList.push(lnkr.ERR_INVALID_SHORTLINK_LENGTH);
    }
  }

  var s = target.replace('http://', '');
  if (target.length == 0 || s.length <= 1) {
    errorList.push(lnkr.ERR_INVALID_TARGET_EMPTY);
  } else {
    if (!(target.match(/^https?:\/\//))) {
      errorList.push(lnkr.ERR_INVALID_TARGET_URL);
    }
  }

  return errorList;
}

/**
 * Set the state of an input element.
 * @param {HTMLElement} elt - The element for which to set the state.
 * @param {string} state - The state to set: valid, error or required.
*/
lnkr.setInputState = function(elt, state) {
  elt.className = state;
}

/**
 * Handle the user hitting enter to submit the form.
 *
 * @param {object} event - an event.
 */
lnkr.formSubmitListener = function(event) {
  if (event.keyCode == 13) {
    lnkr.submitForm();
    event.preventDefault();
  }
};

/**
 * Generate a string indicating how long ago a given date is in conversational text.
 *
 * @param {number} dt - a Unix timestamp
 * @returns {string} a representation of the age of the timestamp, e.g. day(s) ago.
 */
lnkr.calcTimeDiff = function(dt) {
  var current = new Date().getTime() + (new Date().getTimezoneOffset()*1000);
  var diff = current - dt;

  var twoMins = 60*2*1000;
  var oneHour = 60*60*1000;
  var oneDay = oneHour*24;
  var oneMonth = oneDay*30;
  var oneYear = oneDay*365;

  if (diff > oneYear) {
    return 'year(s) ago';
  } else if (diff > oneMonth) {
    return 'month(s) ago';
  } else if (diff > oneDay) {
    return 'day(s) ago';
  } else if (diff > oneHour) {
    return 'hour(s) ago';
  } else if (diff > twoMins) {
    return 'minute(s) ago';
  } else {
    return 'now';
  }
}


/**
 * Startup hook - register key event listeners on input fields and show the locally stored short links.
 */
lnkr.setup = function() {
  document.querySelector('#target-link').addEventListener('keyup', lnkr.formSubmitListener);
  document.querySelector('#short-link').addEventListener('keyup', lnkr.formSubmitListener);
  lnkr.displayUserShortLinks();
};

/**
 * Display a status message.
 *
 * @param {string} msg - The message to show.
 * @param {boolean} isError - Whether or not the message indicates an error.
*/
lnkr.statusMessage = function(msg, isError) {
  var statusElement = document.querySelector('#status-message');
  statusElement.innerHTML = msg;
  statusElement.style.display = 'block';
  if (isError) {
    statusElement.className = 'error-message';
  } else {
    statusElement.className = 'info-message';
  }
};

/**
 * Reset the input form.
*/
lnkr.resetForm = function() {
  document.querySelector('#shorten-form').style.display = 'block';
  document.querySelector('#short-link').value = '';
  document.querySelector('#target-link').value = '';
  lnkr.setInputState(document.querySelector('#short-link'), 'valid');
  lnkr.setInputState(document.querySelector('#target-link'), 'required');
  document.querySelector('#submit-button').disabled = false;
  document.querySelector('#submit-button').innerHTML = 'Make that link!';
};

/***************************
 * Grid functions 
 ***************************/

/**
 * Generate the grid's header row.
 *
 * @param {boolean} hasRows - true if the grid has data rows or not.
 * @returns {HTMLElement} a div element for the header row.
 */
lnkr.getGridHeaderRow = function(hasRows) {
  var elt = document.createElement('div');
  if (hasRows) {
    elt.className = 'grid-row';
    var slElt = document.createElement('div');
    slElt.className = 'grid-header-cell';
    slElt.innerHTML = 'Short Link';
    slElt.style.width = '30%';
    var targetElt = document.createElement('div');
    targetElt.className = 'grid-header-cell';
    targetElt.innerHTML = 'Target URL';
    targetElt.style.width = '55%';
    var createdElt = document.createElement('div');
    createdElt.className = 'grid-header-cell';
    createdElt.innerHTML = 'Created';
    createdElt.style.width = '15%';
    elt.appendChild(slElt);
    elt.appendChild(targetElt);
    elt.appendChild(createdElt);
  } else {
    elt.className = 'grid-header-cell';
    elt.setAttribute('style', 'width: 100%');
    elt.innerHTML = 'No Short Links';
  }

  return elt;
};

/**
 * Display the short links for a user's browser.
 */
lnkr.displayUserShortLinks = function() {
  if (window.localStorage) {
    var links = lnkr.readLocalShortLinks(window.localStorage);
    var parentElt = document.querySelector('#user-links');

    var grid = document.createElement('div');
    grid.className = 'grid';
    var caption = document.createElement('div');
    caption.className = 'grid-caption';
    caption.innerHTML = 'Short Links created from this browser';

    grid.appendChild(caption);
    parentElt.appendChild(grid);

    if (links.length > 0) {
      var elt = lnkr.getGridHeaderRow(true);
      grid.appendChild(elt);

      for (var i = 0; i < links.length; i++) {
        lnkr.addToGrid(grid, window.location.host.replace('www.', ''), links[i]);
      }
    } else {
      var elt = lnkr.getGridHeaderRow(false);
      grid.appendChild(elt);
    }
  }
};

/**
 * Add a row to the grid.
 *
 * @param {HTMLElement} grid - the div element for the grid.
 * @param {string} host - the host that the grid is running on.
 * @param {ShortLink} link - the ShortLink object to add.
 */
lnkr.addToGrid = function(grid, host, link) {
  var row = document.createElement('div');
  row.className = 'grid-row';
  row.setAttribute('data-id', link.shortlink);
  var slElt = document.createElement('div');
  slElt.className = 'grid-cell';
  slElt.style.width = '30%';
  var targetElt = document.createElement('div');
  targetElt.className = 'grid-cell';
  targetElt.style.width = '55%';
  var createdElt = document.createElement('div');
  createdElt.className = 'grid-cell';
  createdElt.style.width = '15%';

  var a = document.createElement('a');
  a.href = 'http://' + host + '/' + link.shortlink;
  a.title = 'http://' + host + '/' + link.shortlink;
  a.target = '_blank';
  a.innerHTML = host + '/' + link.shortlink;
  slElt.appendChild(a);

  var a2 = document.createElement('a');
  a2.href = link.target;
  a2.title = link.target;
  a2.target = '_blank';
  a2.innerHTML = link.target;
  targetElt.appendChild(a2);

  createdElt.innerHTML = lnkr.calcTimeDiff(link.createdDate);

  row.appendChild(slElt);
  row.appendChild(targetElt);
  row.appendChild(createdElt);

  var rowCount = grid.childNodes.length;

  var sib = null;
  if (rowCount > 1) {
    var elt = lnkr.getGridHeaderRow(true);
    elt.style.opacity = 1;
    grid.replaceChild(elt, grid.childNodes[1]);
    sib = grid.childNodes[1];
    grid.insertBefore(row, sib.nextSibling);
  } else {
    grid.appendChild(row);
  }
  setTimeout( function() { row.style.opacity = 1 }, 100);
};

document.addEventListener('DOMContentLoaded', lnkr.setup);

