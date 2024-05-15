
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const redis = require('redis');
const amqp = require('amqplib/callback_api');


const app = express();
app.use(bodyParser.json());

// MySQL bağlantısı 
const mysqlConnection = mysql.createConnection({
  host: 'localhost',
  user: 'username',
  password: 'password',
  database: 'database_name'
});


const redisClient = redis.createClient();


const rabbitUrl = 'amqp://localhost';
let channel;

amqp.connect(rabbitUrl, (error0, connection) => {
  if (error0) {
    throw error0;
  }
  connection.createChannel((error1, ch) => {
    if (error1) {
      throw error1;
    }
    channel = ch;
  });
});

// Kullanıcı kaydı
app.post('/register', (req, res) => {
  const { username, password, email } = req.body;

  mysqlConnection.query('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [username, password, email], (err, result) => {
    if (err) throw err;
    res.send('User registered successfully');
  });
});

// Kullanıcı girişi
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  redisClient.get(username, (err, reply) => {
    if (reply === password) {
      res.send('Login successful');
    } else {
      res.status(401).send('Invalid credentials');
    }
  });
});

// Ürünleri getir
app.get('/products', (req, res) => {

  mysqlConnection.query('SELECT * FROM products', (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

// Sipariş oluştur
app.post('/order', (req, res) => {
  const { userId, productId, quantity } = req.body;

  mysqlConnection.query('INSERT INTO orders (user_id, product_id, quantity) VALUES (?, ?, ?)', [userId, productId, quantity], (err, result) => {
    if (err) throw err;

    channel.sendToQueue('orders', Buffer.from(JSON.stringify({ userId, productId, quantity })));
    res.send('Order placed successfully');
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});



