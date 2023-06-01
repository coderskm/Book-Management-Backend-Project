const reviewModel = require("../models/reviewModel");
const bookModel = require("../models/bookModel");
const mongoose = require("mongoose"); 

const isValid = function (value) {
  if (typeof value === "undefined" || value === null) return false;
  if (typeof value === "string" && value.trim().length === 0) return false;
  if (typeof value === "number") return false;
  return true;
};

const isValidBody = function (requestBody) {
  return Object.keys(requestBody).length > 0;
};

const isValidObjectId = function (objectId) {
  return mongoose.Types.ObjectId.isValid(objectId);
};

const createReview = async function (req, res) {
  try {
    let requestBody = req.body;

    let checkBookId = await bookModel.findOne({
      _id: req.params.bookId,
      isDeleted: false,
    });
    if (!checkBookId) {
      return res
        .status(404)
        .send({ status: false, message: "book does not exist" });
    }

    if (!isValidBody(requestBody)) {
     return res
        .status(400)  
        .send({
          status: false,
          message: "Please provide review details",
        });
      
    }

    if (!isValid(req.params.bookId)) {
     return res.status(400).send({ status: false, message: "bookId is required" });
    }

    if (!isValidObjectId(req.params.bookId)) {
      
      return res
        .status(400)
        .send({
          status: false,
          message: `${req.params.bookId} is not a valid book id`,
        });

    }

    if (
      typeof requestBody.rating === "undefined" ||
      requestBody.rating === null ||
      (typeof requestBody.rating === "string" &&
        requestBody.rating.trim().length === 0)
    ) {
      res.status(400).send({ status: false, message: " rating required" });
      return;
    }

    if (!(requestBody.rating >= 1 && requestBody.rating <= 5)) {
      res
        .status(400)
        .send({
          status: false,
          message: " rating should be in range of number 1 to 5",
        });
      return;
    }

    let bookDetail = await bookModel.findOneAndUpdate(
      { _id: req.params.bookId },
      { reviews: checkBookId.reviews + 1 },
      { new: true }
    );

    requestBody.reviewedAt = new Date();
    requestBody.bookId = req.params.bookId;
    requestBody.reviewedBy = requestBody.reviewedBy
      ? requestBody.reviewedBy
      : "Guest";

    let createdReview = await reviewModel.create(requestBody);

    const data = {
      _id: createdReview._id,
      bookId: createdReview.bookId,
      reviewedBy: createdReview.reviewedBy,
      reviewedAt: createdReview.reviewedAt,
      rating: createdReview.rating,
      review: createdReview.review,
    };
    res
      .status(201)
      .send({
        status: true,
        message: "review created sucessfully",
        data: { ...bookDetail.toObject(), review: data },
      });
  } catch (error) {
    res.status(500).send({ status: false, error: error.message });
  }
};

const updateReview = async function (req, res) {
  try {
    let bookId = req.params.bookId;
    let reviewId = req.params.reviewId;
    let requestBody = req.body;

    if (!isValidBody(requestBody)) {
      return res
        .status(400)
        .send({
          status: false,
          message: " Please provide review details to be updated.",
        });
    }

    if (!isValidObjectId(bookId)) {
      return res
        .status(400)
        .send({ status: false, message: `${bookId} is not a valid book id` });
    }

    if (!isValidObjectId(reviewId)) {
      return res
        .status(400)
        .send({
          status: false,
          message: `${reviewId} is not a valid review id`,
        });
    }

    let checkreviewId = await reviewModel.findOne({
      _id: reviewId,
      bookId: bookId,
      isDeleted: false,
    });
    if (!checkreviewId) {
      return res.status(404).send({
        status: false,
        message: "review with this bookid does not exist",
      });
    }

    let checkBookId = await bookModel.findOne({
      _id: bookId,
      isDeleted: false,
    }); 
    if (!checkBookId) {
      return res
        .status(404)
        .send({ status: false, message: "book does not exist in book model" });
    }

    let updateData = {};

    if (isValid(requestBody.review)) {
      updateData.review = requestBody.review;
    }

    if (isValid(requestBody.reviewedBy)) {
      updateData.reviewedBy = requestBody.reviewedBy;
    }

    if (
      requestBody.rating &&
      typeof requestBody.rating === "number" &&
      requestBody.rating >= 1 &&
      requestBody.rating <= 5
    ) {
      updateData.rating = requestBody.rating;
    }

    if (!(requestBody.rating >= 1 && requestBody.rating <= 5)) {
      return res
        .status(400)
        .send({ status: false, message: "rating should be in range 1 to 5 " });
    }


    const update = await reviewModel.findOneAndUpdate(
      { _id: reviewId },
      updateData,
      { new: true }
    );
    res
      .status(200)
      .send({
        status: true,
        message: "review updated sucessfully",
        data: update,
      });
  } catch (error) {
    res.status(500).send({ status: false, error: error.message });
  }
};



const deleteReview = async function (req, res) {
  try {
    let bookId = req.params.bookId;
    let reviewId = req.params.reviewId;

    if (!isValidObjectId(bookId)) {
      res
        .status(400)
        .send({ status: false, message: `${bookId} is not a valid book id` });
      return;
    }

    if (!isValidObjectId(reviewId)) {
      res
        .status(400)
        .send({
          status: false,
          message: `${reviewId} is not a valid review id`,
        });
      return;
    }

    let checkreviewId = await reviewModel.findOne({
      _id: reviewId,
      bookId: bookId,
      isDeleted: false,
    });
    if (!checkreviewId) {
      return res
        .status(404)
        .send({
          status: false,
          message: "review with this bookid does not exist",
        });
    }

    let checkBookId = await bookModel.findOne({
      _id: bookId,
      isDeleted: false,
    });
    if (!checkBookId) {
      return res
        .status(404)
        .send({ status: false, message: "book does not exist" });
    }

    let update = await reviewModel.findOneAndUpdate(
      { _id: reviewId },
      { isDeleted: true },
      { new: true }
    );
    await bookModel.findOneAndUpdate(
      { _id: bookId },
      { reviews: checkBookId.reviews - 1 },
      { new: true }
    );

    res
      .status(200)
      .send({ status: true, msg: "review sucessfully deleted", data: update });
  } catch (error) {
    res.status(500).send({ status: false, error: error.message });
  }
};


module.exports.createReview = createReview;
module.exports.updateReview = updateReview;
module.exports.deleteReview = deleteReview;
