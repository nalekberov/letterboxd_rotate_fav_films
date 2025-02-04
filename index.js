const puppeteer = require('puppeteer');
const {Browser} = require("puppeteer");
const axios = require('axios');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');
const qs = require('qs');

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // START: Log into the page
  // Navigate to Letterboxd login page
  await page.goto('https://letterboxd.com/sign-in/');

  // Enter login credentials
  await page.type('#field-username', 'INSERT_USERNAME');
  await page.type('#field-password', 'INSERT_PASSWORD');

  // Click login button
  await page.keyboard.press('Enter');

  // Wait for navigation after login
  await page.waitForNavigation();

  // END: Log into the page

  // START: get favorite film ids

  await page.goto('https://letterboxd.com/{INSERT_USERNAME}/likes/films/');

  // Extract favorite film IDs
  const favoriteFilmIds = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.film-poster')).map(el => el.getAttribute('data-film-id'));
  });

  const favoriteFilmIdsString = favoriteFilmIds.sort( () => .5 - Math.random()).slice(0, 4).map(id => `favouriteFilmIds=${id}`).join('&');

  // This is where we are visiting profile edit page
  await page.goto('https://letterboxd.com/settings/');


  const csrfToken = await page.evaluate(() => {
    // Adjust the selector to match the location of the CSRF token in the page
    return document.querySelector('input[name="__csrf"]').value;
  });

  // get cookies from the page
  const cookies = await page.browser().cookies();

  const jar = new CookieJar();
  const client = wrapper(axios.create({jar}));

  for (const cookie of cookies) {
    await jar.setCookie(cookie.name + '=' + cookie.value, 'https://letterboxd.com/user/update.do')
  }

  try {
    const formData = {
      'MIME Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      __csrf: csrfToken,
      completeSettings: 'true',
      givenName: '',
      familyName : '',
      emailAddress: 'nurlan.alekberoff@gmail.com',
      location: 'Leipzig, Germany',
      website: 'https://nurlan.alakbarov.org',
      bio: 'My fav films are random liked ones rotated every night',
      pronoun: 'He',
      posterMode: 'All',
      commentPolicy: 'Anyone',
      privacyIncludeInPeopleSection: 'true',
      showAdultContent: 'true',
      password: ''
    }


    // Make a POST request with form data and cookies
    const response = await client.post('https://letterboxd.com/user/update.do', qs.stringify(formData) + '&' + favoriteFilmIdsString, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
      }
    });

    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error submitting form:', error);
  }

  // END: make request with form data

  await browser.close();
})();