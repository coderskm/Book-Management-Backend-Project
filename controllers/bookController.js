const bookModel = require("../models/bookModel");
const reviewModel = require("../models/reviewModel");
const mongoose = require("mongoose");

const isValid = function (value) {
  if (typeof value === "undefined" || value === null) return false;
  if (typeof value === "string" && value.trim().length === 0) return false;
  if (typeof value === "number" && value.toString().trim().length === 0)
    return false;
  return true;
};

const isValidObjectId = function (ObjectId) {
  return mongoose.Types.ObjectId.isValid(ObjectId);
};

const isValidBody = function (body) {
  return Object.keys(body).length > 0;
};

const aws = require("aws-sdk");

aws.config.update({
  accessKeyId: "AKIAXBF7ACSKC22L6NXN",
  secretAccessKey: "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",
  region: "us-east-1",
});

let uploadFile = async (file) => {
  return new Promise(function (resolve, reject) {
    let s3 = new aws.S3({ apiVersion: "2006-03-01" });

    var uploadParams = {
      Bucket: "book-management-project",
      Key: "SKM/" + file.originalname,
      Body: file.buffer,
    };

    s3.upload(uploadParams, function (err, data) {
      if (err) {
        return reject({ error: err });
      }
      console.log(data);
      console.log(`File uploaded successfully. ${data.Location}`);
      return resolve(data.Location);
    });
  });
};

const createLink = async function (req, res) {
  try {
    let files = req.files;
    if (files && files.length > 0) {
      let uploadedFileURL = await uploadFile(files[0]);
      res.status(201).send({ status: true, data: uploadedFileURL });
    } else {
      res.status(400).send({ status: false, msg: "No file to write" });
    }
  } catch (e) {
    console.log("error is: ", e);
    res
      .status(500)
      .send({ status: false, msg: "Error in uploading file to s3" });
  }
};

