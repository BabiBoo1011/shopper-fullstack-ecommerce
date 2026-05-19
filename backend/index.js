const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { error } = require("console");

app.use(express.json());
app.use(cors());

// Databse Connection with MongoDB
mongoose.connect("mongodb://dinhducbo2005:Manhboo1011!@ac-tckadte-shard-00-00.apuhods.mongodb.net:27017,ac-tckadte-shard-00-01.apuhods.mongodb.net:27017,ac-tckadte-shard-00-02.apuhods.mongodb.net:27017/?ssl=true&replicaSet=atlas-qyryy4-shard-0&authSource=admin&appName=E-commerce");

// API Creation

app.get("/", (req, res)=>{
    res.send("Express App is Running")
})

// Image Storgae Engine

const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

// Creating Upload Endpoint for images
app.use('/images', express.static('upload/images'))

app.post("/upload", upload.single('product'), (req, res)=>{
    res.json({
        success: 1,
        image_url: `http://localhost:${port}/images/${req.file.filename}`
    })
})

// Schema for Creating Products

const Product = mongoose.model("Product", {
    id: {
        type: Number,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    }, 
    category: {
        type: String,
        required: true,
    },
    new_price: {
        type: Number,
        required: true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    date: {
        type: Date,
        default: Date.now,
    },
    available: {
        type: Boolean,
        default: true,
    }
})

// API for Adding Product

app.post('/addproduct', async (req, res) => {
    let products = await Product.find({});
    let id;
    if (products.length > 0) {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id + 1;
    }
    else {
        id = 1;
    }
    const product = new Product({
        id: id,
        name: req.body.name,
        image: req.body.image,
        category: req.body.category,
        new_price: req.body.new_price,
        old_price: req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        success: true,
        name: req.body.name,
    })
})

// Creating API for Deleting Product

app.post('/removeproduct', async (req, res) => {
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success: true,
        name: req.body.name
    })
})

//Creating API for Getting All Products

app.get('/allproducts', async (req, res) => {
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})

// Schema Creating for User Model

const User = mongoose.model('User', {
    name: {
        type: String,
    },
    email: {
        type: String,
        unique: true,
    },
    password: {
        type: String,
    },
    cartData: {
        type: Object,
    },
    date: {
        type: Date,
        default: Date.now,
    }
})

// Creating Endpoint for Registration the User

app.post('/signup', async (req, res)=>{
    let check = await User.findOne({email:req.body.email});
    if (check) {
        return res.status(400).json({success:false, error:"existing user found with same email address"})
    };
    let cart = {};
    for (let i = 0; i < 300; i++) {
        cart[i] = 0;
    }
    const user = new User({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        cartData: cart,
    })

    await user.save();

    const data = {
        user: {
            id: user.id
        }
    }

    const token = jwt.sign(data, 'secret_ecom');
    res.json({success:true, token})
})

// Creating Endpoint for User Login 
app.post('/login', async (req, res)=>{
    let user = await User.findOne({email:req.body.email});
    if (user) {
        const passCompare = req.body.password === user.password;
        if (passCompare) {
            const data = {
                user: {
                    id: user.id,
                }
            }
            const token = jwt.sign(data, 'secret_ecom');
            res.json({success: true, token});
        }
        else {
            res.json({success: false, error:"Wrong Password"});
        }
    }
    else {
        res.json({success: false, error: "Wrong Email Address"})
    }
})

// Creating Endpoint for New Collection Data
app.get('/newcollection', async (req, res) => {
    try {
        let newcollection = await Product.find({}).sort({ date: -1 }).limit(8);
        
        console.log("New Collection Fetched");
        res.send(newcollection);
    } catch (err) {
        res.status(500).send("Server Error");
    }
});

//Creating Endpoint for Popular in Women Section
app.get('/popularinwomen', async(req, res)=>{
    let products = await Product.find({category:"women"});
    let popular_in_women = products.slice(0, 4);
    console.log("Popular in Women fetched");
    res.send(popular_in_women);
})

// Creating Middleware to Fetch User
    const fetchuser = async (req, res, next)=>{
        const token = req.header('auth-token');
        if (!token) {
            res.status(401).send({error:"Please authenticate using valid token!"});
        }
        else  {
            try {
                const data = jwt.verify(token, 'secret_ecom');
                req.user = data.user;
                next();
            } catch (error) {
                res.status(401).send({error:"Please authenticate using a valid token!"})
            }
        }
    }

// Creating Endpoint for Adding Products in Cartdata
app.post('/addtocart', fetchuser, async(req, res)=>{
    try {
        console.log("added", req.body.itemId);
        let userData = await User.findOne({_id:req.user.id});

        userData.cartData[req.body.itemId] += 1;
        
        await User.findOneAndUpdate({_id:req.user.id}, { $set: { cartData: userData.cartData } });
        res.send("Added");
    } catch (err) {
        res.status(500).send("Server Error");
    }
})

// Creating Endpoint to Remove Product from Cartdata
app.post('/removefromcart', fetchuser, async(req, res)=>{
    try {
        console.log("removed", req.body.itemId);
        let userData = await User.findOne({_id:req.user.id});
        if (userData.cartData[req.body.itemId] > 0) {
            userData.cartData[req.body.itemId] -= 1;
        }
        await User.findOneAndUpdate({_id:req.user.id}, { $set: { cartData: userData.cartData } });
        res.send("Removed");
    } catch (err) {
        res.status(500).send("Server Error");
    }
})

// Creating Endpoint to Get Cart (Đã sửa lỗi biến 'request')
app.post('/getcart', fetchuser, async(req, res)=>{
    try {
        console.log("GetCart Executed");
        let userData = await User.findOne({_id: req.user.id}); 
        res.json(userData.cartData);
    } catch (err) {
        res.status(500).send("Server Error");
    }
})

app.listen(port, (error)=>{
    if (!error) {
        console.log("Server Running on Port " + port)
    }
    else  {
        console.log("Error : " + error)
    }
})