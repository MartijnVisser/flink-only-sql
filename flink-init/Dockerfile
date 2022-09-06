FROM flink:1.15.1-scala_2.12
RUN wget -P /opt/flink/lib https://repo.maven.apache.org/maven2/org/apache/flink/flink-sql-connector-kafka/1.15.1/flink-sql-connector-kafka-1.15.1.jar
RUN wget -P /opt/flink/lib https://repo.maven.apache.org/maven2/org/apache/flink/flink-sql-connector-elasticsearch7/1.15.1/flink-sql-connector-elasticsearch7-1.15.1.jar
RUN wget -P /opt/flink/lib https://repo.maven.apache.org/maven2/org/apache/flink/flink-sql-avro-confluent-registry/1.15.1/flink-sql-avro-confluent-registry-1.15.1.jar
RUN wget -P /opt/flink/lib https://repo.maven.apache.org/maven2/org/apache/flink/flink-connector-jdbc/1.15.1/flink-connector-jdbc-1.15.1.jar
RUN wget -P /opt/flink/lib https://repo.maven.apache.org/maven2/mysql/mysql-connector-java/8.0.30/mysql-connector-java-8.0.30.jar
RUN chown -R flink:flink /opt/flink/lib