const createBook = async function (req, res) {
  try {
    let bookData = req.body;
    if (!isValidBody(bookData)) {
      return res
        .status(400)
        .send({ status: false, message: "book details required" });
    }
    let { title, excerpt, userId, ISBN, category, subcategory, releasedAt } =
      bookData;

    let titleRegex = /^[a-zA-Z ]{5,30}$/;
    if (!isValid(title) && title.match(titleRegex)) {
      return res.status(400).send({
        status: false,
        message: "Valid title is required. It should contain alphabet only",
      });
    }
    let duplicateTitle = await bookModel.findOne({ title });
    if (duplicateTitle)
      return res.status(400).send({
        status: false,
        message: "Title is already in use. Please try another.",
      });
    if (!isValid(excerpt)) {
      return res
        .status(400)
        .send({ status: false, message: "excerpt is Required" });
    }
    if (!isValidObjectId(userId)) {
      return res
        .status(400)
        .send({ status: false, message: "Valid UserId is required." });
    }

    if (req.decodedToken.userId !== userId) {
      return res
        .status(403)
        .send({ status: false, message: "user not authorized to create book" });
    }
    let isbnRegex = /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/;

    let duplicateIsbn = await bookModel.findOne({ ISBN });
    if (duplicateIsbn)
      return res.status(400).send({
        status: false,
        message: "ISBN already in use. Please try another.",
      });

    if (!(isValid(ISBN) && isbnRegex.test(ISBN))) {
      return res.status(400).send({
        status: false,
        message:
          "Valid ISBN number required. It should be either 10 digit or 13 digit",
      });
    }
    if (!isValid(category)) {
      return res
        .status(400)
        .send({ status: false, message: "Valid category is Required" });
    }
    if (!isValid(subcategory)) {
      return res
        .status(400)
        .send({ status: false, message: "Valid subcategory is required" });
    }
    if (!isValid(releasedAt) && new Date()) {
      return res
        .status(400)
        .send({ status: false, message: "releasing date required" });
    }
    bookData.deletedAt = bookData.isDeleted === true ? Date() : "";

    let book = await bookModel.create(bookData);
    let bookCreated = await bookModel.findOne(book).select({ __v: 0 });
    res
      .status(201)
      .send({ status: true, message: "Success", data: bookCreated });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

const getBooks = async function (req, res) {
  try {
    let booksToGet = { isDeleted: false };
    let { userId, category, subcategory } = req.query;
    if (userId) {
      if (!(isValid(userId) && isValidObjectId(userId))) {
        return res
          .status(400)
          .send({ status: false, message: "valid userId is required." });
      }
      booksToGet.userId = userId;
    }
    if (category) {
      if (!isValid(category)) {
        return res.status(400).send({
          status: false,
          message: "valid category is required.",
        });
      }
      booksToGet.category = category;
    }
    if (subcategory) {
      if (!isValid(subcategory)) {
        return res.status(400).send({
          status: false,
          message: "valid subcategory is required.",
        });
      }
      booksToGet.subcategory = subcategory;
    }

    let getBooks = await bookModel
      .find(booksToGet)
      .select({
        _id: 1,
        title: 1,
        excerpt: 1,
        userId: 1,
        category: 1,
        reviews: 1,
        releasedAt: 1,
      })
      .sort({ title: 1 });

    if (getBooks.length == 0) {
      return res.status(404).send({
        status: false,
        message: "No books found with given filter",
      });
    }
    res
      .status(200)
      .send({ status: true, message: "Book list", data: getBooks });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

const getBookById = async function (req, res) {
  try {
    let bookId = req.params.bookId;
    if (!bookId) {
      return res
        .status(400)
        .send({ status: false, message: "please enter book Id" });
    }
    if (!isValidObjectId(bookId)) {
      return res.status(400).send({
        status: false,
        message: "bookId is not valid",
      });
    }
    const bookData = await bookModel.findOne({ _id: bookId, isDeleted: false });
    if (!bookData) {
      return res.status(404).send({ status: false, message: "book not found" });
    }
    const reviewsData = await reviewModel
      .find({ bookId: bookId, isDeleted: false })
      .select({
        _id: 1,
        bookId: 1,
        reviewedBy: 1,
        rating: 1,
        review: 1,
        releasedAt: 1,
      });
    let book = { ...bookData.toObject(), reviewsData };
    res.status(200).send({ status: true, message: "Books list", data: book });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

const updateBookById = async function (req, res) {
  try {
    let updateBookData = req.body;
    let BookId = req.params.bookId;

    if (!isValidBody(updateBookData)) {
      return res.status(400).send({
        status: false,
        message: "enter details to update book's information",
      });
    }

    if (!BookId) {
      return res
        .status(400)
        .send({ status: false, message: "bookId is required" });
    }
    if (!isValidObjectId(BookId)) {
      return res
        .status(400)
        .send({ status: false, message: "bookId not valid." });
    }

    checkBookId = await bookModel.findOne({ _id: BookId, isDeleted: false });
    if (!checkBookId) {
      return res.status(404).send({ status: false, message: "no book found" });
    }
    if (req.decodedToken.userId != checkBookId.userId) {
      return res
        .status(403)
        .send({
          status: false,
          message: "user not authorized to update book data",
        });
    }
    let { title, excerpt, releasedAt, ISBN } = updateBookData;

    let checkUniqueTitle = await bookModel.findOne({ title });
    if (checkUniqueTitle) {
      return res.status(400).send({
        status: false,
        message: "title entered already exists. Please enter new title",
      });
    }

    let checkUniqueISBN = await bookModel.findOne({ ISBN });
    if (checkUniqueISBN) {
      return res.status(400).send({
        status: false,
        message: "ISBN entered already exists. Please enter new ISBN",
      });
    }

    let bookData = {};
    if (title) {
      if (!isValid(title)) {
        return res
          .status(400)
          .send({ status: false, message: "Title is not valid" });
      }
      bookData.title = title;
    }

    if (excerpt) {
      if (!isValid(excerpt)) {
        return res
          .status(400)
          .send({ status: false, message: "excerpt is not valid" });
      }
      bookData.excerpt = excerpt;
    }

    if (releasedAt) {
      if (!isValid(releasedAt)) {
        return res
          .status(400)
          .send({ status: false, message: "releasing date is not valid" });
      }
      bookData.releasedAt = releasedAt;
    }

    let isbnRegex = /^(?=(?:\D*\d){10}(?:(?:\D*\d){3})?$)[\d-]+$/;

    if (ISBN) {
      if (!(isValid(ISBN) && isbnRegex.test(ISBN))) {
        return res
          .status(400)
          .send({
            status: false,
            message: "ISBN is not valid. Please enter valid ISBN",
          });
      }
      bookData.ISBN = ISBN;
    }

    let updatedBook = await bookModel.findOneAndUpdate(
      { _id: BookId },
      bookData,
      { new: true }
    );

    res
      .status(200)
      .send({ status: true, message: "Success", data: updatedBook });
  } catch (err) {
    res.status(500).send({ status: false, message: err.message });
  }
};

const deleteBookById = async function (req, res) {
  try {
    let bookId = req.params.bookId;

    let checkBook = await bookModel.findOne({ _id: bookId, isDeleted: false });

    if (!checkBook) {
      return res
        .status(404)
        .send({ status: false, message: "book not found or already deleted" });
    }

    if (req.decodedToken.userId != checkBook.userId) {
      return res.status(403).send({
        status: false,
        message: "user not authorized to delete book",
      });
    }

    let updateBookDeleted = await bookModel.findOneAndUpdate(
      { _id: bookId },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    res
      .status(200)
      .send({
        status: true,
        message: "sucessfully deleted",
        data: updateBookDeleted,
      });
  } catch (error) {
    res.status(500).send({ status: false, error: error.message });
  }
};

module.exports.createLink = createLink;
module.exports.createBook = createBook;
module.exports.getBooks = getBooks;
module.exports.getBookById = getBookById;
module.exports.updateBookById = updateBookById;
module.exports.deleteBookById = deleteBookById;


