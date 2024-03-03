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
const port = process.env.PORT || 5000;

app.post('/login', async (req, res) => {
  const { email, password, type } = req.body;
  try {
    await sql.connect(config);
    const result = await sql.query`SELECT * FROM employee1 WHERE email = ${email} AND password = ${password} AND type = ${type}`;
    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.status(200).json({ message: 'Login successful',usertype : type });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'An error occurred while logging in' });
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
  }
});

app.post('/addproducts', async (req, res) => {
  const { Product_ID, Product_Name, Seller, Quantity } = req.body;
  const Price = parseInt(req.body.Price, 10);
  try {
    await sql.connect(config);
    const result = await sql.query`
      INSERT INTO Inventory (Product_Id, Product_Name, Seller, Price, Quantity)
      VALUES (${Product_ID}, ${Product_Name}, ${Seller}, ${Price}, ${Quantity})
    `;
    res.status(201).json({ message: 'Product added successfully' });
  } catch (err) {
    console.error('Error adding product:', err);
    res.status(500).json({ error: 'An error occurred while adding the product' });
  }
});

app.get('/cartProducts', async(req,res) => {
  try{
    await sql.connect(config);
    const result = await sql.query`select * from Cart order by Delivery_Date`;
    res.json(result.recordset);
  }
  catch(err){
    console.error(err);
  }
})

app.get('/getorders', async(req,res) => {
    try{
      await sql.connect(config);
      const response = await sql.query`select * from orders`;
      res.json(response.recordset);
    }
    catch(error){
      res.json(error);
    }
})

app.post('/makeorders', async (req, res) => {
  try {
    await sql.connect(config);
    const { Cart_ID, Product_Name, Seller, Quantity, Price, Delivery_Date, Actual_Delivery_Date, person, phone, status, remarks } = req.body;
    const PhoneNo = parseInt(phone,10);
    console.log(PhoneNo,phone);
    await sql.query`INSERT INTO orders (Cart_ID, Product_Name, Seller, Quantity, Price, Expected_Delivery_Date, Actual_Delivery_Date, Person, PhoneNo,  Status, Remarks) 
                    VALUES (${Cart_ID}, ${Product_Name}, ${Seller}, ${Quantity}, ${Price}, ${Delivery_Date}, ${Actual_Delivery_Date}, ${person}, ${PhoneNo}, ${status}, ${remarks})`;
    await sql.query`DELETE FROM cart WHERE Cart_ID = ${Cart_ID}`;
    res.status(200).send('Order added successfully');
  } catch (err) {
    console.error('Error adding order:', err);
    res.status(500).send('Error adding order');
  }
});

app.get('/getemployee',async (req,res) => {
  try{
    await sql.connect(config);
    const response = await sql.query`select * from employee1`;
    res.json(response.recordset);
  }
  catch(err){
    res.json(err);
  }
})

app.put('/delivery',async(req,res)=>{
  try{
    const { product, to, date } = req.body;
    const quantityToAdd = parseInt(req.body.quantityToAdd, 10);
    const Price = parseInt(req.body.product.Price,10); 
    const randomChar = String.fromCharCode(65 + Math.floor(Math.random() * 26)); 
    await sql.connect(config);
    const generateOrderIDQuery = `
      DECLARE @NewOrderID VARCHAR(9);
      EXEC GenerateOrderID @OrderID = @NewOrderID OUTPUT;
      SELECT @NewOrderID AS NewOrderID
    `;
    const generateOrderIDResult = await sql.query(generateOrderIDQuery);
    const newOrderID = generateOrderIDResult.recordset[0].NewOrderID;
    const modifiedOrderID = newOrderID.substring(0, 8) + randomChar + newOrderID.substring(9);
    const insertQuery = `
      INSERT INTO Cart (Cart_ID, Product_ID, Product_Name, Seller, Price, Quantity, [To], Delivery_Date)
      VALUES (@modifiedOrderID, @productID, @productName, @seller, @price, @quantity, @to, @DDate)
    `;
    const request = new sql.Request();
    await request
      .input('modifiedOrderID', sql.VarChar, modifiedOrderID)
      .input('productID', sql.VarChar, product.Product_ID)
      .input('productName', sql.VarChar, product.Product_Name)
      .input('seller', sql.VarChar, product.Seller)
      .input('price', sql.Int, Price)
      .input('quantity', sql.Int, quantityToAdd)
      .input('to', sql.VarChar, to)
      .input('DDate', sql.Date, date)
      .query(insertQuery);
    const result = await sql.query`update Inventory set Quantity = Quantity - ${quantityToAdd} where Product_Id = ${product.Product_ID}`;
    res.status(200).json({message : 'Successfully Updated'});
  }
  catch(error){
    console.error(error);
    res.status(500).json({error : 'Error'});
  }
})

app.get('/products/filter', async (req, res) => {
  try {
    await sql.connect(config);
    const request = new sql.Request();
    const { Product_ID, Product_Name, Seller } = req.query;
    let query = 'SELECT * FROM Inventory';
    const conditions = [];
    if (Product_ID) conditions.push(`Product_ID LIKE '%${Product_ID}%'`);
    if (Product_Name) conditions.push(`Product_Name LIKE '%${Product_Name}%'`);
    if (Seller) conditions.push(`Seller LIKE '%${Seller}%'`);
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error('Error filtering products:', err);
    res.status(500).send('An error occurred while filtering products');
  }
});

app.post('/addemployee', async (req, res) => {
  const { email, name, password, phone, type } = req.body;
  try {
    await sql.connect(config);
    const result = await sql.query`INSERT INTO employee1 (email, name, password, phone, type) VALUES (${email}, ${name}, ${password}, ${phone}, ${type})`;
    console.log('Employee added successfully');
    res.status(201).json({ message: 'Employee added successfully' });
  } catch (error) {
    console.error('Error adding employee: ', error);
    res.status(500).json({ error: 'An error occurred while adding the employee' });
  }
});

app.put('/products/:productId', async (req, res) => {
  const productId = req.params.productId;
  const { Price, Quantity } = req.body;
  console.log(Price,Quantity);
  try {
    await sql.connect(config);
    const result = await sql.query`
      UPDATE Inventory
      SET Price = ${Price}, Quantity = ${Quantity}
      WHERE Product_ID = ${productId}
    `;
    res.status(200).json({ message: 'Product updated successfully' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'An error occurred while updating the product' });
  }
});

app.get('/filteredorders', async (req, res) => {
  try {
    const { status } = req.query;
    console.log(status);
    let query = 'SELECT * FROM orders';
    const values = [];
    if (status) {
      query += ' WHERE Status = @status';
      values.push({ name: 'status', type: sql.NVarChar, value: status });
    }
    const request = new sql.Request();
    values.forEach(({ name, type, value }) => {
      request.input(name, type, value);
    });
    const response = await request.query(query);
    res.json(response.recordset);
  } catch (error) {
    console.error('Error fetching filtered orders:', error);
    res.status(500).json({ error: 'An error occurred while fetching filtered orders' });
  }
});


app.listen(port, () => console.log(`Listening at ${port}`));