import puppeteer from "puppeteer";
import axios from "axios";
import {wrapper} from "axios-cookiejar-support";
import {CookieJar} from "tough-cookie";
import qs from "qs";
import dotenv from "dotenv";

dotenv.config();

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();

// START: Log into the page
// Navigate to Letterboxd login page
await page.goto('https://letterboxd.com/sign-in/');

// Enter login credentials
await page.type('#field-username', process.env.USERNAME);
await page.type('#field-password', process.env.PASSWORD);

// Click login button
await page.keyboard.press('Enter');

// Wait for navigation after login
await page.waitForNavigation();

// END: Log into the page

// START: get favorite film ids

await page.goto(`https://letterboxd.com/${process.env.USERNAME}/likes/films/`);

// Extract favorite film IDs
const favoriteFilmIds = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('.film-poster')).map(el => el.getAttribute('data-film-id'));
});

const favoriteFilmIdsString = favoriteFilmIds.sort( () => .5 - Math.random()).slice(0, 4).map(id => `favouriteFilmIds=${id}`).join('&');

// END: get favorite film ids

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
    emailAddress: process.env.EMAIL,
    location: process.env.LOCATION,
    website: process.env.WEBSITE,
    bio: process.env.BIO,
    pronoun: process.env.PRONOUN,
    posterMode: 'All',
    commentPolicy: 'Anyone',
    privacyIncludeInPeopleSection: 'true',
    showAdultContent: process.env.FLAG_SHOW_ADULT_CONTENT,
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
