//This code is used to send all pageviews to the Confluent REST Proxy

const xhr = new XMLHttpRequest();
//Define the schema for schema registry, which is included in the payload
const value_schema = {"value_schema": "{\"type\": \"record\", \"name\": \"User\", \"fields\": [{\"name\": \"url\", \"type\": \"string\"}, {\"name\": \"cookies\", \"type\": \"string\"}, {\"name\": \"datetime\", \"type\": \"string\"}, {\"name\": \"title\", \"type\": \"string\"}, {\"name\": \"browser\", \"type\": \"string\"}, {\"name\": \"screensize\", \"type\": \"string\"}]}"};

//Create payload we want to track
//We want to track url, cookies, datetime, title of the page, the browser and the screensize of the browser
const payload = {
  value: {
    url: location.href,
    cookies: document.cookie,
    datetime: new Date(),
    title: document.title,
    browser: navigator.userAgent,
    screensize: `${screen.width}x${screen.height}`,
  }
};

//Combine schema and payload
const fullJson = Object.assign({}, value_schema, {records: [payload]});

//Make the call to the Confluent REST Proxy
xhr.open('POST', 'http://localhost:8082/topics/pageview');
xhr.setRequestHeader('Content-Type', 'application/vnd.kafka.avro.v2+json');
xhr.send(JSON.stringify(fullJson));