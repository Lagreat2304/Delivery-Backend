const express = require("express");
const cors = require("cors");
const body = require("body-parser");
const app = express();
const sql = require("mssql");

require('dotenv').config();
var config = {
    user: process.env.USER,
    password: process.env.PASSWORD,
    server: process.env.SERVER,
    database: process.env.DATABASE,
    options: {
      trustedconnection: false,
      enableArithAbort: true,
      trustServerCertificate: true,
      instancename: process.env.INSTANCE,
    },
    port: parseInt(process.env.PORT,10)
};

app.use(cors());
app.use(body.json());
app.use(express.json());
app.use(express.urlencoded());
const port = 5000;

app.post('/login', async (req, res) => {
  const { email, password, type } = req.body;
  try {
    await sql.connect(config);
    const result = await sql.query`SELECT * FROM employee WHERE email = ${email} AND password = ${password} AND type = ${type}`;
    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.status(200).json({ message: 'Login successful',usertype : type });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'An error occurred while logging in' });
  } finally {
    await sql.close();
  }
});

app.get('/products', async (req, res) => {
  try {
    await sql.connect(config);
    const result = await sql.query`SELECT Product_ID, Product_Name, Seller, Price, Quantity FROM Inventory`;
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).json({ error: 'An error occurred while fetching products' });
  } finally {
    sql.close();
  }
});

app.post('/addproducts', async (req, res) => {
  const {Product_Id, Product_Name, Seller, Price, Quantity } = req.body;
  try {
    await sql.connect(config);
    await sql.query`INSERT INTO Inventory (Product_Id, Product_Name, Seller, Price, Quantity) VALUES (${Product_Id},${Product_Name}, ${Seller}, ${Price}, ${Quantity})`;
    res.status(201).json({ message: 'Product added successfully' });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: 'An error occurred while adding the product' });
  } finally {
    sql.close();
  }
});

app.post('/signup', async (req, res) => {
  const { email, name, password, phone, type } = req.body;
  try {
    await sql.connect(config);
    const result = await sql.query`INSERT INTO employee (email, name, password, phone, type) VALUES (${email}, ${name}, ${password}, ${phone}, ${type})`;
    console.log('User signed up successfully');
    res.status(200).json({ message: 'Signup successful' });
  } catch (error) {
    console.error('Error signing up: ', error);
    res.status(500).json({ error: 'An error occurred while signing up' });
  } finally {
    await sql.close();
  }
});

app.listen(port, () => console.log("Listening"));