const express = require('express');
const router = express.Router();
const User = require("../models/User");
const { body, validationResult } = require('express-validator');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetchuser = require('../middlewares/fetchUser')
const nodemailer = require("nodemailer");
require('dotenv').config();

const jwt_secret = process.env.JWT_SECRET;
let OTP = null;



//ROUTE 1 : Creating a User using :POST /api/auth/create_user    without using authentication
router.post('/create_user', async (req, res) => {
    try {
        if (parseInt(req.body.oneTimePassword) != OTP) {
            return res.status(500).json({ "success": false, "error": "Invalid OTP" });
        };

        //generating salt to be added to our passed before hashing.... it returns a promise
        const salt = await bcryptjs.genSalt(10);

        //hashing our password using bcryptjs.hash() method and thus storing it in our database..... it returns a promise
        const securePassword = await bcryptjs.hash(req.body.password, salt);

        //Data for authToken that is to be sent as a response of successful authentication

        //User.create returns a promise and when resolved gives us the data..... here we are using the .then and .catch syntax to work with promise
        User.create({
            name: req.body.name,
            email: req.body.email,
            password: securePassword
        }).then((user) => {
            const { id } = user;
            const data = { user: { id } };
            //     //signing jwt with our secret stored in env file...... sign is not a async function thus there is no need to await the function 
            const jwt_sign_data = jwt.sign(data, jwt_secret);
            console.log(jwt_secret);
            console.log(jwt_sign_data);
            console.log(data.user.id);
            //     //sending web token as a response to the clients request and storing it in the clients req header

            res.status(200).json({ success: true, "authToken": jwt_sign_data });
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: "There are errors" });
        console.error(error.message);
    }


});

//ROUTE 2 : Authenticating a User using :POST /api/auth/login logging user with email and password after authenticating
router.post('/login', [body('email', 'Enter correct email').isEmail(),
body('password', 'password cannot be blank').notEmpty()], async (req, res) => {
    console.log(req.body);
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.json(errors);
        }
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, "error": "provide correct credentials" })
        }
        comparingPassword = await bcryptjs.compare(password, user.password);
        if (!comparingPassword) {
            return res.status(400).json({ success: false, "error": "provide correct credentials" });
        }
        const data = {
            user: {
                id: user.id
            }
        }
        const jwt_sign_data = jwt.sign(data, jwt_secret);
        // console.log(jwt_sign_data);
        // console.log(data.user.id);

        res.status(200).json({ success: true, "authToken": jwt_sign_data })

    } catch (error) {
        res.status(500).json({ success: false, error: "There are errors" })
    }


});

//ROUTE 3 : Fetching user details from the database
router.get('/getuser', fetchuser, async (req, res) => {
    try {
        const user_id = req.user_id;
        const user = await User.findById(user_id).select("-password");
        res.status(200).json(user);


    } catch (error) {
        res.status(500).json({ success, error: "Internal Server Error" });
        console.error(error.message);
    }
});

//Route 4 : Sending otp to email for verification
router.post("/emailVerify", [body("name").isLength({ min: 5 }), body("email", "email is not valid").isEmail(),
body("password", "Password Minimum Length should be 8").isLength({ min: 8 })], async (req, res) => {
    const { email } = req.body;
    console.log(email);
    try {

        const errors = validationResult(req);
        //if  our errors variable is not empty then we are sending a bad request
        if (!errors.isEmpty()) {
            console.log(errors);
            return res.status(400).json({ "success": false, "error": errors.errors[0].msg });
        }
        const user = await User.findOne({ email });
        if (user) {
            console.log(user);
            return res.status(500).json({ "success": false, "error": "User Already Exists" });
        }
        //generating otp if user does not exists already
        let otp = Math.floor(Math.random() * 899999 + 100000);
        OTP = otp;
        setTimeout(() => {
            otp = null;
            OTP = null;
        }, 1000 * 120)

        //setTimeout

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL,
                pass: process.env.PASS
            }
        });
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: "Notebook APP",
            html: `<h4>OTP for registeration</h4> </br><p>${otp}</p></br><h5>OTP is valid for 2 minutes</h5>`
        };
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.log(error)
                res.status(500).json({ "success": false, "error": "Error Sending Mail" })
            } else {
                console.log(info)
                res.status(200).json({ "success": true });
            }
        })
    } catch (error) {
        res.status(500).json({ "success": false });
    }
});


//Route 5 : forgot password email verification
router.post("/forgotVerify", [body("forgotEmail", "email is not valid").isEmail()], async (req, res) => {

    try {

        const errors = validationResult(req);
        //if  our errors variable is not empty then we are sending a bad request
        if (!errors.isEmpty()) {
            console.log(errors);
            return res.status(400).json({ "success": false, "error": errors.errors[0].msg });
        }
        const { forgotEmail } = req.body;
        console.log(forgotEmail);
        const user = await User.findOne({ email:forgotEmail });
        console.log(user);
        if (!user) {
            return res.status(404).json({"success":false,"error":"Email is not registered"})
        } 
        
        let otp = Math.floor(Math.random() * 899999 + 100000);
            OTP = otp;
            setTimeout(() => {
                otp = null;
                OTP = null;
            }, 1000 * 120)

            // //setTimeout

            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: process.env.EMAIL,
                    pass: process.env.PASS
                }
            });
            const mailOptions = {
                from: process.env.EMAIL,
                to: forgotEmail,
                subject: "Notebook APP",
                html: `<h4>OTP for verification</h4> </br><p>${otp}</p></br><h5>OTP is valid for 2 minutes</h5>`
            };
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log(error)
                    res.status(500).json({ "success": false, "error": "Error Sending Mail" })
                } else {
                    console.log(info)
                    res.status(200).json({ "success": true,"msg":"otp sent" });
                }
            });

    } catch (error) {
        res.status(500).json({ "success": false,"error":"Internal Server Error" });
    }
});

//Route 6 - OTP verification

router.post("/otpVerify",(req,res)=>{
    try {
        console.log(req.body);
        if (parseInt(req.body.oneTimePassword) != OTP) {
            return res.status(500).json({ "success": false, "error": "Invalid OTP" });
        }else{
            res.status(200).json({"success":true})
        }
    }catch(error){
        res.status(500).json({"success":false,"error":"Internal Server Error"})
    }
})


//Route 7 - Change Password

router.put("/changePassword",[body("password","Minimum Length should be 8").isLength({min:8})],async(req,res)=>{
    try{

        const errors = validationResult(req);
        if(!errors.isEmpty()){
            return res.status(500).json({"success":false,"error":errors.errors[0].msg})
        }
        const {email,password} = req.body;
        console.log(email);
        const salt = await bcryptjs.genSalt(10);
        const secretPassword = await bcryptjs.hash(password,salt);
        const user = await User.findOneAndUpdate(email,{$set:{password:secretPassword}},{new:true});
        console.log(user);
        res.status(200).json({"success":true});
    }catch(error){
        res.status(500).json({"success":false,"error":"Internal Server Error"});
    }
})


module.exports = router;