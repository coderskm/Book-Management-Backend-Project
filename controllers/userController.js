const userModel = require("../models/userModel");
const jwt = require("jsonwebtoken");

const isValid = function (value) {
  if (typeof value === "undefined" || value === null) return false;
  if (typeof value === "string" && value.trim().length === 0) return false;
  if (typeof value === "number" && value.toString().trim().length === 0) return false;
  return true;
};

const isValidBody = function (body) {
  return Object.keys(body).length > 0;
};

const isValidTitle = function (title) {
  return ["Mr", "Mrs", "Miss"].indexOf(title) != -1;
};

// create user api
const createUser = async (req, res) => {
  try {
    let getUserData = req.body;
    if (!isValidBody(getUserData)) {
      return res.status(400).send({ status: false, message: "Please Enter Data To Create User" });
    }

    let { title, name, phone, email, password, address } = getUserData;

    if (!(isValidTitle(title) && isValid(title))) {
      return res.status(400).send({
        status: false,
        message: "valid title is required. It should be 'Mr', 'Mrs' or 'Miss'",
      });
    }
    let nameRegex = /^[a-zA-Z ]{5,30}$/;
    if (!(isValid(name) && name.match(nameRegex)))
      return res.status(400).send({
        status: false,
        message: "valid name is required. It should contain only alphabets",
      });

    let usedPhone = await userModel.findOne({ phone });
    if (usedPhone) {
      return res.status(400).send({
        status: false,
        message: " Phone is already in use. Please try another",
      });
    }

    const phoneRegex = /^[6-9]\d{9}$/gi;

    if (!(isValid(phone) && phoneRegex.test(phone)))
      return res.status(400).send({
        status: false,
        message: "Valid Phone number required. It should contain 10 digits",
      });
    let usedEmail = await userModel.findOne({ email });
    if (usedEmail) {
      return res.status(400).send({
        status: false,
        message: "email already in use. Please try another",
      });
    }

    let emailRegex = /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/;

    if (!(isValid(email) && emailRegex.test(email))) {
      return res.status(400).send({
        status: false,
        message: "Valid email is required.Email field cannot be empty.",
      });
    }

    const passwordRegex = /^[a-zA-Z0-9!@#$%^&*]{8,15}$/;

    if (!(isValid(password) && password.match(passwordRegex))) {
      return res.status(400).send({
        status: false,
        message: "password is required of length between 8 or 15 characters. Password field cannot be empty.",
      });
    }
    let streetRegex = /^([a-zA-Z0-9 ]{2,50})*$/;

    if (!streetRegex.test(address.street)) {
      return res.status(400).send({
        status: false,
        message: "Enter valid street name.Street name should contain alphabet and numbers.",
      });
    }
    let cityRegex = /^[a-zA-z]+([\s][a-zA-Z]+)*$/;
    if (!cityRegex.test(address.city)) {
      return res.status(400).send({
        status: false,
        message: "city name should be valid. Its should contain only alphabets",
      });
    }
    let pinRegex = /^\d{6}$/;
    if (!pinRegex.test(address.pincode)) {
      return res.status(400).send({
        status: false,
        message: "Pincode should have only 6 digits. No alphabets.",
      });
    }

    if (!(address && typeof address === "object" && Object.keys(address).length == 3)) {
      return res.status(400).send({
        status: false,
        message: "Valid address required. It should contain :- street name , city name and pincode",
      });
    }

    let savedData = await userModel.create(getUserData);
    res.status(201).send({
      status: true,
      message: "User Created Successfully",
      data: savedData,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({ status: false, message: error.message });
  }
};

// login user api
const loginUser = async (req, res) => {
  try {
    let emailRegex = /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/;
    const loginData = req.body;
    if (!isValidBody(loginData)) {
      return res.status(400).send({ status: false, message: "Please provide email and password" });
    }

    let { email, password } = loginData;
    if (!(isValid(email) && email.match(emailRegex))) {
      return res.status(400).send({
        status: false,
        message: "Valid email is required.Email field cannot be empty.",
      });
    }
    const passwordRegex = /^[a-zA-Z0-9!@#$%^&*]{8,15}$/;

    if (!(isValid(password) && password.match(passwordRegex))) {
      return res.status(400).send({
        status: false,
        message: "password is required of length between 8 or 15 characters. Password field cannot be empty.",
      });
    }
    const userDetail = await userModel.findOne({
      email: email,
      password: password,
    });
    if (!userDetail) {
      return res.status(400).send({
        status: false,
        message: "invalid login data. Please try another",
      });
    }

    let token = jwt.sign(
      {
        userId: userDetail._id.toString(),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_LIFETIME,
      }
    );

    res.setHeader("x-api-key", token);
    return res.status(200).send({
      status: true,
      message: "Success",
      data: token,
    });
  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
  }
};

module.exports.loginUser = loginUser;
module.exports.createUser = createUser;
