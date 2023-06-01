const express = require("express");

const router = express.Router();
const bookController = require("../controllers/bookController");
const userController = require("../controllers/userController");
const reviewController = require("../controllers/reviewController");
const middleware = require("../middleware/auth");


router.post("/register", userController.createUser);
router.post("/login", userController.loginUser);
router.post('/createLink', bookController.createLink);
router.post("/books", middleware.authentication, bookController.createBook);
router.get("/books", middleware.authentication, bookController.getBooks);
router.get("/books/:bookId", middleware.authentication, bookController.getBookById);
router.put("/books/:bookId", middleware.authentication, bookController.updateBookById);
router.delete("/books/:bookId", middleware.authentication, bookController.deleteBookById);
router.post("/books/:bookId/review", reviewController.createReview);
router.put("/books/:bookId/review/:reviewId", reviewController.updateReview);
router.delete("/books/:bookId/review/:reviewId", reviewController.deleteReview);

module.exports = router;
