
// Dependencies
const express = require("express");
const mongojs = require("mongojs");
// Require axios and cheerio. This makes the scraping possible
const axios = require("axios");
const cheerio = require("cheerio");

// Initialize Express
const app = express();

// Database configuration
const databaseUrl = "scraper";
const collections = ["scrapedData"];

// Hook mongojs configuration to the db variable
const db = mongojs(databaseUrl, collections);
db.on("error", (error)=> {
  console.log("Database Error:", error);
});

// Create a list of URLs to scrape
let urlList = [
  "https://shop.fender.com/en-US/electric-basses/jazz-bass/flea-signature-active-jazz-bass/0192602728.html",
  "https://shop.fender.com/en-US/electric-basses/precision-bass/duff-mckagan-deluxe-precision-bass/0146510306.html",
  "https://shop.fender.com/en-US/electric-basses/jazz-bass/road-worn-60s-jazz-bass/0131813300.html",
  "https://shop.fender.com/en-US/electric-basses/jaguar-bass/troy-sanders-jaguar-bass/0143110391.html",
  "https://shop.fender.com/en-US/electric-basses/mustang-bass/jmj-road-worn-mustang-bass/0144060390.html"
];

// Main route (simple Hello World Message)
app.get("/", (req, res) => {
  res.send("Hello world");
});

// Route 1
// =======
// This route will retrieve all of the data
// from the scrapedData collection as a json (this will be populated
// by the data you scrape using the next route)


app.get("/alldata", (req, res) => {
  // res.send(db.specs.find({}));
  db.specs.find({}, function(err,results) {
    if(err) {
      return console.log(err);
    }
    else {
      res.json(results); // res.send seems to do the same thing.
    }
  })
});


// Route 2
// =======
// When you visit this route, the server will
// scrape data from the site of your choice, and save it to
// MongoDB.
// TIP: Think back to how you pushed website data
// into an empty array in the last class. How do you
// push it into a MongoDB collection instead?

var stripSpecial = function(input) { // we'll need to remove special characters several times, so creating a function
  var output = input.replace(/®|™|©|\n/gi,"") // replace special characters with nothing. "gi" = replace all matches, case insensitive
  return output;
}

app.get("/scrape", (req, res) => { // localhost/scrape route

  var iterator = 0; // we'll use the iterator to decide when to send the browser response

  let fancyResponse = "Models Scraped:"; // start our response (we'll add to it with each scraped URL)

  urlList.forEach(function(url) { // loop through all the URLs to scrape

    axios.get(url).then(response => { // do the GET call

      const $ = cheerio.load(response.data); // use cheerio to capture the HTML from the GET so we can use it

      var model = $("h1.product-name").text(); // grab the model
      model = stripSpecial(model); // strip special characters
      console.log({model});

      const newEntry = { // start our new DB entry
        "model":model,
        "specs":{} // nested specs table will be added to as we loop through specs below
      }; 

      $("li.spec-attribute").each((i, element) => { // loop through each scraped spec

        const spec = stripSpecial($(element).children(".label").text()); // grab the spec name
        const value = stripSpecial($(element).children(".value").text()); // grab the spec value
        // console.log(spec, value)

        newEntry.specs[spec] = value; // push the new specs to the "specs" object nested in the "newEntry" object

      });

      db.specs.insert( // .insert() takes two arguments - 1st is whatever you want to input, 2nd is error checking
        newEntry,
        (err, inserted) => { // if you don't have error checking as your second argument, you get warnings
          if (err) {
            // Log the error if one is encountered during the query
            console.log(err);
          }
          else {
            // Otherwise, log the inserted data
            // console.log(inserted);
            console.log("Model Inserted: " + model);
            fancyResponse += "<br>"; // update our browser response
            fancyResponse += model; // update our browser response
            iterator = iterator + 1; // update our iterator
            console.log({iterator});
            if (iterator == urlList.length) { // if we've looped through the whole URL array
              res.send(fancyResponse); // then send our response
            }
          }
        }  
      ); // close db.specs.insert
    }); // close axios GET  
  }) // close forEach()
}); // close express watch for /scrape GET

/* -/-/-/-/-/-/-/-/-/-/-/-/- */

// Listen on port 3000
app.listen(3002, () => {
  console.log("App running on port 3002!");
});
