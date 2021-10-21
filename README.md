# Only SQL: Empower data analysts end-to-end with Flink SQL

This demo is used by Martijn Visser in his [Flink Forward talk 'Only SQL: Empower data analysts end-to-end with Flink SQL'](https://www.flink-forward.org/global-2021/conference-program#only-sql--empower-data-analysts-end-to-end-with-flink-sql)

[![Twitter Follow](https://img.shields.io/twitter/follow/MartijnVisser82?style=social&logo=twitter)](https://twitter.com/MartijnVisser82) [![GitHub Follow](https://img.shields.io/github/followers/MartijnVisser?style=social&logo=github)](https://github.com/MartijnVisser)

## Docker

We'll use Docker Compose to start all necessary services to run the demos. It will start the following services:

* Apache Flink 1.13.2, accessible via http://localhost:8081
* Apache Flink SQL Client 1.13.2
* Apache Kafka (including Zookeeper) 6.2.0, accessible via broker:29092
* Confluent Schema Registry 6.2.0, accessible via http://localhost:8091 (or http://schema-registry:8091 via Docker networking) 
* Confluent REST Proxy 6.2.0, accessible via http://localhost:8082
* Elasticsearch 7.15.0, accessible via http://localhost:9200 (or http://elasticsearch:9200 via Docker networking)
* http-server: a simple static HTTP server, accessible via http://localhost:8080

![Demo only-sql-overview](only-sql-overview.png "Demo overview")

## Starting the demo

```bash
# Start all services
docker-compose up -d

# Check if all the services are running
docker-compose ps

# Start the http-server
docker run -it --rm -p 8080:8080 -v $(pwd)/content:/public danjellz/http-server

# Star the Flink SQL Client
docker exec -it `docker ps -q --filter "ancestor=ftisiot/flink_sql_cli:1.13.2"` "./sql-client.sh"
```

## Explore all website behaviour

Any visit to one of the webpages is sent to the Kafka topic `pageview`. In order to explore them, we first need to register this Kafka topic as a table. 

```sql
--Create table pageviews:
CREATE TABLE pageviews (
    `title` STRING,
    `url` STRING,
    `datetime` STRING,
    `cookies` STRING,
    `browser` STRING,
    `screensize` STRING,
    `ts` TIMESTAMP(3) METADATA FROM 'timestamp',
    WATERMARK FOR `ts` AS `ts` 
) WITH (
    'connector' = 'kafka',
    'topic' = 'pageview',
    'properties.bootstrap.servers' = 'broker:29092',
    'value.format' = 'avro-confluent',
    'value.avro-confluent.schema-registry.url' = 'http://schema-registry:8091'
);
```

Any cookie that belongs to the domain `localhostd` (which is where our website runs), is also sent to the topic. We are specifically interested in a cookie called `identifier`. We're going to register a view, which returns this value by applying a regular expressing on the incoming data. 

```sql
--Create view which already extracts the identifier from the cookies
CREATE TEMPORARY VIEW web_activities AS 
    SELECT 
        `title`,
        `url`,
        `datetime`,
        `cookies`,
         REGEXP_EXTRACT(cookies, '(^| )identifier=([^;]+)', 2) as `identifier`,
        `browser`,
        `screensize`,
        `ts`
    FROM pageviews;
```

By now running queries on the view while visiting a webpage, you will see data appearing in the Flink SQL Client.

```sql 
SELECT * from web_activities;
```

![Flink SQL Client Results](only-sql-results-01.png "Flink SQL Client Results")

In this example, we're interested in users who visit our homepage more than 3 times in 10 seconds. In order to achieve that, 
we're first going to select all identifiers (which contains the value of the cookie `identifier`) who are visiting the url that 
matches with `http://localhost:8080`. We're expanding our selection with the `TUMBLE` function which creates fixed windows of 
10 seconds. Last but not least, we're using the `HAVING` function to make sure that only the identifiers that are occurring more 
than 3 times are being selected. The end result looks like this:

```sql 
--Get the users who visit the homepage more than 3 times in 10 seconds
SELECT  
    `identifier`,
    CONCAT('You Have Seen The Homepage ', CAST(COUNT(*) as VARCHAR), ' Times')  
FROM web_activities
WHERE `url` = 'http://localhost:8080/' OR `url` = 'http://127.0.0.1:8080/'
GROUP BY 
    TUMBLE(ts, INTERVAL '10' SECONDS), identifier
HAVING COUNT(*) > 3;
```

We've just created the list of `identifier` that meet our requirement of visiting the homepage more than 3 times in 10 seconds.
We now want to act on this data. In order to achieve that, we're going to send the list of `identifer` to our Elasticsearch sink. 
Our website checks if there's any result in the Elasticsearch results and if so, it will display the notification. 

To send the data to Elasticsearch, we first have to create another table like we've done before. We use the following DDL:

```sql
--Create a sink to display a notification
CREATE TABLE notifications (
    `identifier` STRING NOT NULL,
    `notification_id` STRING,
    `notification_text` STRING,
    `notification_link` STRING,
    PRIMARY KEY (identifier) NOT ENFORCED
) WITH (
    'connector' = 'elasticsearch-7',
    'hosts' = 'http://elasticsearch:9200',
    'index' = 'notifications'
);
```

When that table is created, we'll re-use the previous SQL that returns the list of `identifier` and send those results to the 
previously created table. 

```sql
INSERT INTO notifications (`identifier`, `notification_id`, `notification_text`)
    SELECT  
    `identifier`,
    'MyFirstNotification',
    CONCAT('You Have Seen The Homepage ', CAST(COUNT(*) as VARCHAR), ' Times')
FROM web_activities
    WHERE `url` = 'http://localhost:8080/'
GROUP BY
    TUMBLE(ts, INTERVAL '10' SECONDS), identifier
HAVING COUNT(*) > 3;
```

> :warning: The default value of the cookie `identifier` is `anonymous`. No notifications will be displayed if the value is `anonymous`. 
>
> In order to change the value, you need to open the Developer Tools via either Cmd + Opt + J (on Mac) or Ctrl + Shift + J (on Windows)
> 
> In the opened console, you then need to type `document.cookie="identifier=YourIdentifier"` to change the value of the `identifier` cookie. 

If you've changed the value of your `identifier` cookie, and you refresh the page more than 3 times in 10 seconds, a notification will be displayed to you. 

![Displaying a personal notification](only-sql-results-02.png "Displaying a personal notification")

Another common use case in SQL is that you need join data from multiple sources. In the next example, we will display a notification
to a user of our website who is calling us. We're mocking that call by using the [simulate call](http://localhost:8080/simulate-call.html) 
link from the menu on our website. That page will send data to a separate topic which we'll use with our existing website behaviour data. 

The first thing that we'll do is create another table, so we can connect to the data. 

```sql
CREATE TABLE text_to_speech (
    `identifier` STRING,
    `results` STRING,
    `category` STRING,
    `ts` TIMESTAMP(3) METADATA FROM 'timestamp',
    WATERMARK FOR `ts` AS `ts`
) WITH (
    'connector' = 'kafka',
    'topic' = 'texttospeech',
    'properties.bootstrap.servers' = 'broker:29092',
    'value.format' = 'avro-confluent',
    'value.avro-confluent.schema-registry.url' = 'http://schema-registry:8091'
);
```

The following SQL statement will do a couple of things:

1. It will create a new notification by insert into our Elasticsearch sink, including a link to a page
2. For all identifiers that are making a call
3. While they have been active on the website 10 seconds prior to making the call
4. If their call is about how to contribute

The third step is using an interval join, which means that the join result is only there if the join condition and a time constraint is met.

```sql
INSERT INTO notifications (`identifier`, `notification_id`, `notification_text`, `notification_link`)
SELECT  
    t.identifier,
    'MySecondNotification',
    'Here is how you can contribute',
    '/contributing/how-to-contribute.html'
FROM text_to_speech t, web_activities w
WHERE t.identifier = w.identifier
AND w.ts BETWEEN t.ts - INTERVAL '10' SECONDS AND t.ts
AND t.category = 'how-to-contribute';
```

![Displaying a notification with link](only-sql-results-03.png "Displaying a personal notification on how to contribute")
